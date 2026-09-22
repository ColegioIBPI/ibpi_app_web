/**
 * Carrega no Firestore os dados extraídos do Access.
 *
 *   npm run migrar -- --dry-run     # só relatório, não escreve nada
 *   npm run migrar
 *
 * Roda em TypeScript direto no Node 24 (type stripping), o que permite usar
 * exatamente as mesmas funções de transformação que a aplicação usa e que
 * estão cobertas por teste — em vez de reescrever as regras num script
 * solto, que é como migração passa a divergir do sistema.
 *
 * **Idempotente**: todo documento tem id determinístico, então rodar de novo
 * sobrescreve em vez de duplicar. Na prática a migração roda várias vezes
 * até os dados saírem certos.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { paraDataISO } from "@/core/lib/datas";
import {
  idDaCobranca,
  parsearContrato,
  parsearParcela,
  parsearValor,
  situacaoDaCobranca,
} from "@/features/migracao/domain/financeiro";
import {
  consolidarResponsaveis,
  montarResponsavel,
  type Responsavel,
} from "@/features/migracao/domain/responsavel";
import {
  chaveDeComparacao,
  extrairEmails,
  limparTexto,
  normalizarCpf,
  normalizarNome,
  normalizarTelefone,
} from "@/features/migracao/domain/texto";
import {
  derivarTurma,
  idDaTurma,
  ROTULOS_DE_SEGMENTO,
  ROTULOS_DE_TURNO,
  type TurmaDerivada,
} from "@/features/migracao/domain/turma";

const DIRETORIO = join(dirname(fileURLToPath(import.meta.url)), "data");
const ANO_LETIVO = Number(process.env.ANO_LETIVO ?? 2026);
const DRY_RUN = process.argv.includes("--dry-run");

interface Divergencia {
  matricula: string;
  nome: string;
  campo: string;
  access: string;
  planilha: string;
}

const divergencias: Divergencia[] = [];
const avisos: string[] = [];

function ler<T>(tabela: string): T[] {
  try {
    return JSON.parse(readFileSync(join(DIRETORIO, `${tabela}.json`), "utf8"));
  } catch {
    avisos.push(`${tabela}.json não encontrado — rode extrair.py antes.`);
    return [];
  }
}

// ---------------------------------------------------------------- transformação

type Linha = Record<string, unknown>;

const alunosBrutos = ler<Linha>("Tabela_Aluno");
const disciplinasBrutas = ler<Linha>("Disciplina");
const salasBrutas = ler<Linha>("Salas");
const pagamentosBrutos = ler<Linha>("Tabela_pagamento");
const fatosBrutos = ler<Linha>("Fatos");

let turmasDaPlanilha: Record<string, string> = {};
try {
  turmasDaPlanilha = JSON.parse(
    readFileSync(join(DIRETORIO, "_turmas_planilha.json"), "utf8"),
  );
} catch {
  avisos.push(
    "Planilha de frequência não extraída — a turma vem só do cadastro, sem conferência.",
  );
}

const turmaPorChaveDeNome = new Map(
  Object.entries(turmasDaPlanilha).map(([nome, turma]) => [
    chaveDeComparacao(nome),
    String(turma),
  ]),
);

/** Documentos a gravar, por coleção. */
const docs = {
  alunos: new Map<string, Linha>(),
  responsaveis: new Map<string, Linha>(),
  turmas: new Map<string, Linha>(),
  disciplinas: new Map<string, Linha>(),
  salas: new Map<string, Linha>(),
  matriculas: new Map<string, Linha>(),
  cobrancas: new Map<string, Linha>(),
  contratos: new Map<string, Linha>(),
};

const responsaveisBrutos: Responsavel[] = [];
const filhosPorResponsavel = new Map<string, Set<string>>();

