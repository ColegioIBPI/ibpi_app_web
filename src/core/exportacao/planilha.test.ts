import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  cabecalhosDaPlanilha,
  montarPlanilha,
  nomeDoArquivo,
  type Coluna,
} from "@/core/exportacao/planilha";

interface Linha {
  matricula: string;
  nome: string;
  valor: number | null;
  vencimento: string | null;
  frequencia: number | null;
}

const COLUNAS: Coluna<Linha>[] = [
  { titulo: "Matrícula", tipo: "texto", valor: (l) => l.matricula },
  { titulo: "Aluno", tipo: "texto", valor: (l) => l.nome },
  { titulo: "Valor", tipo: "moeda", valor: (l) => l.valor },
  { titulo: "Vencimento", tipo: "data", valor: (l) => l.vencimento },
  { titulo: "Frequência", tipo: "percentual", valor: (l) => l.frequencia },
];

const LINHAS: Linha[] = [
  {
    matricula: "00042981",
    nome: "Cauã Cananéa",
    valor: 2564.8,
    vencimento: "2026-03-05",
    frequencia: 0.875,
  },
  {
    matricula: "22027",
    nome: "Victorino do Canto",
    valor: null,
    vencimento: null,
    frequencia: null,
  },
];

async function abrir(buffer: Buffer) {
  const livro = new ExcelJS.Workbook();
  await livro.xlsx.load(buffer as unknown as ArrayBuffer);

  return livro;
}

describe("montarPlanilha", () => {
  it("gera um xlsx que o Excel abre", async () => {
    const buffer = await montarPlanilha({
      aba: "Cobranças",
      colunas: COLUNAS,
      linhas: LINHAS,
    });

    const livro = await abrir(buffer);
    expect(livro.worksheets).toHaveLength(1);
    expect(livro.worksheets[0].name).toBe("Cobranças");
  });

  it("escreve o cabeçalho na primeira linha", async () => {
    const livro = await abrir(
      await montarPlanilha({ aba: "X", colunas: COLUNAS, linhas: LINHAS }),
    );

    const cabecalho = livro.worksheets[0].getRow(1);
    expect(cabecalho.getCell(1).value).toBe("Matrícula");
    expect(cabecalho.getCell(2).value).toBe("Aluno");
    expect(cabecalho.font?.bold).toBe(true);
  });

  it("guarda matrícula como texto, preservando o zero à esquerda", async () => {
    // É a razão de ser xlsx e não CSV: no CSV o Excel transforma "00042981"
    // em 42981, e a secretaria perde o número do recibo.
    const livro = await abrir(
      await montarPlanilha({ aba: "X", colunas: COLUNAS, linhas: LINHAS }),
    );

    const celula = livro.worksheets[0].getRow(2).getCell(1);
    expect(celula.value).toBe("00042981");
    expect(typeof celula.value).toBe("string");
  });

  it("guarda dinheiro como número, para a planilha somar", async () => {
    const livro = await abrir(
      await montarPlanilha({ aba: "X", colunas: COLUNAS, linhas: LINHAS }),
    );

    expect(livro.worksheets[0].getRow(2).getCell(3).value).toBe(2564.8);
  });

  it("guarda data como data, não como texto", async () => {
    const livro = await abrir(
      await montarPlanilha({ aba: "X", colunas: COLUNAS, linhas: LINHAS }),
    );

    const celula = livro.worksheets[0].getRow(2).getCell(4).value as Date;
    expect(celula).toBeInstanceOf(Date);
    // Meio-dia local: sem isso o Excel mostraria o dia anterior.
    expect(celula.getFullYear()).toBe(2026);
    expect(celula.getMonth()).toBe(2);
    expect(celula.getDate()).toBe(5);
  });

  it("valor ausente vira célula em branco, não zero nem texto vazio", async () => {
    // Célula em branco filtra e ordena corretamente; "" não, e 0 mentiria.
    const livro = await abrir(
      await montarPlanilha({ aba: "X", colunas: COLUNAS, linhas: LINHAS }),
    );

    const linha = livro.worksheets[0].getRow(3);
    expect(linha.getCell(3).value).toBeNull();
    expect(linha.getCell(4).value).toBeNull();
  });

  it("congela o cabeçalho e liga o filtro", async () => {
    const livro = await abrir(
      await montarPlanilha({ aba: "X", colunas: COLUNAS, linhas: LINHAS }),
    );

    expect(livro.worksheets[0].views[0]).toMatchObject({
      state: "frozen",
      ySplit: 1,
    });
    expect(livro.worksheets[0].autoFilter).toBeTruthy();
  });

  it("planilha sem linha nenhuma ainda traz o cabeçalho", async () => {
    // Exportar um período sem registro tem que devolver a planilha vazia, e
    // não um arquivo quebrado.
    const livro = await abrir(
      await montarPlanilha({ aba: "X", colunas: COLUNAS, linhas: [] }),
    );

    expect(livro.worksheets[0].getRow(1).getCell(1).value).toBe("Matrícula");
    expect(livro.worksheets[0].rowCount).toBe(1);
  });

  it("corta nome de aba maior que o limite do Excel", async () => {
    const livro = await abrir(
      await montarPlanilha({
        aba: "Um nome de aba muito comprido para o Excel aceitar",
        colunas: COLUNAS,
        linhas: [],
      }),
    );

    expect(livro.worksheets[0].name.length).toBeLessThanOrEqual(31);
  });
});

describe("nomeDoArquivo", () => {
  it("carrega a data, para não acumular arquivos iguais na pasta", () => {
    expect(nomeDoArquivo("inadimplencia")).toMatch(
      /^inadimplencia-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
  });

  it("aceita outra extensão", () => {
    expect(nomeDoArquivo("boletim", "pdf")).toMatch(/\.pdf$/);
  });
});

describe("cabecalhosDaPlanilha", () => {
  it("manda baixar, e não abrir na aba", () => {
    const cabecalhos = cabecalhosDaPlanilha("alunos.xlsx") as Record<
      string,
      string
    >;

    expect(cabecalhos["Content-Disposition"]).toContain("attachment");
    expect(cabecalhos["Content-Type"]).toContain("spreadsheetml");
  });

  it("proíbe cache: é dado pessoal de menor", () => {
    const cabecalhos = cabecalhosDaPlanilha("alunos.xlsx") as Record<
      string,
      string
    >;

    expect(cabecalhos["Cache-Control"]).toContain("no-store");
  });
});
