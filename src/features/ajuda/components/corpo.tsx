import { AlertTriangle, Info } from "lucide-react";

import { destacar, type Bloco, type Texto } from "@/features/ajuda/domain/topico";

/** Um trecho com os destaques resolvidos. */
export function TextoDaAjuda({ texto }: { texto: Texto }) {
  return (
    <>
      {destacar(texto).map((pedaco, indice) =>
        pedaco.forte ? (
          <strong key={indice} className="font-semibold">
            {pedaco.texto}
          </strong>
        ) : (
          <span key={indice}>{pedaco.texto}</span>
        ),
      )}
    </>
  );
}

/**
 * O corpo de um tópico da Ajuda.
 *
 * Largura limitada a `max-w-prose` de propósito: linha longa demais faz o
 * olho perder o começo da seguinte, e este é um texto para ler, não para
 * varrer.
 */
export function CorpoDoTopico({ blocos }: { blocos: Bloco[] }) {
  return (
    <div className="max-w-prose space-y-4">
      {blocos.map((bloco, indice) => (
        <BlocoDaAjuda key={indice} bloco={bloco} />
      ))}
    </div>
  );
}

function BlocoDaAjuda({ bloco }: { bloco: Bloco }) {
  if (bloco.tipo === "paragrafo") {
    return (
      <p className="text-ink text-sm leading-relaxed">
        <TextoDaAjuda texto={bloco.texto} />
      </p>
    );
  }

  if (bloco.tipo === "lista") {
    return (
      <ul className="text-ink list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
        {bloco.itens.map((item, indice) => (
          <li key={indice}>
            <TextoDaAjuda texto={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (bloco.tipo === "passos") {
    return (
      <ol className="text-ink list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
        {bloco.itens.map((item, indice) => (
          <li key={indice}>
            <TextoDaAjuda texto={item} />
          </li>
        ))}
      </ol>
    );
  }

  if (bloco.tipo === "tabela") {
    return (
      <dl className="divide-line border-line divide-y rounded-md border text-sm">
        {bloco.linhas.map((linha, indice) => (
          <div
            key={indice}
            className="grid gap-1 px-3 py-2 sm:grid-cols-[12rem_1fr] sm:gap-3"
          >
            <dt className="text-ink font-medium">
              <TextoDaAjuda texto={linha.rotulo} />
            </dt>
            <dd className="text-ink-muted">
              <TextoDaAjuda texto={linha.valor} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  /*
    O quadro destacado. `cuidado` usa a cor de alerta e `nota` a neutra —
    se tudo fosse vermelho, o que não volta atrás deixaria de saltar.
  */
  const cuidado = bloco.tom === "cuidado";
  const Icone = cuidado ? AlertTriangle : Info;

  return (
    <div
      className={
        cuidado
          ? "border-warning bg-warning-surface text-warning flex gap-2 rounded-md border px-3 py-2 text-sm"
          : "border-line bg-surface-subtle text-ink-muted flex gap-2 rounded-md border px-3 py-2 text-sm"
      }
    >
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="leading-relaxed">
        <TextoDaAjuda texto={bloco.texto} />
      </p>
    </div>
  );
}
