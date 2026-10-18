import { describe, expect, it } from "vitest";

import type { UsuarioComId } from "@/core/modelo";
import {
  administradoresAtivos,
  impedimentoParaSuspender,
  impedimentoParaTrocarPapel,
  ordenarUsuarios,
  resumoDoVinculo,
  semVinculoUtil,
} from "@/features/usuarios/domain/administracao";

const usuario = (extra: Partial<UsuarioComId> & { id: string }): UsuarioComId =>
  ({
    nome: "Fulano",
    email: "f@ibpi",
    role: "secretaria",
    ativo: true,
    alunosVinculados: [],
    turmas: [],
    chavesDeAlcance: [],
    ...extra,
  }) as UsuarioComId;

const ADMIN = usuario({ id: "u-admin", role: "admin", nome: "Jorge" });
const OUTRO_ADMIN = usuario({ id: "u-admin2", role: "admin", nome: "Ana" });
const SECRETARIA = usuario({ id: "u-sec", role: "secretaria" });

describe("trocar o papel", () => {
  it("ninguém troca o próprio", () => {
    // Quem se rebaixa perde a tela no mesmo clique e passa a depender de
    // outra pessoa para voltar.
    expect(
      impedimentoParaTrocarPapel("u-admin", ADMIN, "professor", [
        ADMIN,
        OUTRO_ADMIN,
      ])?.motivo,
    ).toMatch(/próprio perfil/);
  });

  it("recusa trocar para o papel que já é", () => {
    expect(
      impedimentoParaTrocarPapel("u-admin", SECRETARIA, "secretaria", [
        ADMIN,
        SECRETARIA,
      ])?.motivo,
    ).toMatch(/já é Secretaria/);
  });

  it("não rebaixa o último administrador", () => {
    // Rebaixar o único admin tranca o sistema: ninguém mais promove
    // ninguém.
    expect(
      impedimentoParaTrocarPapel("u-sec", ADMIN, "professor", [
        ADMIN,
        SECRETARIA,
      ])?.motivo,
    ).toMatch(/única conta de administração/);
  });

  it("com dois administradores, rebaixar um é permitido", () => {
    expect(
      impedimentoParaTrocarPapel("u-admin2", ADMIN, "professor", [
        ADMIN,
        OUTRO_ADMIN,
      ]),
    ).toBeNull();
  });

  it("administrador suspenso não conta como saída de emergência", () => {
    // Dois admins no papel, mas um suspenso: rebaixar o ativo tranca
    // igual.
    const suspenso = usuario({ id: "u-admin2", role: "admin", ativo: false });

    expect(administradoresAtivos([ADMIN, suspenso])).toBe(1);
    expect(
      impedimentoParaTrocarPapel("u-sec", ADMIN, "professor", [
        ADMIN,
        suspenso,
      ])?.motivo,
    ).toMatch(/única conta de administração/);
  });
});

describe("suspender o acesso", () => {
  it("ninguém suspende a si mesmo", () => {
    expect(
      impedimentoParaSuspender("u-sec", SECRETARIA, [ADMIN, SECRETARIA])
        ?.motivo,
    ).toMatch(/próprio acesso/);
  });

  it("não suspende o último administrador ativo", () => {
    expect(
      impedimentoParaSuspender("u-sec", ADMIN, [ADMIN, SECRETARIA])?.motivo,
    ).toMatch(/única conta de administração/);
  });

  it("reativar o administrador suspenso é sempre permitido", () => {
    // Ele já está fora: deixar de reativá-lo seria trancar a porta de
    // dentro.
    const suspenso = usuario({ id: "u-admin", role: "admin", ativo: false });

    expect(impedimentoParaSuspender("u-sec", suspenso, [suspenso])).toBeNull();
  });

  it("suspender quem não é administração passa", () => {
    expect(
      impedimentoParaSuspender("u-admin", SECRETARIA, [ADMIN, SECRETARIA]),
    ).toBeNull();
  });
});

describe("o que a conta alcança", () => {
  it("resume o vínculo em uma linha", () => {
    expect(resumoDoVinculo(usuario({ id: "a", matricula: "26031" }))).toBe(
      "Matrícula 26031",
    );
    expect(
      resumoDoVinculo(usuario({ id: "b", alunosVinculados: ["1", "2"] })),
    ).toBe("2 alunos vinculados");
    expect(resumoDoVinculo(usuario({ id: "c", turmas: ["EM1A"] }))).toBe(
      "1 turma",
    );
    expect(resumoDoVinculo(SECRETARIA)).toBe("Sem vínculo");
  });

  it("marca a conta de família que entra e não vê nada", () => {
    // É a falha mais comum: a conta é criada, a pessoa entra, e a tela
    // está vazia. Descobrir isso na lista é melhor que na ligação.
    expect(semVinculoUtil(usuario({ id: "a", role: "responsavel" }))).toBe(true);
    expect(semVinculoUtil(usuario({ id: "b", role: "aluno" }))).toBe(true);
    expect(semVinculoUtil(usuario({ id: "c", role: "professor" }))).toBe(true);
  });

  it("conta de equipe sem vínculo é normal", () => {
    // Secretaria não tem filho nem turma, e isso não é defeito.
    expect(semVinculoUtil(SECRETARIA)).toBe(false);
    expect(semVinculoUtil(ADMIN)).toBe(false);
  });

  it("com vínculo, não marca", () => {
    expect(
      semVinculoUtil(usuario({ id: "a", role: "responsavel", alunosVinculados: ["1"] })),
    ).toBe(false);
  });
});

describe("ordem da lista", () => {
  it("equipe antes de família, e por nome dentro do grupo", () => {
    const ordenados = ordenarUsuarios([
      usuario({ id: "1", role: "responsavel", nome: "Zilda" }),
      usuario({ id: "2", role: "secretaria", nome: "Beatriz" }),
      usuario({ id: "3", role: "admin", nome: "Jorge" }),
      usuario({ id: "4", role: "secretaria", nome: "Ana" }),
    ]);

    expect(ordenados.map((u) => u.nome)).toEqual([
      "Jorge",
      "Ana",
      "Beatriz",
      "Zilda",
    ]);
  });

  it("não mexe no array recebido", () => {
    const original = [
      usuario({ id: "1", role: "responsavel", nome: "Zilda" }),
      usuario({ id: "2", role: "admin", nome: "Jorge" }),
    ];
    ordenarUsuarios(original);

    expect(original.map((u) => u.nome)).toEqual(["Zilda", "Jorge"]);
  });
});
