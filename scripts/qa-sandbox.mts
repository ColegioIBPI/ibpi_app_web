/**
 * Área de sacrifício para o QA.
 *
 *   npm run qa:sandbox
 *   npm run qa:sandbox -- --apagar
 *
 * O QA testa **no banco de produção** — ambiente único, risco registrado no
 * README, seção 6.5. Algumas coisas não dá para testar sem gravar: cancelar
 * matrícula, emitir recibo, dar baixa, liberar boletim.
 *
 * Fazer isso num aluno real tem consequência fora do sistema: a família vê
 * a ocorrência, o recibo queima um número da sequência, a matrícula
 * cancelada some das listas. Então o QA faz tudo **aqui**.
 *
 * Cria:
 * - um aluno `QA-0001`, com responsável, parcelas e tudo o que uma ficha
 *   precisa para não parecer vazia;
 * - um talão de recibos `QA`, para a numeração ser queimada longe da série
 *   de verdade.
 *
 * Os ids começam com `QA-`, então são reconhecíveis em qualquer listagem e
 * o `--apagar` sabe o que levar.
 */
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";

const MATRICULA = "QA-0001";
const RESPONSAVEL = "QA-responsavel";
const SERIE = "QA";

const db = getAdminDb();
const apagando = process.argv.includes("--apagar");

await (apagando ? apagar() : criar());

async function criar() {
  const agora = new Date().toISOString();

  /**
   * A turma é uma real, de propósito.
   *
   * Sem turma, o aluno some das telas que filtram por turma — e aí o QA
   * não consegue testar justamente a chamada, o diário e a ata, que é
   * metade do sistema. Entrar numa turma real não altera a turma.
   */
  const turma = (await db.collection(COLECOES.turmas).limit(1).get()).docs[0];
  const dadosDaTurma = turma?.data() as
    | { codigo?: string; segmento?: string; turno?: string }
    | undefined;

  await db.collection(COLECOES.alunos).doc(MATRICULA).set({
    matricula: MATRICULA,
    nome: "QA Aluno de Testes",
    nomeParaBusca: "QA ALUNO DE TESTES",
    dataNascimento: "2010-03-15",
    dataMatricula: "2026-01-16",
    cpf: "00000000191",
    situacaoMatricula: "ativa",
    ativo: true,
    dataDaSituacao: null,
    turmaId: turma?.id ?? null,
    turmaCodigo: dadosDaTurma?.codigo ?? null,
    segmento: dadosDaTurma?.segmento ?? "medio",
    serie: "1",
    turno: dadosDaTurma?.turno ?? "manha",
    filiacao: { mae: "QA Mãe de Testes", pai: "QA Pai de Testes" },
    contato: {
      emails: ["qa.aluno@ibpi.com.br"],
      telefones: ["+5521900000000"],
      endereco: {
        logradouro: "Rua de Teste, 1",
        complemento: null,
        bairro: "Centro",
        cidade: "Rio de Janeiro",
        uf: "RJ",
        cep: "20000-000",
      },
    },
    documentos: {
      identidade: "000000000",
      orgaoEmissor: "DETRAN",
      ufEmissor: "RJ",
      codigoINEP: "000000000000",
      nacionalidade: "Brasileira",
      naturalidade: "Rio de Janeiro",
      ufNaturalidade: "RJ",
    },
    observacoes: "Aluno de testes do QA. Pode cancelar, concluir, transferir.",
    origem: "portal",
    atualizadoEm: agora,
  });

  await db.collection(COLECOES.responsaveis).doc(RESPONSAVEL).set({
    nome: "QA Responsável de Testes",
    parentesco: "Mãe",
    cpf: "00000000272",
    tipo: "ambos",
    email: "qa.responsavel@ibpi.com.br",
    telefone: "+5521900000001",
    alunosVinculados: [MATRICULA],
    ativo: true,
    origem: "portal",
    atualizadoEm: agora,
  });

  /**
   * Três parcelas em estados diferentes: uma vencida, uma a vencer e uma
   * paga. É o mínimo para o extrato, o relatório de inadimplentes, a ficha
   * financeira e a baixa por recibo terem o que mostrar.
   */
  const parcelas = [
    { id: `${MATRICULA}-1`, vencimento: "2026-03-10", pago: true },
    { id: `${MATRICULA}-2`, vencimento: "2026-09-10", pago: false },
    { id: `${MATRICULA}-3`, vencimento: "2026-12-10", pago: false },
  ];

  for (const [indice, parcela] of parcelas.entries()) {
    await db.collection(COLECOES.cobrancas).doc(parcela.id).set({
      matricula: MATRICULA,
      vencimento: parcela.vencimento,
      tipo: "mensalidade",
      parcela: indice + 1,
      totalDeParcelas: 3,
      valor: 1000,
      valorPago: parcela.pago ? 1000 : null,
      dataPagamento: parcela.pago ? parcela.vencimento : null,
      formaDePagamento: parcela.pago ? "pix" : null,
      confirmado: parcela.pago ? true : null,
      origem: "portal",
      atualizadoEm: agora,
    });
  }

  // Talão próprio: recibo tem numeração única, e queimar números da série
  // de verdade atrapalha a conferência de caixa do colégio.
  await db.collection(COLECOES.seriesDeRecibo).doc(SERIE).set({
    serie: SERIE,
    descricao: "Testes do QA — não usar para recibo de verdade",
    proximoNumero: 1,
    ativa: true,
    origem: "portal",
    atualizadoEm: agora,
  });

  console.log(`
  Sandbox do QA pronta.

  Aluno:        ${MATRICULA} — QA Aluno de Testes
  Turma:        ${dadosDaTurma?.codigo ?? "(nenhuma turma cadastrada)"}
  Responsável:  QA Responsável de Testes (vinculado)
  Parcelas:     3 (uma paga, uma vencida, uma a vencer)
  Talão:        série ${SERIE}, a partir do nº 1

  É neste aluno que o QA cancela matrícula, emite recibo, dá baixa e
  lança ocorrência. Nos reais, só leitura.

  Para remover:  npm run qa:sandbox -- --apagar
`);
}

