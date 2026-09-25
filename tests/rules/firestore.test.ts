import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

/**
 * Testes das Security Rules do Firestore, contra o emulador.
 *
 *   npm run test:rules
 *
 * É o único lugar onde a matriz de acesso é verificada de verdade: o que
 * `roles.ts` diz vale para a interface, mas quem decide o acesso ao dado é
 * este arquivo de regras. Uma regra frouxa aqui expõe dado de menor de idade
 * mesmo com a interface impecável.
 */

let testEnv: RulesTestEnvironment;

/** Turmas usadas nos cenários. */
const TURMA_DO_PROFESSOR = "EM1A";
const OUTRA_TURMA = "EF7A";

/** Matrícula do aluno vinculado ao responsável dos testes. */
const FILHO = "1001";
const OUTRO_ALUNO = "2002";

const contextos = () => ({
  secretaria: testEnv.authenticatedContext("u-sec", { role: "secretaria" }),
  coordenacao: testEnv.authenticatedContext("u-coord", { role: "coordenacao" }),
  financeiro: testEnv.authenticatedContext("u-fin", { role: "financeiro" }),
  professor: testEnv.authenticatedContext("u-prof", { role: "professor" }),
  outroProfessor: testEnv.authenticatedContext("u-prof2", {
    role: "professor",
  }),
  aluno: testEnv.authenticatedContext("u-aluno", { role: "aluno" }),
  responsavel: testEnv.authenticatedContext("u-resp", { role: "responsavel" }),
  outroResponsavel: testEnv.authenticatedContext("u-resp2", {
    role: "responsavel",
  }),
  responsavelSemChaves: testEnv.authenticatedContext("u-resp-sem-chaves", {
    role: "responsavel",
  }),
  visitante: testEnv.unauthenticatedContext(),
  /** Autenticado no Firebase, mas sem perfil aplicado. */
  semPerfil: testEnv.authenticatedContext("u-sem-perfil"),
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "ibpi-regras-teste",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();

    await setDoc(doc(db, "users/u-sec"), { role: "secretaria", nome: "Sec" });
    await setDoc(doc(db, "users/u-coord"), {
      role: "coordenacao",
      nome: "Coord",
    });
    await setDoc(doc(db, "users/u-fin"), { role: "financeiro", nome: "Fin" });
    await setDoc(doc(db, "users/u-prof"), {
      role: "professor",
      nome: "Juarez",
      turmas: [TURMA_DO_PROFESSOR],
    });
    await setDoc(doc(db, "users/u-prof2"), {
      role: "professor",
      nome: "Outra",
      turmas: [OUTRA_TURMA],
    });
    await setDoc(doc(db, "users/u-aluno"), {
      role: "aluno",
      nome: "Alice",
      matricula: FILHO,
      chavesDeAviso: [
        "todos",
        "segmento:medio",
        `turma:${TURMA_DO_PROFESSOR}`,
        `aluno:${FILHO}`,
      ],
    });
    await setDoc(doc(db, "users/u-resp"), {
      role: "responsavel",
      nome: "Mãe da Alice",
      alunosVinculados: [FILHO],
      chavesDeAviso: [
        "todos",
        "segmento:medio",
        `turma:${TURMA_DO_PROFESSOR}`,
        `aluno:${FILHO}`,
        "responsavel:r-1",
      ],
    });
    // Família de outro aluno: é ela que não pode enxergar o assunto da
    // primeira.
    await setDoc(doc(db, "users/u-resp2"), {
      role: "responsavel",
      nome: "Pai do Outro",
      alunosVinculados: [OUTRO_ALUNO],
      chavesDeAviso: [
        "todos",
        "segmento:fundamental",
        `turma:${OUTRA_TURMA}`,
        `aluno:${OUTRO_ALUNO}`,
        "responsavel:r-2",
      ],
    });
    // Conta ainda sem chaves — o estado de quem foi criado antes da
    // sincronização existir.
    await setDoc(doc(db, "users/u-resp-sem-chaves"), {
      role: "responsavel",
      nome: "Sem chaves",
      alunosVinculados: [FILHO],
    });

    await setDoc(doc(db, `alunos/${FILHO}`), {
      nome: "Alice",
      turmaId: TURMA_DO_PROFESSOR,
    });
    await setDoc(doc(db, `alunos/${OUTRO_ALUNO}`), {
      nome: "Outro",
      turmaId: OUTRA_TURMA,
    });

    const vinculo = { matricula: FILHO, turmaId: TURMA_DO_PROFESSOR };
    await setDoc(doc(db, "notas/n1"), { ...vinculo, projeto: 8 });
    await setDoc(doc(db, "boletins/b1"), vinculo);
    await setDoc(doc(db, "frequenciaDiaria/f1"), { ...vinculo, situacao: "F" });
    await setDoc(doc(db, "ocorrencias/o1"), {
      ...vinculo,
      tipo: "uniforme",
    });
    await setDoc(doc(db, "diarioClasse/d1"), { turmaId: TURMA_DO_PROFESSOR });
    await setDoc(doc(db, "cobrancas/c1"), { matricula: FILHO, valor: 800 });
    await setDoc(doc(db, "contratos/ct1"), {
      matricula: FILHO,
      tipo: "anuidade",
      valor: 1603,
    });
    await setDoc(doc(db, "auditoria/a1"), { acao: "nota.alterada" });
    await setDoc(doc(db, "avisos/geral"), {
      titulo: "Reunião de pais",
      chave: "todos",
      ativo: true,
    });
    await setDoc(doc(db, "avisos/individual"), {
      titulo: "Assunto da família",
      chave: `aluno:${FILHO}`,
      ativo: true,
    });
    await setDoc(doc(db, "avisos/da-turma"), {
      titulo: "Prova na sexta",
      chave: `turma:${TURMA_DO_PROFESSOR}`,
      ativo: true,
    });
    await setDoc(doc(db, "avisos/do-segmento"), {
      titulo: "Calendário do Médio",
      chave: "segmento:medio",
      ativo: true,
    });
    await setDoc(doc(db, "avisos/ao-responsavel"), {
      titulo: "Mensalidade",
      chave: "responsavel:r-1",
      ativo: true,
    });
    await setDoc(doc(db, "avisos/despublicado"), {
      titulo: "Saiu do ar",
      chave: "todos",
      ativo: false,
    });
    await setDoc(doc(db, "turmas/EM1A"), { nome: "EM1A" });
    await setDoc(doc(db, "coisa-nova/x1"), { qualquer: true });
  });
});

