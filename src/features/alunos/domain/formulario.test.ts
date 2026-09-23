import { describe, expect, it } from "vitest";

import {
  formatarLista,
  normalizarTelefones,
  paraAluno,
  paraFormulario,
  parsearLista,
} from "@/features/alunos/domain/formulario";

describe("parsearLista", () => {
  it("separa por vírgula, ponto e vírgula ou quebra de linha", () => {
    expect(parsearLista("a@x.com, b@y.com")).toEqual(["a@x.com", "b@y.com"]);
    expect(parsearLista("a@x.com; b@y.com")).toEqual(["a@x.com", "b@y.com"]);
    expect(parsearLista("a@x.com\nb@y.com")).toEqual(["a@x.com", "b@y.com"]);
  });

  it("descarta item vazio e espaço sobrando", () => {
    expect(parsearLista(" a@x.com ,, ")).toEqual(["a@x.com"]);
    expect(parsearLista("")).toEqual([]);
  });

  it("formata de volta para o campo de texto", () => {
    expect(formatarLista(["a@x.com", "b@y.com"])).toBe("a@x.com, b@y.com");
    expect(formatarLista(undefined)).toBe("");
  });
});

describe("normalizarTelefones", () => {
  it("converte para E.164 qualquer formato digitado", () => {
    expect(normalizarTelefones("(21) 99999-8888, 21988887777")).toEqual([
      "+5521999998888",
      "+5521988887777",
    ]);
  });

  it("mantém como veio o que não dá para normalizar", () => {
    // Número incompleto no cadastro ainda é melhor que campo vazio; a
    // secretaria corrige quando notar.
    expect(normalizarTelefones("99999-8888")).toEqual(["99999-8888"]);
  });
});

describe("paraAluno", () => {
  const formulario = paraFormulario(null);

  it("transforma campo vazio em null, não em string vazia", () => {
    const aluno = paraAluno({ ...formulario, nome: "Alice Vianna" });

    expect(aluno.observacoes).toBeNull();
    expect(aluno.dataNascimento).toBeNull();
    expect(aluno.contato.endereco.cidade).toBeNull();
  });

  it("normaliza CPF digitado com pontuação", () => {
    const aluno = paraAluno({
      ...formulario,
      nome: "Alice Vianna",
      cpf: "017.194.250-78",
    });

    expect(aluno.cpf).toBe("01719425078");
  });

  it("gera a chave de busca a partir do nome", () => {
    // É o que permite achar "Cauã" digitando "caua".
    const aluno = paraAluno({ ...formulario, nome: "Cauã Cananéa" });
    expect(aluno.nomeParaBusca).toBe("CAUA CANANEA");
  });

  it("deixa a UF em maiúsculas", () => {
    const aluno = paraAluno({ ...formulario, nome: "Alice Vianna", uf: "rj" });
    expect(aluno.contato.endereco.uf).toBe("RJ");
  });

  it("não devolve os campos derivados da turma", () => {
    // `turmaId`, `segmento` e `turno` são resolvidos no servidor a partir do
    // código da turma. Devolvê-los aqui como null apagaria dado bom na
    // gravação com merge — foi o bug da primeira versão.
    const aluno = paraAluno({ ...formulario, nome: "Alice Vianna" });

    expect(aluno).not.toHaveProperty("turmaId");
    expect(aluno).not.toHaveProperty("segmento");
    expect(aluno).not.toHaveProperty("turno");
    expect(aluno).not.toHaveProperty("statusOriginal");
    // A foto depende do Storage, que ainda não está ativo.
    expect(aluno).not.toHaveProperty("fotoUrl");
  });
});

describe("ida e volta entre formulário e modelo", () => {
  it("preserva o que foi preenchido", () => {
    const original = paraAluno({
      ...paraFormulario(null),
      nome: "Alice Vianna Fernandes",
      cpf: "01719425078",
      dataNascimento: "2010-01-19",
      emails: "alice@x.com, mae@x.com",
      telefones: "(21) 99999-8888",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      mae: "Renata Gobato",
      observacoes: "Aluna bolsista",
    });

    const volta = paraAluno(paraFormulario(original));

    expect(volta.nome).toBe(original.nome);
    expect(volta.cpf).toBe(original.cpf);
    expect(volta.contato.emails).toEqual(original.contato.emails);
    expect(volta.contato.telefones).toEqual(original.contato.telefones);
    expect(volta.contato.endereco.cidade).toBe(
      original.contato.endereco.cidade,
    );
    expect(volta.filiacao.mae).toBe(original.filiacao.mae);
    expect(volta.observacoes).toBe(original.observacoes);
  });

  it("aluno vazio não vira formulário com 'null' escrito nos campos", () => {
    const formulario = paraFormulario(null);
    expect(Object.values(formulario).every((v) => v !== "null")).toBe(true);
    expect(formulario.ativo).toBe(true);
  });
});
