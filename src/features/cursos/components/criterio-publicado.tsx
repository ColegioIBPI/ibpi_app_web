import type { CriterioComId } from "@/core/modelo";

/**
 * O critério de avaliação como a família lê.
 *
 * Só leitura, e **imprime junto com o boletim**: a pergunta "como essa
 * média foi calculada?" aparece com o boletim na mão, e a resposta numa
 * outra tela não chega a quem imprimiu o papel.
 *
 * Não tem `data-impressao="ocultar"` por isso mesmo.
 */
export function CriterioPublicado({
  criterio,
  semSeparador = false,
}: {
  criterio: CriterioComId | null;
  /**
   * Em "Informações úteis" o critério é o conteúdo do cartão, e o título
   * já está no cabeçalho dele. No boletim ele vem **depois das notas**, e
   * aí precisa do traço e do título para não parecer continuação da
   * tabela.
   */
  semSeparador?: boolean;
}) {
  if (!criterio) return null;

  const periodo = criterio.nomeDoPeriodo.toLowerCase();

  return (
    <section className={semSeparador ? "" : "border-line mt-6 border-t pt-4"}>
      {!semSeparador && (
        <h3 className="text-ink text-sm font-semibold">
          Como o aluno é avaliado
        </h3>
      )}

      <dl className={`grid gap-3 text-sm sm:grid-cols-3 ${semSeparador ? "" : "mt-3"}`}>
        <div>
          <dt className="text-ink-muted text-xs">Períodos</dt>
          <dd className="text-ink">
            {criterio.periodos} {criterio.periodos === 1 ? periodo : `${periodo}s`}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted text-xs">Média mínima</dt>
          <dd className="text-ink tabular-nums">
            {criterio.mediaMinima.toFixed(1).replace(".", ",")}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted text-xs">Frequência mínima</dt>
          <dd className="text-ink tabular-nums">
            {String(criterio.frequenciaMinima).replace(".", ",")}%
          </dd>
        </div>
      </dl>

      {criterio.avaliacoes.length > 0 && (
        <div className="mt-4">
          <p className="text-ink-muted text-xs">
            O que compõe a média do {periodo}
          </p>
          <ul className="divide-line mt-1 divide-y text-sm">
            {criterio.avaliacoes.map((avaliacao, indice) => (
              <li
                key={`${avaliacao.nome}-${indice}`}
                className="flex flex-wrap items-baseline justify-between gap-2 py-1.5"
              >
                <span className="text-ink">
                  {avaliacao.nome}
                  {avaliacao.descricao && (
                    <span className="text-ink-muted block text-xs">
                      {avaliacao.descricao}
                    </span>
                  )}
                </span>
                {avaliacao.peso && (
                  <span className="text-ink-muted text-xs">
                    {avaliacao.peso}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {criterio.comoSeCalcula && (
        <div className="mt-4">
          <p className="text-ink-muted text-xs">Como se calcula</p>
          {/* `whitespace-pre-wrap`: a coordenação escreve uma fórmula por
              linha, e emendá-las tornaria a conta ilegível. */}
          <p className="text-ink mt-0.5 text-sm whitespace-pre-wrap">
            {criterio.comoSeCalcula}
          </p>
        </div>
      )}

      {criterio.recuperacao && (
        <div className="mt-4">
          <p className="text-ink-muted text-xs">Recuperação</p>
          <p className="text-ink mt-0.5 text-sm whitespace-pre-wrap">
            {criterio.recuperacao}
          </p>
        </div>
      )}

      {criterio.observacoes && (
        <p className="text-ink-muted mt-4 text-sm whitespace-pre-wrap">
          {criterio.observacoes}
        </p>
      )}
    </section>
  );
}