const ler = (
  contexto: ReturnType<typeof contextos>[keyof ReturnType<typeof contextos>],
  caminho: string,
) => getDoc(doc(contexto.firestore(), caminho));

describe("acesso sem sessão", () => {
  it("visitante não lê nada", async () => {
    const { visitante } = contextos();
    await assertFails(ler(visitante, `alunos/${FILHO}`));
    await assertFails(ler(visitante, "notas/n1"));
    await assertFails(ler(visitante, "turmas/EM1A"));
  });

  it("autenticado sem perfil aplicado não lê dado de aluno", async () => {
    // Conta criada no console sem passar pela secretaria: a custom claim
    // ainda não existe, e sem ela não há acesso.
    const { semPerfil } = contextos();
    await assertFails(ler(semPerfil, `alunos/${FILHO}`));
    await assertFails(ler(semPerfil, "notas/n1"));
  });
});

describe("aluno", () => {
  it("lê o próprio cadastro, notas e frequência", async () => {
    const { aluno } = contextos();
    await assertSucceeds(ler(aluno, `alunos/${FILHO}`));
    await assertSucceeds(ler(aluno, "notas/n1"));
    await assertSucceeds(ler(aluno, "boletins/b1"));
    await assertSucceeds(ler(aluno, "frequenciaDiaria/f1"));
  });

  it("não lê a própria ocorrência disciplinar", async () => {
    // Regra de negócio: ocorrência é tratada com o responsável e a equipe.
    const { aluno } = contextos();
    await assertFails(ler(aluno, "ocorrencias/o1"));
  });

  it("não lê o financeiro", async () => {
    const { aluno } = contextos();
    await assertFails(ler(aluno, "cobrancas/c1"));
    await assertFails(ler(aluno, "contratos/ct1"));
  });

  it("não lê o cadastro de outro aluno", async () => {
    const { aluno } = contextos();
    await assertFails(ler(aluno, `alunos/${OUTRO_ALUNO}`));
  });
});

