import { ROTULOS_SEM_AULA } from "@/core/escola/aulas";
import { formatDate } from "@/core/lib/format";
import type { DiarioAnterior as Anterior } from "@/features/diario/services/diario.server";

/**
 * O diário de quem deu a disciplina antes, em leitura.
 *
 * Nasce **fechado**, num `<details>`: quem abre o diário vem lançar a aula
 * de hoje, e o conteúdo do professor anterior é consulta ocasional. Aberto
 * por padrão, empurraria a grade de aulas para fora da tela todo dia.
 *
 * `<details>` e não um acordeão em React porque não há estado para
 * guardar: o navegador já sabe abrir e fechar, funciona sem JavaScript e
 * **expande sozinho ao imprimir e ao buscar na página** com Ctrl+F.
 */
export function DiarioAnterior({ anteriores }: { anteriores: Anterior[] }) {
  if (anteriores.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {anteriores.map((anterior) => (
        <details
          key={anterior.alocacaoId}
          className="border-line bg-surface rounded-card border open:pb-2"
        >
          <summary className="text-ink cursor-pointer px-4 py-3 text-sm font-medium">
            Diário anterior — {anterior.professorNome}
            <span className="text-ink-muted font-normal">
              {" · "}
              {anterior.aulas.length}{" "}
              {anterior.aulas.length === 1 ? "aula" : "aulas"}
              {/*
                "Ainda leciona" muda o que o leitor faz com a informação:
                com o colega ativo, a conversa resolve; com ele fora da
                escola, este texto é tudo o que restou.
              */}
              {anterior.ativa ? " · ainda leciona" : " · não leciona mais"}
            </span>
          </summary>

          <ol className="divide-line divide-y px-4">
            {anterior.aulas.map((aula) => (
              <li
                key={aula.numero}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm"
              >
                <span className="text-ink-muted w-24 shrink-0 tabular-nums">
                  {aula.numero}ª · {formatDate(aula.data)}
                </span>

                <span className="text-ink min-w-0 flex-1">
                  {aula.semAula ? (
                    <em className="text-ink-muted">
                      {ROTULOS_SEM_AULA[aula.semAula]}
                    </em>
                  ) : (
                    (aula.conteudo ?? (
                      <span className="text-ink-muted">
                        Conteúdo não registrado
                      </span>
                    ))
                  )}
                </span>

                {/*
                  A falta aparece em número, não em lista de nomes: ela
                  continua contando para o aluno pela frequência da
                  disciplina, que soma todos os diários da turma. Aqui ela
                  serve para o professor novo saber como estava a turma,
                  não para reabrir a chamada de quem saiu.
                */}
                {aula.faltas > 0 && (
                  <span className="text-ink-muted shrink-0 text-xs tabular-nums">
                    {aula.faltas} {aula.faltas === 1 ? "falta" : "faltas"}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}
