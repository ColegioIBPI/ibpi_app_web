import { describe, expect, it } from "vitest";

import {
  filtrarResponsaveis,
  motivoParaNaoCriarConta,
  ordenarPorNome,
  podeCriarConta,
  temConta,
  type ResponsavelDaListagem,
} from "@/features/responsaveis/domain/busca";

const base: ResponsavelDaListagem = {
  nome: "Renata Gobato",
  email: "regobato@gmail.com",
  alunosVinculados: ["22022"],
  uid: null,
  ativo: true,
};

const lista: ResponsavelDaListagem[] = [
  base,
  {
    nome: "Sharisy Colavitti Antunes",
    email: "sharisy09@gmail.com",
    alunosVinculados: ["23016", "23017"],
    uid: "uid-sharisy",
    ativo: true,
  },
  {
    nome: "Tatiana Perecmanis",
    email: null,
    alunosVinculados: ["23001"],
    uid: null,
    ativo: true,
  },
  {
    nome: "Ivan Drummond Filho",
    email: "ivan@icloud.com",
    alunosVinculados: [],
    uid: null,
    ativo: true,
  },
];

describe("filtrarResponsaveis", () => {
  it("busca por parte do nome, sem acento", () => {
    expect(filtrarResponsaveis(lista, { termo: "colavitti" })).toHaveLength(1);
    expect(filtrarResponsaveis(lista, { termo: "SHARISY" })).toHaveLength(1);
  });

  it("busca também por e-mail — é como a secretaria identifica a família", () => {
    expect(filtrarResponsaveis(lista, { termo: "regobato" })).toHaveLength(1);
  });

  it("separa quem já tem acesso de quem não tem", () => {
    expect(filtrarResponsaveis(lista, { acesso: "com-conta" })).toHaveLength(1);
    expect(filtrarResponsaveis(lista, { acesso: "sem-conta" })).toHaveLength(3);
  });

  it("encontra os responsáveis sem filho vinculado", () => {
    // É o registro que não serve para nada até ser corrigido.
    const orfaos = filtrarResponsaveis(lista, { acesso: "sem-filho" });
    expect(orfaos).toHaveLength(1);
    expect(orfaos[0].nome).toBe("Ivan Drummond Filho");
  });

  it("combina busca e filtro", () => {
    expect(
      filtrarResponsaveis(lista, { termo: "a", acesso: "com-conta" }),
    ).toHaveLength(1);
  });

  it("sem filtro devolve todos", () => {
    expect(filtrarResponsaveis(lista)).toHaveLength(4);
    expect(filtrarResponsaveis([], { termo: "x" })).toEqual([]);
  });
});

describe("podeCriarConta", () => {
  it("permite quando há e-mail e filho vinculado", () => {
    expect(podeCriarConta(base)).toBe(true);
  });

  it("recusa quem já tem conta", () => {
    expect(podeCriarConta({ ...base, uid: "uid-existente" })).toBe(false);
    expect(temConta({ ...base, uid: "uid-existente" })).toBe(true);
  });

  it("recusa sem e-mail — é o login", () => {
    expect(podeCriarConta({ ...base, email: null })).toBe(false);
  });

  it("recusa sem filho vinculado", () => {
    // Sem vínculo, a pessoa entraria num portal vazio e as Security Rules
    // recusariam qualquer consulta que ela tentasse.
    expect(podeCriarConta({ ...base, alunosVinculados: [] })).toBe(false);
  });
});

describe("motivoParaNaoCriarConta", () => {
  it("não inventa motivo quando está tudo certo", () => {
    expect(motivoParaNaoCriarConta(base)).toBeNull();
  });

  it("explica cada impedimento em vez de só desabilitar o botão", () => {
    expect(motivoParaNaoCriarConta({ ...base, uid: "x" })).toMatch(/já tem/i);
    expect(motivoParaNaoCriarConta({ ...base, email: null })).toMatch(
      /e-mail/i,
    );
    expect(motivoParaNaoCriarConta({ ...base, alunosVinculados: [] })).toMatch(
      /vincule/i,
    );
  });

  it("aponta o impedimento mais forte primeiro", () => {
    // Já tendo conta, não interessa se falta e-mail.
    expect(motivoParaNaoCriarConta({ ...base, uid: "x", email: null })).toMatch(
      /já tem/i,
    );
  });
});

describe("ordenarPorNome", () => {
  it("ordena em português ignorando acento", () => {
    expect(ordenarPorNome(lista).map((r) => r.nome)).toEqual([
      "Ivan Drummond Filho",
      "Renata Gobato",
      "Sharisy Colavitti Antunes",
      "Tatiana Perecmanis",
    ]);
  });
});