describe("responsável", () => {
  it("lê tudo do filho, inclusive ocorrência e financeiro", async () => {
    const { responsavel } = contextos();
    await assertSucceeds(ler(responsavel, `alunos/${FILHO}`));
    await assertSucceeds(ler(responsavel, "notas/n1"));
    await assertSucceeds(ler(responsavel, "frequenciaDiaria/f1"));
    await assertSucceeds(ler(responsavel, "ocorrencias/o1"));
    await assertSucceeds(ler(responsavel, "cobrancas/c1"));
    await assertSucceeds(ler(responsavel, "contratos/ct1"));
  });

  it("não lê dado de aluno que não é filho dele", async () => {
    const { responsavel } = contextos();
    await assertFails(ler(responsavel, `alunos/${OUTRO_ALUNO}`));
  });
});

describe("professor", () => {
  it("lê os alunos e lançamentos das turmas que leciona", async () => {
    const { professor } = contextos();
    await assertSucceeds(ler(professor, `alunos/${FILHO}`));
    await assertSucceeds(ler(professor, "notas/n1"));
    await assertSucceeds(ler(professor, "frequenciaDiaria/f1"));
    await assertSucceeds(ler(professor, "ocorrencias/o1"));
    await assertSucceeds(ler(professor, "diarioClasse/d1"));
  });

  it("não lê aluno de turma que não leciona", async () => {
    // O recorte por turma é o que impede "professor" virar acesso à escola.
    const { outroProfessor } = contextos();
    await assertFails(ler(outroProfessor, `alunos/${FILHO}`));
    await assertFails(ler(outroProfessor, "notas/n1"));
    await assertFails(ler(outroProfessor, "diarioClasse/d1"));
  });

  it("não lê o financeiro", async () => {
    const { professor } = contextos();
    await assertFails(ler(professor, "cobrancas/c1"));
    await assertFails(ler(professor, "contratos/ct1"));
  });

  it("não lê a auditoria", async () => {
    const { professor } = contextos();
    await assertFails(ler(professor, "auditoria/a1"));
  });
});

describe("financeiro", () => {
  it("lê cadastro e cobrança", async () => {
    const { financeiro } = contextos();
    await assertSucceeds(ler(financeiro, `alunos/${FILHO}`));
    await assertSucceeds(ler(financeiro, "cobrancas/c1"));
    await assertSucceeds(ler(financeiro, "contratos/ct1"));
  });

  it("não enxerga a vida escolar do aluno", async () => {
    const { financeiro } = contextos();
    await assertFails(ler(financeiro, "notas/n1"));
    await assertFails(ler(financeiro, "boletins/b1"));
    await assertFails(ler(financeiro, "frequenciaDiaria/f1"));
    await assertFails(ler(financeiro, "ocorrencias/o1"));
  });
});

describe("secretaria e coordenação", () => {
  it("leem toda a base acadêmica e a auditoria", async () => {
    for (const contexto of [contextos().secretaria, contextos().coordenacao]) {
      await assertSucceeds(ler(contexto, `alunos/${FILHO}`));
      await assertSucceeds(ler(contexto, `alunos/${OUTRO_ALUNO}`));
      await assertSucceeds(ler(contexto, "notas/n1"));
      await assertSucceeds(ler(contexto, "ocorrencias/o1"));
      await assertSucceeds(ler(contexto, "cobrancas/c1"));
      await assertSucceeds(ler(contexto, "auditoria/a1"));
      await assertSucceeds(ler(contexto, "users/u-aluno"));
    }
  });
});

describe("escrita pelo cliente", () => {
  it("é negada para todos os perfis, inclusive secretaria", async () => {
    // Todo lançamento passa pelo Admin SDK no servidor, que valida escopo e
    // grava auditoria. Escrita direta do navegador contornaria os dois.
    const { secretaria, professor, financeiro, aluno } = contextos();

    await assertFails(
      setDoc(doc(secretaria.firestore(), "notas/n1"), { projeto: 10 }),
    );
    await assertFails(
      setDoc(doc(professor.firestore(), "notas/n1"), { projeto: 10 }),
    );
    await assertFails(
      setDoc(doc(financeiro.firestore(), "cobrancas/c1"), { valor: 0 }),
    );
    await assertFails(
      setDoc(doc(aluno.firestore(), `alunos/${FILHO}`), { nome: "Outro" }),
    );
  });

  it("nem o próprio usuário altera o seu perfil", async () => {
    // Se pudesse, qualquer aluno viraria secretaria.
    const { aluno } = contextos();
    await assertFails(
      setDoc(doc(aluno.firestore(), "users/u-aluno"), { role: "secretaria" }),
    );
  });
});

