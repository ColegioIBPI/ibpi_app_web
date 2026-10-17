import { describe, expect, it } from "vitest";

import {
  publicadasPara,
  resumoDaPublicacao,
  visivelParaAluno,
  visivelParaResponsavel,
} from "@/features/frequencia/domain/publicacao";

const legada = {};
const retida = { visivelParaResponsavel: false, visivelParaAluno: false };
const paraOsDois = { visivelParaResponsavel: true, visivelParaAluno: true };
const soAluno = { visivelParaResponsavel: false, visivelParaAluno: true };

describe("ocorrência antiga, sem os campos", () => {
  it("o responsável continua vendo", () => {
    // Antes do campo existir, o responsável via todas. Tratar a ausência
    // como retida faria a família deixar de ver o que já via — e o que
    // some não avisa.
    expect(visivelParaResponsavel(legada)).toBe(true);
  });

  it("o aluno continua não vendo", () => {
    expect(visivelParaAluno(legada)).toBe(false);
  });
});

describe("publicação explícita", () => {
  it("só o false retém do responsável", () => {
    expect(visivelParaResponsavel(retida)).toBe(false);
    expect(visivelParaResponsavel({ visivelParaResponsavel: true })).toBe(true);
    expect(visivelParaResponsavel({ visivelParaResponsavel: null })).toBe(true);
  });

  it("só o true libera para o aluno", () => {
    expect(visivelParaAluno(paraOsDois)).toBe(true);
    expect(visivelParaAluno({ visivelParaAluno: null })).toBe(false);
    expect(visivelParaAluno({ visivelParaAluno: false })).toBe(false);
  });

  it("dá para mostrar ao aluno e reter do responsável", () => {
    // São dois campos justamente porque os destinos são independentes.
    expect(visivelParaAluno(soAluno)).toBe(true);
    expect(visivelParaResponsavel(soAluno)).toBe(false);
  });
});

describe("filtro por papel", () => {
  const lista = [legada, retida, paraOsDois, soAluno];

  it("o responsável recebe a legada e a publicada", () => {
    expect(publicadasPara(lista, "responsavel")).toEqual([legada, paraOsDois]);
  });

  it("o aluno recebe só o que foi marcado para ele", () => {
    expect(publicadasPara(lista, "aluno")).toEqual([paraOsDois, soAluno]);
  });

  it("a ocorrência retida não chega a ninguém de fora", () => {
    expect(publicadasPara([retida], "responsavel")).toEqual([]);
    expect(publicadasPara([retida], "aluno")).toEqual([]);
  });
});

describe("resumo para a equipe", () => {
  it("diz a quem a ocorrência chega", () => {
    expect(resumoDaPublicacao(paraOsDois)).toBe("Visível: responsável e aluno");
    expect(resumoDaPublicacao(legada)).toBe("Visível: responsável");
    expect(resumoDaPublicacao(soAluno)).toBe("Visível: aluno");
  });

  it("deixa claro quando ninguém de fora vê", () => {
    expect(resumoDaPublicacao(retida)).toBe("Só a equipe");
  });
});
