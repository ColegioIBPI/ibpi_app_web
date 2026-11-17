import { describe, expect, it } from "vitest";

import {
  codigoDoCurso,
  comCursosDoSistema,
  cursosPadraoFaltando,
  ordenarCursos,
  rotuloDoCurso,
} from "@/features/cursos/domain/curso";

const CADASTRO = [
  { codigo: "medio", nome: "Ensino Médio Regular" },
  { codigo: "tecnico", nome: "Técnico em Informática" },
];

describe("rótulo do curso", () => {
  it("usa o cadastro, que é a verdade do colégio", () => {
    // O colégio renomeou "Ensino Médio" para "Ensino Médio Regular": é o
    // nome do cadastro que vale, não o que estava no código.
    expect(rotuloDoCurso("medio", CADASTRO)).toBe("Ensino Médio Regular");
  });

  it("cai nos rótulos antigos quando o cadastro não veio", () => {
    // Scripts de migração renderizam sem ler o cadastro.
    expect(rotuloDoCurso("medio")).toBe("Ensino Médio");
    expect(rotuloDoCurso("eja-fundamental")).toBe("EJA — Fundamental");
  });

  it("mostra o código em vez de nada quando o curso é desconhecido", () => {
    // Era o buraco de indexar o objeto fixo: curso novo imprimia vazio no
    // boletim e ninguém via até a família reclamar.
    expect(rotuloDoCurso("tecnico")).toBe("tecnico");
    expect(rotuloDoCurso("tecnico", CADASTRO)).toBe("Técnico em Informática");
  });

  it("aluno sem curso mostra travessão, não vazio", () => {
    expect(rotuloDoCurso(null)).toBe("—");
    expect(rotuloDoCurso(undefined)).toBe("—");
    expect(rotuloDoCurso("")).toBe("—");
  });
});

describe("ordem dos cursos", () => {
  it("respeita a ordem do colégio", () => {
    const ordenados = ordenarCursos([
      { codigo: "b", nome: "B", ordem: 20 },
      { codigo: "a", nome: "A", ordem: 10 },
    ]);

    expect(ordenados.map((c) => c.codigo)).toEqual(["a", "b"]);
  });

  it("curso sem ordem vai para o fim, em ordem de nome", () => {
    const ordenados = ordenarCursos([
      { codigo: "z", nome: "Zebra", ordem: null },
      { codigo: "a", nome: "Alfa", ordem: null },
      { codigo: "m", nome: "Meio", ordem: 10 },
    ]);

    expect(ordenados.map((c) => c.codigo)).toEqual(["m", "a", "z"]);
  });

  it("não mexe no array recebido", () => {
    const original = [
      { codigo: "b", nome: "B", ordem: 20 },
      { codigo: "a", nome: "A", ordem: 10 },
    ];
    ordenarCursos(original);

    expect(original.map((c) => c.codigo)).toEqual(["b", "a"]);
  });
});

describe("código a partir do nome", () => {
  it("tira acento, espaço e maiúscula", () => {
    // O código vira id de documento: espaço e barra quebrariam o caminho,
    // e acento faria o mesmo curso ter dois códigos.
    expect(codigoDoCurso("Curso Livre de Redação")).toBe(
      "curso-livre-de-redacao",
    );
    expect(codigoDoCurso("  Ensino Médio  ")).toBe("ensino-medio");
    expect(codigoDoCurso("EJA — Fundamental")).toBe("eja-fundamental");
  });

  it("não deixa traço sobrando nas pontas", () => {
    expect(codigoDoCurso("— Técnico —")).toBe("tecnico");
  });
});

describe("cursos do sistema que faltam no cadastro", () => {
  const padrao = [
    { codigo: "fundamental", nome: "Ensino Fundamental" },
    { codigo: "medio", nome: "Ensino Médio" },
  ];

  it("cadastro vazio: faltam todos", () => {
    expect(cursosPadraoFaltando([], padrao)).toEqual(padrao);
  });

  it("cadastro completo: não falta nenhum", () => {
    expect(
      cursosPadraoFaltando([{ codigo: "fundamental" }, { codigo: "medio" }], padrao),
    ).toEqual([]);
  });

  it("um curso próprio não conta como os do sistema", () => {
    // O defeito que isto corrige: a oferta de gravar os quatro dependia
    // de o cadastro estar **vazio**, então quem criasse um curso próprio
    // antes perdia a oferta para sempre — com turmas apontando para
    // códigos ausentes do cadastro, e o seletor de curso do critério de
    // avaliação sem o que oferecer. Foi o que aconteceu no colégio.
    expect(
      cursosPadraoFaltando([{ codigo: "personalizado" }], padrao),
    ).toEqual(padrao);
  });

  it("gravar parte deles deixa só o resto", () => {
    expect(
      cursosPadraoFaltando([{ codigo: "fundamental" }], padrao).map((c) => c.codigo),
    ).toEqual(["medio"]);
  });
});

describe("o cadastro somado aos cursos do sistema", () => {
  const padrao = [
    { codigo: "fundamental", nome: "Ensino Fundamental", ordem: 10 },
    { codigo: "medio", nome: "Ensino Médio", ordem: 20 },
  ];

  const gravado = (codigo: string, nome: string, extra = {}) => ({
    id: codigo,
    codigo,
    nome,
    sigla: null,
    ordem: null,
    ativo: true,
    origem: "portal" as const,
    ...extra,
  });

  it("criar um curso próprio NÃO faz os outros sumirem", () => {
    // O defeito relatado pela escola: "ao criar um novo curso
    // Personalizado, os outros cursos sumiram da listagem". A lista caía
    // no padrão do código só com o cadastro vazio, tudo ou nada.
    const lista = comCursosDoSistema(
      [gravado("personalizado", "Personalizado")],
      padrao,
    );

    expect(lista.map((c) => c.codigo).sort()).toEqual([
      "fundamental",
      "medio",
      "personalizado",
    ]);
  });

  it("marca quem ainda não é documento", () => {
    const lista = comCursosDoSistema(
      [gravado("personalizado", "Personalizado")],
      padrao,
    );

    expect(lista.find((c) => c.codigo === "personalizado")!.gravado).toBe(true);
    expect(lista.find((c) => c.codigo === "medio")!.gravado).toBe(false);
  });

  it("o cadastro manda: renomeado continua renomeado", () => {
    // Somar não pode ressuscitar o nome do código por cima do que a
    // escola escreveu.
    const lista = comCursosDoSistema(
      [gravado("medio", "Médio (integral)")],
      padrao,
    );

    expect(lista.find((c) => c.codigo === "medio")!.nome).toBe(
      "Médio (integral)",
    );
    expect(lista.filter((c) => c.codigo === "medio")).toHaveLength(1);
  });

  it("curso encerrado não volta como aberto", () => {
    // Ele é documento, então não falta — e `ativo: false` é decisão do
    // colégio, não ausência.
    const lista = comCursosDoSistema(
      [gravado("medio", "Ensino Médio", { ativo: false })],
      padrao,
    );

    expect(lista.find((c) => c.codigo === "medio")!.ativo).toBe(false);
  });

  it("cadastro vazio mostra os do sistema, todos por gravar", () => {
    const lista = comCursosDoSistema([], padrao);

    expect(lista).toHaveLength(2);
    expect(lista.every((c) => !c.gravado)).toBe(true);
  });

  it("a ordem do sistema vale para quem ainda não foi gravado", () => {
    // Sem ela, Fundamental e Médio sairiam em ordem alfabética.
    expect(comCursosDoSistema([], padrao).map((c) => c.codigo)).toEqual([
      "fundamental",
      "medio",
    ]);
  });
});
