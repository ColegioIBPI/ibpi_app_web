import ExcelJS from "exceljs";

import { paraData } from "@/core/lib/datas";

/**
 * Geração de planilha `.xlsx`.
 *
 * É `.xlsx` de verdade, e não CSV, por um motivo concreto: o Excel
 * **destrói** texto que parece número. Matrícula `022027` perde o zero à
 * esquerda, recibo `00042981` vira 42981, e `3/12` vira uma data. Aqui cada
 * coluna declara o tipo, e o texto é gravado como texto.
 *
 * As planilhas carregam **dado pessoal de aluno menor de idade**. Quem as
 * gera são as rotas em `app/api/exportacoes/`, que verificam permissão e
 * escopo antes — o arquivo sai por download autenticado, nunca de um
 * endereço público.
 */

export type TipoDeColuna = "texto" | "numero" | "moeda" | "data" | "percentual";

export interface Coluna<T> {
  /** Cabeçalho, como a secretaria lê. */
  titulo: string;
  tipo?: TipoDeColuna;
  largura?: number;
  valor: (linha: T) => string | number | null | undefined;
}

export interface Planilha<T> {
  /** Nome da aba. O Excel limita a 31 caracteres. */
  aba: string;
  colunas: Coluna<T>[];
  linhas: readonly T[];
}

const FORMATOS: Record<TipoDeColuna, string | undefined> = {
  texto: "@",
  numero: "0",
  moeda: 'R$ #,##0.00',
  data: "dd/mm/yyyy",
  percentual: "0.0%",
};

/**
 * Uma aba já pronta para entrar no livro.
 *
 * É uma função, e não um objeto, porque as abas de um mesmo arquivo têm
 * **linhas de tipos diferentes** — a pauta tem uma de chamada e outra de
 * conteúdo. Guardá-las numa lista obrigaria a apagar o tipo das duas.
 */
export type Folha = (livro: ExcelJS.Workbook) => void;

export function aba<T>({ aba, colunas, linhas }: Planilha<T>): Folha {
  return (livro) => adicionarAba(livro, aba, colunas, linhas);
}

/** Um arquivo com uma aba — o caso de quase todos os relatórios. */
export async function montarPlanilha<T>(
  planilha: Planilha<T>,
): Promise<Buffer> {
  return montarLivro(aba(planilha));
}

export async function montarLivro(...folhas: Folha[]): Promise<Buffer> {
  const livro = new ExcelJS.Workbook();
  livro.creator = "Portal IBPI";
  livro.created = new Date();

  for (const folha of folhas) folha(livro);

  const buffer = await livro.xlsx.writeBuffer();

  return Buffer.from(buffer);
}

function adicionarAba<T>(
  livro: ExcelJS.Workbook,
  nome: string,
  colunas: Coluna<T>[],
  linhas: readonly T[],
): void {
  const folha = livro.addWorksheet(nome.slice(0, 31));

  folha.columns = colunas.map((coluna) => ({
    header: coluna.titulo,
    key: coluna.titulo,
    width: coluna.largura ?? Math.max(12, coluna.titulo.length + 2),
    style: { numFmt: FORMATOS[coluna.tipo ?? "texto"] },
  }));

  for (const linha of linhas) {
    folha.addRow(
      colunas.map((coluna) => converter(coluna.valor(linha), coluna.tipo)),
    );
  }

  const cabecalho = folha.getRow(1);
  cabecalho.font = { bold: true };
  cabecalho.alignment = { vertical: "middle" };
  // Cabeçalho congelado: a secretaria rola 73 alunos e 847 parcelas, e sem
  // isto perde de vista qual coluna é qual.
  folha.views = [{ state: "frozen", ySplit: 1 }];
  folha.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: colunas.length },
  };
}

/**
 * Converte o valor para o que o Excel deve guardar na célula.
 *
 * Vazio vira `null`, e não string vazia: célula em branco filtra e ordena
 * corretamente, `""` não.
 */
function converter(
  valor: string | number | null | undefined,
  tipo: TipoDeColuna = "texto",
): string | number | Date | null {
  if (valor === null || valor === undefined || valor === "") return null;

  if (tipo === "data") {
    // `paraData` põe a data ao meio-dia local, senão o Excel mostra o dia
    // anterior em qualquer fuso a oeste de Greenwich.
    return typeof valor === "string" ? paraData(valor) : new Date(valor);
  }

  if (tipo === "numero" || tipo === "moeda" || tipo === "percentual") {
    const numero = typeof valor === "number" ? valor : Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }

  return String(valor);
}

/**
 * Nome do arquivo, com a data para a secretaria não acumular três
 * "inadimplencia.xlsx" na pasta de downloads.
 */
export function nomeDoArquivo(base: string, extensao = "xlsx"): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${base}-${agora.getFullYear()}-${mes}-${dia}.${extensao}`;
}

/** Cabeçalhos de uma resposta de download de planilha. */
export function cabecalhosDaPlanilha(nome: string): HeadersInit {
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${nome}"`,
    // Dado pessoal de menor: nada de cache em proxy nem no navegador.
    "Cache-Control": "no-store, private",
  };
}
