import { describe, expect, it } from "vitest";

import { ROLES, type Role } from "@/core/auth/roles";
import {
  buscarTopicos,
  destacar,
  ehDoPerfil,
  type Topico,
} from "@/features/ajuda/domain/topico";
import { TOPICOS } from "@/features/ajuda/domain/topicos";

const topico = (campos: Partial<Topico> = {}): Topico => ({
  id: "exemplo",
  titulo: "Liberação do boletim",
  resumo: "A família só vê depois que você libera.",
  perfis: "todos",
  blocos: [{ tipo: "paragrafo", texto: "Três caixas, uma por trimestre." }],
  ...campos,
});

describe("busca", () => {
  it("acha pelo título, sem acento e sem diferenciar maiúsculas", () => {
    expect(buscarTopicos([topico()], "LIBERACAO")).toHaveLength(1);
    expect(buscarTopicos([topico()], "liberação")).toHaveLength(1);
  });

  it("acha pelo corpo, não só pelo título", () => {
    // Quem busca "trimestre" não sabe como o tópico se chama.
    expect(buscarTopicos([topico()], "trimestre")).toHaveLength(1);
  });

  it("exige todas as palavras, em qualquer ordem", () => {
    expect(buscarTopicos([topico()], "boletim familia")).toHaveLength(1);
    expect(buscarTopicos([topico()], "familia boletim")).toHaveLength(1);
    expect(buscarTopicos([topico()], "boletim recibo")).toHaveLength(0);
  });

  it("busca vazia devolve tudo", () => {
    // A tela sem filtro é a lista inteira, não uma tela vazia.
    expect(buscarTopicos([topico(), topico({ id: "outro" })], "")).toHaveLength(2);
    expect(buscarTopicos([topico()], "   ")).toHaveLength(1);
  });

  it("procura também em listas, passos, tabelas e avisos", () => {
    const completo = topico({
      blocos: [
        { tipo: "lista", itens: ["Cancele com motivo"] },
        { tipo: "passos", itens: ["Abra um talão"] },
        { tipo: "tabela", linhas: [{ rotulo: "Série", valor: "A" }] },
        { tipo: "aviso", tom: "cuidado", texto: "O número não volta" },
      ],
    });

    for (const termo of ["motivo", "talão", "série", "volta"]) {
      expect(buscarTopicos([completo], termo)).toHaveLength(1);
    }
  });
});

describe("recorte por função", () => {
  it("tópico de todos vale para qualquer perfil", () => {
    for (const role of ROLES) expect(ehDoPerfil(topico(), role)).toBe(true);
  });

  it("tópico de uma função não entra na lista de outra", () => {
    const recibos = topico({ perfis: ["secretaria", "financeiro"] });

    expect(ehDoPerfil(recibos, "secretaria")).toBe(true);
    expect(ehDoPerfil(recibos, "professor")).toBe(false);
  });
});

describe("destaque dentro da frase", () => {
  it("separa o que está entre asteriscos", () => {
    expect(destacar("O **aluno** não vê")).toEqual([
      { texto: "O ", forte: false },
      { texto: "aluno", forte: true },
      { texto: " não vê", forte: false },
    ]);
  });

  it("texto sem destaque sai inteiro", () => {
    expect(destacar("Nada aqui")).toEqual([{ texto: "Nada aqui", forte: false }]);
  });

  it("asterisco solto não some o texto", () => {
    // O conteúdo é escrito à mão: um destaque esquecido não pode virar
    // conteúdo sumido na tela.
    expect(destacar("2 ** 3 é potência").map((p) => p.texto).join("")).toBe(
      "2 ** 3 é potência",
    );
    expect(destacar("**aberto sem fechar").map((p) => p.texto).join("")).toBe(
      "**aberto sem fechar",
    );
  });
});

describe("o conteúdo publicado", () => {
  it("todo tópico tem id único — o id é o endereço", () => {
    const ids = TOPICOS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo tópico tem título, resumo e corpo", () => {
    for (const t of TOPICOS) {
      expect(t.titulo.trim().length).toBeGreaterThan(0);
      expect(t.resumo.trim().length).toBeGreaterThan(0);
      expect(t.blocos.length).toBeGreaterThan(0);
    }
  });

  it("o id serve como endereço: só minúsculas, números e hífen", () => {
    for (const t of TOPICOS) expect(t.id).toMatch(/^[a-z0-9-]+$/);
  });

  it("todo perfil de gestão encontra alguma coisa", () => {
    // Ajuda que abre vazia para um perfil é pior que ajuda nenhuma: a
    // pessoa conclui que o sistema não tem ajuda.
    const daGestao: Role[] = [
      "admin",
      "secretaria",
      "coordenacao",
      "financeiro",
      "professor",
      "inspetor",
    ];

    for (const role of daGestao) {
      expect(TOPICOS.filter((t) => ehDoPerfil(t, role)).length).toBeGreaterThan(
        0,
      );
    }
  });

  it("os perfis citados existem na matriz", () => {
    // Se um perfil for renomeado, o TypeScript pega aqui — e este teste
    // garante que ninguém contornou o tipo com um texto solto.
    for (const t of TOPICOS) {
      if (t.perfis === "todos") continue;
      for (const perfil of t.perfis) {
        expect(ROLES).toContain(perfil);
      }
    }
  });
});
