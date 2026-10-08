import { cn } from "@/core/lib/cn";
import {
  ROTULOS_DE_SOLICITACAO,
  type SituacaoDaSolicitacao,
} from "@/core/modelo";

/**
 * A situação do pedido, com a mesma cor nas duas telas.
 *
 * "Pronta" é verde porque é a boa notícia que a família procura na lista;
 * "recusada" é vermelha e "cancelada" é neutra — recusa é a escola dizendo
 * não, cancelamento é a própria família desistindo, e misturar as duas na
 * mesma cor faria a segunda parecer uma reprovação.
 */
const CORES: Record<SituacaoDaSolicitacao, string> = {
  aberta: "bg-surface-subtle text-ink-muted",
  "em-andamento": "bg-warning-surface text-warning",
  pronta: "bg-success-surface text-success",
  autorizada: "bg-success-surface text-success",
  entregue: "bg-surface-subtle text-ink-muted",
  recusada: "bg-danger-surface text-danger",
  cancelada: "bg-surface-subtle text-ink-muted",
};

export function Situacao({ situacao }: { situacao: SituacaoDaSolicitacao }) {
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap",
        CORES[situacao],
      )}
    >
      {ROTULOS_DE_SOLICITACAO[situacao]}
    </span>
  );
}
