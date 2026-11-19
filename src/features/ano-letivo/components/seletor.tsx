"use client";

import { CalendarRange, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { escolherAnoLetivo } from "@/features/ano-letivo/actions/escolher";

/**
 * Em que ano letivo estou trabalhando.
 *
 * Fica no **menu lateral**, visível em toda tela. Um seletor só na página
 * inicial seria pior que nenhum: a pessoa troca o ano, navega para
 * Boletins e lança nota em 2026 achando que está em 2027 — e nada na tela
 * a contradiz.
 *
 * Quando o ano escolhido **não é o corrente**, ele fica em destaque de
 * aviso. É a diferença entre consultar o histórico e editá-lo sem
 * perceber.
 */
export function SeletorDeAnoLetivo({
  escolhido,
  anos,
  anoCorrente,
}: {
  escolhido: number;
  anos: number[];
  anoCorrente: number;
}) {
  const router = useRouter();
  const [trocando, iniciar] = useTransition();

  const foraDoCorrente = escolhido !== anoCorrente;
  const id = "seletor-de-ano-letivo";

  return (
    <div
      data-impressao="ocultar"
      className={`flex flex-col gap-1 rounded-md border px-2 py-1.5 ${
        foraDoCorrente
          ? "border-warning bg-warning-surface"
          : "border-line bg-surface-subtle"
      }`}
    >
      <label
        htmlFor={id}
        className={`flex items-center gap-1.5 text-[11px] font-medium ${
          foraDoCorrente ? "text-warning" : "text-ink-muted"
        }`}
      >
        {foraDoCorrente ? (
          <TriangleAlert className="size-3.5" aria-hidden />
        ) : (
          <CalendarRange className="size-3.5" aria-hidden />
        )}
        Ano letivo
      </label>

      <select
        id={id}
        value={escolhido}
        disabled={trocando}
        onChange={(evento) => {
          const ano = Number(evento.target.value);

          iniciar(async () => {
            await escolherAnoLetivo(ano);
            // O cookie é lido no servidor: sem o refresh a tela aberta
            // continuaria mostrando o ano anterior.
            router.refresh();
          });
        }}
        className={`h-8 w-full rounded border bg-transparent px-1.5 text-sm font-semibold tabular-nums ${
          foraDoCorrente ? "border-warning text-warning" : "border-line text-ink"
        }`}
      >
        {anos.map((ano) => (
          <option key={ano} value={ano}>
            {ano}
            {ano === anoCorrente ? " (atual)" : ""}
          </option>
        ))}
      </select>

      {foraDoCorrente && (
        <p className="text-warning text-[11px] leading-tight">
          Você está fora do ano corrente. O que lançar aqui entra em{" "}
          {escolhido}.
        </p>
      )}
    </div>
  );
}
