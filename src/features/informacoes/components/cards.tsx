import {
  BookMarked,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  RefreshCcw,
  Sparkles,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/core/lib/cn";
import { ROTULOS_DE_INFORMACAO, type TipoDeInformacao } from "@/core/modelo";
import type { InformacaoComId } from "@/features/informacoes/services/informacoes.server";

/**
 * Os cards de informações úteis.
 *
 * O card abre o texto **dentro** do Portal, e não um arquivo em outro lugar:
 * é a informação em si que o colégio escreve, e ela chega sem depender de um
 * link continuar no ar nem de a família ter leitor de PDF no celular.
 *
 * O ícone vem do tipo, que é o que permite reconhecer o card sem ler o
 * título inteiro.
 */

const ICONES: Record<TipoDeInformacao, LucideIcon> = {
  "horario-de-aulas": Clock,
  "calendario-de-avaliacao": CalendarRange,
  "calendario-escolar": CalendarDays,
  "criterios-de-avaliacao": ClipboardCheck,
  "proposta-pedagogica": BookMarked,
  dependencias: RefreshCcw,
  eletivas: Sparkles,
  tutoria: UserRoundCheck,
  outros: FileText,
};

/** O ícone do tipo. Tipo desconhecido cai no genérico, não some da tela. */
export function IconeDaInformacao({
  tipo,
  className,
}: {
  tipo: TipoDeInformacao;
  className?: string;
}) {
  const Icone = ICONES[tipo] ?? FileText;

  return <Icone className={className} aria-hidden />;
}

export function CardsDeInformacao({
  informacoes,
}: {
  informacoes: InformacaoComId[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {informacoes.map((informacao) => {
        return (
          <li key={informacao.id}>
            <Link
              href={`/portal/informacoes/${informacao.id}`}
              className={cn(
                "rounded-card border-line bg-surface hover:bg-surface-subtle",
                "flex h-full flex-col gap-2 border p-4",
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <IconeDaInformacao
                  tipo={informacao.tipo}
                  className="text-brand-600 size-5 shrink-0"
                />
                <ChevronRight
                  className="text-ink-muted size-4 shrink-0"
                  aria-hidden
                />
              </span>

              <span className="text-ink font-medium">{informacao.titulo}</span>

              {informacao.descricao && (
                <span className="text-ink-muted text-sm">
                  {informacao.descricao}
                </span>
              )}

              <span className="text-ink-muted mt-auto pt-1 text-xs">
                {ROTULOS_DE_INFORMACAO[informacao.tipo]}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