for (const bruto of alunosBrutos) {
  const matricula = limparTexto(bruto.Matricula);
  const nome = normalizarNome(bruto.Nomealuno);

  if (!matricula || !nome) {
    avisos.push(
      `Aluno sem matrícula ou nome, ignorado: ${JSON.stringify(bruto.Matricula)}`,
    );
    continue;
  }

  const turma = resolverTurma(bruto, matricula, nome);

  docs.alunos.set(matricula, {
    matricula,
    nome,
    nomeParaBusca: chaveDeComparacao(nome),
    dataNascimento: dataISO(bruto.DataNascimento),
    cpf: normalizarCpf(bruto.CPF),
    // A situação do Access é vazia em toda a base; o que vale é o Status.
    ativo: chaveDeComparacao(bruto.Status) !== "CANCELADO",
    statusOriginal: limparTexto(bruto.Status),
    turmaId: turma ? idDaTurma(ANO_LETIVO, turma.codigo) : null,
    turmaCodigo: turma?.codigo ?? null,
    segmento: turma?.segmento ?? null,
    serie: turma?.serie ?? null,
    turno: turma?.turno ?? null,
    contato: {
      emails: extrairEmails(bruto.emailaluno1).concat(
        extrairEmails(bruto.emailaluno2),
      ),
      telefones: [bruto.Tel1, bruto.Tel2, bruto.Tel3, bruto.Tel4]
        .map(normalizarTelefone)
        .filter(Boolean),
      endereco: {
        logradouro: limparTexto(bruto.Endereco),
        complemento: limparTexto(bruto.Complemento),
        bairro: limparTexto(bruto.Bairro),
        cidade: limparTexto(bruto.Cidade),
        uf: limparTexto(bruto.UF),
        cep: limparTexto(bruto.cep),
      },
    },
    filiacao: {
      mae: normalizarNome(bruto.Mae),
      pai: normalizarNome(bruto.Pai),
    },
    documentos: {
      identidade: limparTexto(bruto.Identidade),
      orgaoEmissor: limparTexto(bruto.Orgaoemissor),
      ufEmissor: limparTexto(bruto.UFEmisor),
      dataEmissao: dataISO(bruto.dataemissao),
      certidaoTermo: limparTexto(bruto.Termo),
      certidaoFolha: limparTexto(bruto.Folha),
      certidaoLivro: limparTexto(bruto.Livro),
      cartorio: limparTexto(bruto.Cartorio),
      ufCartorio: limparTexto(bruto.UFCartorio),
      codigoINEP: limparTexto(bruto.codigoINEP),
      nacionalidade: limparTexto(bruto.Nacionalidade),
      naturalidade: limparTexto(bruto.Municipio),
      ufNaturalidade: limparTexto(bruto.NaturalUF),
    },
    observacoes: limparTexto(bruto.Obs),
    dataMatricula: dataISO(bruto["Data Matricula"]),
    origem: "access",
    migradoEm: new Date().toISOString(),
  });

  // Matrícula do ano letivo — separada do cadastro, porque o aluno muda de
  // turma a cada ano e o histórico precisa sobreviver.
  if (turma) {
    docs.matriculas.set(`${ANO_LETIVO}-${matricula}`, {
      matricula,
      nome,
      anoLetivo: ANO_LETIVO,
      turmaId: idDaTurma(ANO_LETIVO, turma.codigo),
      turmaCodigo: turma.codigo,
      segmento: turma.segmento,
      serie: turma.serie,
      turno: turma.turno,
      situacao:
        chaveDeComparacao(bruto.Status) === "CANCELADO" ? "cancelada" : "ativa",
      origem: "access",
    });

    const id = idDaTurma(ANO_LETIVO, turma.codigo);
    docs.turmas.set(id, {
      codigo: turma.codigo,
      anoLetivo: ANO_LETIVO,
      segmento: turma.segmento,
      segmentoRotulo: ROTULOS_DE_SEGMENTO[turma.segmento],
      turno: turma.turno,
      turnoRotulo: ROTULOS_DE_TURNO[turma.turno],
      ativa: true,
      origem: "access",
    });
  }

  registrarResponsaveis(bruto, matricula);
}

