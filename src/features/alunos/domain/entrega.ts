import {
  DOCUMENTOS_DA_MATRICULA,
  OPCIONAIS,
  type Entrega,
  type TipoDeDocumentoEntregue,
} from "@/core/modelo";

/**
 * Como se lê a conferência de documentos de um aluno.
 *
 * A pergunta que a secretaria faz não é "quantos foram entregues", e sim
 * **"falta alguma coisa?"** — e a resposta depende de separar o que é
 * exigido do que é opcional.
 */

export type Itens = Partial<Record<TipoDeDocumentoEntregue, Entrega>>;

export function foiEntregue(itens: Itens, tipo: TipoDeDocumentoEntregue) {
  return itens[tipo]?.entregue === true;
}

export function ehOpcional(tipo: TipoDeDocumentoEntregue): boolean {
  return OPCIONAIS.includes(tipo);
}

/** Os exigidos que ainda não chegaram. É a lista que vira cobrança. */
export function pendentes(itens: Itens): TipoDeDocumentoEntregue[] {
  return DOCUMENTOS_DA_MATRICULA.filter(
    (tipo) => !ehOpcional(tipo) && !foiEntregue(itens, tipo),
  );
}

export interface Resumo {
  /** Entregues, contando os opcionais — é o que a tela mostra. */
  entregues: number;
  /** Quantos são exigidos de todo aluno. */
  exigidos: number;
  faltam: number;
  completo: boolean;
}

export function resumir(itens: Itens): Resumo {
  const exigidos = DOCUMENTOS_DA_MATRICULA.filter(
    (tipo) => !ehOpcional(tipo),
  ).length;

  const faltam = pendentes(itens).length;

  return {
    entregues: DOCUMENTOS_DA_MATRICULA.filter((tipo) =>
      foiEntregue(itens, tipo),
    ).length,
    exigidos,
    faltam,
    // Completo é sobre o que é exigido: um aluno sem laudo médico não está
    // com pendência, e marcar a pasta dele como incompleta para sempre
    // ensinaria a secretaria a ignorar o aviso.
    completo: faltam === 0,
  };
}

/** A marcação a gravar, com quem marcou e quando. */
export function marcar(
  entregue: boolean,
  porNome: string,
  agora = new Date().toISOString(),
): Entrega {
  return {
    entregue,
    // Desmarcar limpa a data: manter a antiga diria que foi entregue num
    // dia em que, segundo a própria marcação, não foi.
    em: entregue ? agora : null,
    porNome: entregue ? porNome : null,
  };
}
