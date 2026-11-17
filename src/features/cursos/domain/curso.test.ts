import { describe, expect, it } from "vitest";

import {
  codigoDoCurso,
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