async function apagar() {
  const db2 = getAdminDb();
  let removidos = 0;

  // Tudo o que o QA gerou no aluno sai junto: nota, frequência, ocorrência,
  // recibo da série QA. Deixar sobra é o que faz o próximo relatório sair
  // com um aluno que ninguém reconhece.
  const colecoes = [
    COLECOES.notas,
    COLECOES.frequenciaDiaria,
    COLECOES.ocorrencias,
    COLECOES.cobrancas,
    COLECOES.boletins,
    COLECOES.recibos,
    COLECOES.entregaDeDocumentos,
    COLECOES.planosDePagamento,
    COLECOES.anotacoesFinanceiras,
    COLECOES.credenciais,
    COLECOES.boletos,
  ];

  for (const colecao of colecoes) {
    for (const doc of (await db2.collection(colecao).get()).docs) {
      const dados = doc.data() as { matricula?: string; serie?: string };

      const ehDoQA =
        doc.id.startsWith(MATRICULA) ||
        dados.matricula === MATRICULA ||
        dados.serie === SERIE;

      if (ehDoQA) {
        await doc.ref.delete();
        console.log(`  apagado ${colecao}/${doc.id}`);
        removidos += 1;
      }
    }
  }

  for (const [colecao, id] of [
    [COLECOES.alunos, MATRICULA],
    [COLECOES.responsaveis, RESPONSAVEL],
    [COLECOES.seriesDeRecibo, SERIE],
  ] as const) {
    await db2.collection(colecao).doc(id).delete();
    console.log(`  apagado ${colecao}/${id}`);
    removidos += 1;
  }

  console.log(`\n  ${removidos} documento(s) removido(s).\n`);
}