describe("avisos", () => {
  it("a equipe escolar lê qualquer aviso", async () => {
    const { secretaria, coordenacao, professor, financeiro } = contextos();

    for (const contexto of [secretaria, coordenacao, professor, financeiro]) {
      await assertSucceeds(ler(contexto, "avisos/geral"));
      await assertSucceeds(ler(contexto, "avisos/individual"));
      // Inclusive o que saiu do ar: o que foi comunicado fica registrado.
      await assertSucceeds(ler(contexto, "avisos/despublicado"));
    }
  });

  it("a família lê o aviso geral", async () => {
    const { aluno, responsavel } = contextos();
    await assertSucceeds(ler(aluno, "avisos/geral"));
    await assertSucceeds(ler(responsavel, "avisos/geral"));
  });

  it("a família lê o aviso da turma, do segmento e o individual", async () => {
    // É o que o app MyIBPI precisa: ele lê o Firestore direto, sem o
    // servidor do Portal para aplicar o alcance.
    const { aluno, responsavel } = contextos();

    for (const contexto of [aluno, responsavel]) {
      await assertSucceeds(ler(contexto, "avisos/da-turma"));
      await assertSucceeds(ler(contexto, "avisos/do-segmento"));
      await assertSucceeds(ler(contexto, "avisos/individual"));
    }
  });

  it("o responsável lê o que foi endereçado a ele", async () => {
    const { responsavel } = contextos();
    await assertSucceeds(ler(responsavel, "avisos/ao-responsavel"));
  });

  it("uma família não lê o assunto da outra", async () => {
    // O ponto da regra: chave que não está na lista da pessoa é negada.
    const { outroResponsavel } = contextos();

    await assertSucceeds(ler(outroResponsavel, "avisos/geral"));
    await assertFails(ler(outroResponsavel, "avisos/individual"));
    await assertFails(ler(outroResponsavel, "avisos/da-turma"));
    await assertFails(ler(outroResponsavel, "avisos/do-segmento"));
    await assertFails(ler(outroResponsavel, "avisos/ao-responsavel"));
  });

  it("o aluno não lê o aviso endereçado ao responsável dele", async () => {
    // Mensalidade é assunto de quem paga.
    const { aluno } = contextos();
    await assertFails(ler(aluno, "avisos/ao-responsavel"));
  });

  it("aviso despublicado some para a família", async () => {
    const { aluno, responsavel } = contextos();
    await assertFails(ler(aluno, "avisos/despublicado"));
    await assertFails(ler(responsavel, "avisos/despublicado"));
  });

  it("conta sem chaves ainda lê o aviso geral, e só ele", async () => {
    // Estado de quem foi criado antes da sincronização existir: perder até
    // o comunicado da escola inteira seria pior que o problema.
    const { responsavelSemChaves } = contextos();

    await assertSucceeds(ler(responsavelSemChaves, "avisos/geral"));
    await assertFails(ler(responsavelSemChaves, "avisos/individual"));
  });

  it("visitante não lê nem o aviso geral", async () => {
    const { visitante, semPerfil } = contextos();
    await assertFails(ler(visitante, "avisos/geral"));
    await assertFails(ler(semPerfil, "avisos/geral"));
  });

  it("ninguém publica aviso pelo cliente", async () => {
    const { secretaria } = contextos();
    await assertFails(
      setDoc(doc(secretaria.firestore(), "avisos/novo"), { titulo: "x" }),
    );
  });
});

describe("coleção não prevista", () => {
  it("nasce fechada", async () => {
    // Sem o fallback, criar uma coleção na FASE 3 e esquecer a regra
    // deixaria os dados abertos.
    const { secretaria, aluno } = contextos();
    await assertFails(ler(secretaria, "coisa-nova/x1"));
    await assertFails(ler(aluno, "coisa-nova/x1"));
  });
});

describe("estrutura da escola", () => {
  it("é legível por qualquer pessoa autenticada, para montar os rótulos", async () => {
    const { aluno, financeiro } = contextos();
    await assertSucceeds(ler(aluno, "turmas/EM1A"));
    await assertSucceeds(ler(financeiro, "turmas/EM1A"));
  });
});
