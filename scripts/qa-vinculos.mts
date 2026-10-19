/**
 * Monta os vínculos professor × turma × disciplina para o QA.
 *
 *   npm run qa:vinculos
 *   npm run qa:vinculos -- --apagar
 *
 * Sem alocação, metade do sistema abre vazia: o diário não tem o que
 * registrar, a pauta sai sem colunas, a ata de resultado final também, e o
 * boletim fica em branco. Com 4 alocações no banco, o QA passaria o teste
 * reportando vazio.
 *
 * ## O que é real aqui e o que é andaime
 *
 * **A grade é real.** As disciplinas usadas são as **11 que têm `ordem`**
 * no cadastro — a ordem é a posição no boletim do colégio, definida por
 * ele, e é justamente o conjunto que o boletim impresso mostra. As outras
 * 35 são grafias antigas do Access e disciplinas de curso técnico.
 *
 * **Os professores são andaime.** O banco tem dois, e o colégio não
 * informou quem leciona o quê. Os `qa-prof-*` existem só para a alocação
 * ter um nome, são reconhecíveis em qualquer listagem e saem no `--apagar`.
 *
 * > Quando o colégio informar o quadro de verdade, apague isto e monte em
 * > Configurações › Vínculos. **Não trate estes nomes como staffing real.**
 *
 * ## O professor de teste fica de fora da distribuição
 *
 * Ele recebe as 11 disciplinas nas **duas turmas que já eram dele**, e mais
 * nenhuma. Se levasse as dez, o teste de escopo do QA — "professor só
 * enxerga os alunos das turmas em que está alocado" — passaria a mostrar a
 * escola inteira, e deixaria de testar alguma coisa.
 *
 * O professor **real** já cadastrado não é tocado.
 */
import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES, type Disciplina, type Turma } from "@/core/modelo";

const ANO = 2026;
const PREFIXO = "qa-prof-";
const TESTE = "teste-professor";

/** As quatro frentes, só para espalhar as disciplinas entre nomes. */
const PROFESSORES = [
  { id: `${PREFIXO}linguagens`, nome: "QA Professor — Linguagens" },
  { id: `${PREFIXO}exatas`, nome: "QA Professor — Exatas" },
  { id: `${PREFIXO}humanas`, nome: "QA Professor — Humanas" },
  { id: `${PREFIXO}diversificada`, nome: "QA Professor — Diversificada" },
];

const POR_AREA: Record<string, string[]> = {
  [`${PREFIXO}linguagens`]: ["portugues-literatura", "oficina-de-textos"],
  [`${PREFIXO}exatas`]: ["matematica", "fisica", "quimica", "biologia"],
  [`${PREFIXO}humanas`]: ["geografia", "historia", "filosofia-sociologia"],
  [`${PREFIXO}diversificada`]: ["projeto-de-vida", "educacao-fisica"],
};

const db = getAdminDb();
const apagando = process.argv.includes("--apagar");

await (apagando ? apagar() : criar());

function idDaAlocacao(professorId: string, turmaId: string, disciplinaId: string) {
  return `${ANO}-${professorId}-${turmaId}-${disciplinaId}`;
}