function resolverTurma(
  bruto: Linha,
  matricula: string,
  nome: string,
): TurmaDerivada | null {
  const derivada = derivarTurma({
    curso: bruto.Curso1,
    etapa: bruto.Etapa1,
    turno: bruto.Turno1,
  });

  const daPlanilha = turmaPorChaveDeNome.get(chaveDeComparacao(nome));
  if (!daPlanilha) return derivada;

  const codigoPlanilha = normalizarCodigoDeTurma(daPlanilha);

  if (derivada && codigoPlanilha !== derivada.codigo) {
    // A planilha é o registro do dia a dia; o cadastro pode estar
    // desatualizado. Vence a planilha, e a divergência vai para o relatório.
    divergencias.push({
      matricula,
      nome,
      campo: "turma",
      access: derivada.codigo,
      planilha: codigoPlanilha,
    });

    return {
      ...derivada,
      codigo: codigoPlanilha,
      ...segmentoDoCodigo(codigoPlanilha),
    };
  }

  return derivada;
}

/** `E.J.A. EF`, `6/7ºEF` e afins, como a secretaria escreve. */
function normalizarCodigoDeTurma(codigo: string): string {
  return codigo.replace(/\s+/g, " ").trim().toUpperCase();
}

function segmentoDoCodigo(codigo: string): Partial<TurmaDerivada> {
  const chave = chaveDeComparacao(codigo);

  if (chave.includes("EJA")) {
    const ehMedio = chave.includes("EM");
    return {
      segmento: ehMedio ? "eja-medio" : "eja-fundamental",
    };
  }

  return { segmento: chave.startsWith("EM") ? "medio" : "fundamental" };
}

function registrarResponsaveis(bruto: Linha, matricula: string) {
  const candidatos = [
    {
      nome: bruto.Responsavel,
      parentesco: bruto.Parentesco1,
      email: bruto.emailresponsavel1,
      telefone: bruto.Tel1,
      cpf: bruto.CPF,
    },
    {
      nome: bruto.Responsavel1,
      parentesco: bruto.Parentesco2,
      email: bruto.emailresponsavel2,
      telefone: bruto.Tel2,
      cpf: null,
    },
  ];

  for (const candidato of candidatos) {
    const responsavel = montarResponsavel(candidato);
    if (!responsavel) continue;

    responsaveisBrutos.push(responsavel);

    const filhos =
      filhosPorResponsavel.get(responsavel.id) ?? new Set<string>();
    filhos.add(matricula);
    filhosPorResponsavel.set(responsavel.id, filhos);
  }
}

for (const responsavel of consolidarResponsaveis(responsaveisBrutos)) {
  docs.responsaveis.set(responsavel.id, {
    ...responsavel,
    alunosVinculados: [
      ...(filhosPorResponsavel.get(responsavel.id) ?? []),
    ].sort(),
    // O uid só existe depois que a secretaria criar a conta de acesso.
    uid: null,
    origem: "access",
  });
}

// Disciplinas: a base tem grafias divergentes da mesma matéria
// (`PORTUGUES/LITERATURA` e `PORTUGUÊS/LITERATURA`). A chave de comparação
// consolida as duas no mesmo documento.
for (const bruto of disciplinasBrutas) {
  const nome = limparTexto(bruto.Nomedisciplina);
  if (!nome) continue;

  const id = idDeTexto(nome);
  const existente = docs.disciplinas.get(id);

  docs.disciplinas.set(id, {
    nome: existente ? existente.nome : normalizarNome(nome),
    sigla: limparTexto(bruto.Sigladisciplina) ?? existente?.sigla ?? null,
    grafiasOriginais: [
      ...new Set([...((existente?.grafiasOriginais as string[]) ?? []), nome]),
    ],
    ativa: true,
    origem: "access",
  });
}

for (const bruto of salasBrutas) {
  const nome = limparTexto(bruto.NomeSala);
  if (!nome) continue;

  docs.salas.set(idDeTexto(nome), {
    nome,
    sigla: limparTexto(bruto.SiglaSala),
    origem: "access",
  });
}

const hoje = new Date();

