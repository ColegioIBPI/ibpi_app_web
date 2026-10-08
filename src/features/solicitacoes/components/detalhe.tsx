import { formatDate } from "@/core/lib/format";
import type { SolicitacaoComId } from "@/features/solicitacoes/services/solicitacoes.server";

/**
 * O que cada tipo de pedido mostra.
 *
 * Fica num componente só, usado pela fila da escola e pela lista da
 * família: as duas telas precisam dizer a mesma coisa sobre o mesmo pedido,
 * e manter dois trechos paralelos é como uma delas deixa de mostrar o
 * acompanhante.
 */

/**
 * O título da linha é o que foi pedido, não a categoria.
 *
 * Sem `default`: quando a 2ª chamada entrar na união, o TypeScript aponta
 * este `switch` como incompleto. Um `default` genérico esconderia isso e a
 * linha nasceria com um título que não diz nada.
 */
export function tituloDaSolicitacao(solicitacao: SolicitacaoComId): string {
  switch (solicitacao.tipo) {
    case "documentacao":
      return solicitacao.documentoNome;
    case "saida-antecipada":
      return `Saída às ${solicitacao.horario} de ${formatDate(solicitacao.data)}`;
  }
}

export function DetalheDaSolicitacao({
  solicitacao,
}: {
  solicitacao: SolicitacaoComId;
}) {
  if (solicitacao.tipo !== "saida-antecipada") return null;

  return (
    <div className="mt-2 text-sm">
      <p className="text-ink">
        <span className="text-ink-muted">Motivo: </span>
        {solicitacao.motivo}
      </p>

      {solicitacao.acompanhada && solicitacao.acompanhante ? (
        <p className="text-ink mt-1">
          <span className="text-ink-muted">Vem buscar: </span>
          {solicitacao.acompanhante.nome}
          <span className="text-ink-muted">
            {" · CPF "}
            {formatarCpf(solicitacao.acompanhante.cpf)}
          </span>
        </p>
      ) : (
        <p className="text-warning mt-1">O aluno sai sozinho.</p>
      )}
    </div>
  );
}

/** `01719425078` → `017.194.250-78`, como a portaria confere no documento. */
function formatarCpf(cpf: string): string {
  return cpf.length === 11
    ? `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
    : cpf;
}