async function criar() {
  const agora = new Date().toISOString();

  const turmas = (await db.collection(COLECOES.turmas).get()).docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Turma) }))
    .filter((turma) => turma.ativa !== false && turma.anoLetivo === ANO);

  const disciplinas = new Map(
    (await db.collection(COLECOES.disciplinas).get()).docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Disciplina) }))
      // `ordem` preenchida é o sinal de que a disciplina está no boletim.
      .filter((d) => d.ordem != null && d.ativa !== false)
      .map((d) => [d.id, d.nome]),
  );

  if (disciplinas.size === 0) {
    console.error("\n  Nenhuma disciplina com ordem. Nada a montar.\n");
    process.exit(1);
  }

  console.log(
    `\n  ${turmas.length} turma(s) × ${disciplinas.size} disciplina(s) do boletim.\n`,
  );

  // As turmas do professor de teste ficam com ele; o resto se distribui.
  const doTeste = new Set(["2026-EM2A", "2026-EM3A"]);

  /**
   * O que o colégio já montou de verdade não é duplicado.
   *
   * O professor real já tem Geografia em EF6A. Criar a mesma disciplina
   * ali com um professor de andaime faria a tela de Vínculos mostrar a
   * disciplina duas vezes, e quem olhasse acharia que há dois professores
   * para a mesma aula.
   */
  const jaMontadas = new Set(
    (await db.collection(COLECOES.alocacoes).get()).docs
      .map((doc) => doc.data() as { professorId?: string; turmaId?: string; disciplinaId?: string })
      .filter((a) => !a.professorId?.startsWith(PREFIXO))
      .map((a) => `${a.turmaId}|${a.disciplinaId}`),
  );

  for (const professor of PROFESSORES) {
    await db.collection(COLECOES.professores).doc(professor.id).set(
      {
        nome: professor.nome,
        nomeParaBusca: professor.nome.toUpperCase(),
        telefones: [],
        turmas: turmas
          .filter((t) => !doTeste.has(t.id))
          .map((t) => t.id),
        ativo: true,
        origem: "portal",
        observacoes:
          "Professor de andaime do QA. Não é quadro real — ver scripts/qa-vinculos.mts.",
        atualizadoEm: agora,
      },
      { merge: true },
    );
  }

  let criadas = 0;
  let pulados = 0;
  let lote = db.batch();
  let noLote = 0;

  for (const turma of turmas) {
    for (const [disciplinaId, disciplinaNome] of disciplinas) {
      if (jaMontadas.has(`${turma.id}|${disciplinaId}`)) {
        pulados += 1;
        continue;
      }

      const professor = doTeste.has(turma.id)
        ? { id: TESTE, nome: "Professor de Teste" }
        : donoDa(disciplinaId);

      if (!professor) continue;

      lote.set(
        db
          .collection(COLECOES.alocacoes)
          .doc(idDaAlocacao(professor.id, turma.id, disciplinaId)),
        {
          anoLetivo: ANO,
          professorId: professor.id,
          professorNome: professor.nome,
          turmaId: turma.id,
          turmaCodigo: turma.codigo,
          disciplinaId,
          disciplinaNome,
          ativa: true,
          origem: "portal",
        },
        { merge: true },
      );

      criadas += 1;
      noLote += 1;

      if (noLote >= 400) {
        await lote.commit();
        lote = db.batch();
        noLote = 0;
      }
    }

    console.log(
      `  ${String(turma.codigo).padEnd(12)} ${disciplinas.size} disciplina(s)` +
        (doTeste.has(turma.id) ? "  → Professor de Teste" : ""),
    );
  }

  if (noLote > 0) await lote.commit();

  console.log(`
  ${criadas} alocação(ões) gravada(s)${pulados > 0 ? `, ${pulados} pulada(s) por já existir` : ""}.

  As turmas EM2A e EM3A ficaram com o Professor de Teste — é ele que o QA
  usa, e o escopo dele precisa continuar estreito para o teste de
  permissão fazer sentido. As outras ${turmas.length - doTeste.size} foram
  para os professores de andaime.

  Isto NÃO é quadro de horário real. Quando o colégio informar quem
  leciona o quê, apague e monte em Configurações › Vínculos.

  Para remover:  npm run qa:vinculos -- --apagar
`);
}

function donoDa(disciplinaId: string) {
  for (const professor of PROFESSORES) {
    if (POR_AREA[professor.id]?.includes(disciplinaId)) return professor;
  }

  // Disciplina do boletim que não está em nenhuma frente: fica com
  // Diversificada em vez de sumir da grade.
  return PROFESSORES[3];
}

async function apagar() {
  let removidas = 0;

  for (const doc of (await db.collection(COLECOES.alocacoes).get()).docs) {
    const dados = doc.data() as { professorId?: string };

    // Só as de andaime. As do professor de teste e as reais ficam: as do
    // teste são montadas pelo `conta:teste`, e as reais são do colégio.
    if (dados.professorId?.startsWith(PREFIXO)) {
      await doc.ref.delete();
      removidas += 1;
    }
  }

  for (const professor of PROFESSORES) {
    await db.collection(COLECOES.professores).doc(professor.id).delete();
  }

  console.log(`
  ${removidas} alocação(ões) de andaime removida(s).
  ${PROFESSORES.length} professor(es) de andaime removido(s).

  As alocações do Professor de Teste e as reais continuam — as primeiras
  saem com 'npm run conta:teste -- --perfil professor --apagar'.

  O que foi lançado nelas (nota, diário, frequência) continua no banco:
  é do aluno, e apagá-lo por script tiraria do boletim marca que pode ser
  real. Corrija pela tela.
`);
}