for (const bruto of pagamentosBrutos) {
  const matricula = limparTexto(bruto.Matricula);
  const vencimento = dataISO(bruto.Vencimento);

  if (!matricula || !vencimento) {
    avisos.push(
      `Pagamento sem matrícula ou vencimento, ignorado (${matricula ?? "?"}).`,
    );
    continue;
  }

  const parcela = parsearParcela(bruto["QTDE de Parcelas"]);
  const dataPagamento = dataISO(bruto["Data Pagamento"]);

  // O distintivo separa cobranças que coincidem em aluno, data e parcela —
  // ver o comentário em `idDaCobranca`.
  const distintivo = `${bruto.Valor ?? ""}|${bruto["Observações"] ?? ""}`;

  docs.cobrancas.set(idDaCobranca(matricula, vencimento, parcela, distintivo), {
    matricula,
    vencimento,
    parcela: parcela?.numero ?? null,
    totalDeParcelas: parcela?.total ?? null,
    valor: parsearValor(bruto.Valor),
    valorPago: parsearValor(bruto["Valor Pago"]),
    dataPagamento,
    situacao: situacaoDaCobranca({ vencimento, dataPagamento, hoje }),
    observacoes: limparTexto(bruto["Observações"]),
    origem: "access",
  });
}

// `Fatos` são os itens contratados do ano (anuidade, matrícula, taxa de
// material), não ocorrências disciplinares — apesar do nome.
fatosBrutos.forEach((bruto, indice) => {
  const matricula = limparTexto(bruto.Matricula);
  const contrato = parsearContrato(bruto.Tipo, bruto.Ocorrencia);

  if (!matricula || !contrato) return;

  docs.contratos.set(`${matricula}-${indice}`, {
    matricula,
    data: dataISO(bruto.DataOcor),
    ...contrato,
    origem: "access",
  });
});

function dataISO(valor: unknown): string | null {
  const texto = limparTexto(valor);
  if (!texto) return null;

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : paraDataISO(data);
}

function idDeTexto(valor: string): string {
  return (
    chaveDeComparacao(valor)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "sem-nome"
  );
}

// ---------------------------------------------------------------------- carga

const contagens = Object.fromEntries(
  Object.entries(docs).map(([colecao, mapa]) => [colecao, mapa.size]),
);

console.log(`\nMigração do Access — ano letivo ${ANO_LETIVO}\n`);
for (const [colecao, total] of Object.entries(contagens)) {
  console.log(`  ${String(total).padStart(6)}  ${colecao}`);
}

if (divergencias.length > 0) {
  console.log(
    `\nDivergências entre cadastro e planilha (${divergencias.length}):`,
  );
  for (const d of divergencias) {
    console.log(
      `  ${d.matricula} ${d.nome}: cadastro diz ${d.access}, planilha diz ${d.planilha} → vale a planilha`,
    );
  }
}

if (avisos.length > 0) {
  console.log(`\nAvisos (${avisos.length}):`);
  for (const aviso of avisos.slice(0, 20)) console.log(`  ${aviso}`);
}

const relatorio = {
  executadoEm: new Date().toISOString(),
  anoLetivo: ANO_LETIVO,
  dryRun: DRY_RUN,
  contagens,
  divergencias,
  avisos,
};

writeFileSync(
  join(DIRETORIO, "_relatorio.json"),
  JSON.stringify(relatorio, null, 2),
  "utf8",
);

if (DRY_RUN) {
  console.log("\n--dry-run: nada foi gravado no Firestore.\n");
  process.exit(0);
}

const credencial = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!credencial) {
  console.error("\nFIREBASE_SERVICE_ACCOUNT ausente.\n");
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(
      JSON.parse(
        credencial.trim().startsWith("{")
          ? credencial
          : Buffer.from(credencial, "base64").toString("utf8"),
      ),
    ),
  });
}

const db = getFirestore();

console.log("\nGravando…");
for (const [colecao, mapa] of Object.entries(docs)) {
  await gravar(db, colecao, mapa);
  console.log(`  ${colecao}: ${mapa.size}`);
}

console.log("\nMigração concluída.\n");

/** Grava em lotes: o Firestore aceita no máximo 500 operações por batch. */
async function gravar(
  db: Firestore,
  colecao: string,
  mapa: Map<string, Linha>,
) {
  const entradas = [...mapa.entries()];

  for (let i = 0; i < entradas.length; i += 400) {
    const lote = db.batch();

    for (const [id, dados] of entradas.slice(i, i + 400)) {
      // `merge` preserva o que a secretaria já tiver editado no sistema:
      // a migração completa o registro, não apaga o trabalho de ninguém.
      lote.set(db.collection(colecao).doc(id), dados, { merge: true });
    }

    await lote.commit();
  }
}
