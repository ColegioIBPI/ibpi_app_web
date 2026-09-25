import {
  BookMarked,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  RefreshCcw,
  Sparkles,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/core/lib/cn";
import { ROTULOS_DE_INFORMACAO, type TipoDeInformacao } from "@/core/modelo";
import type { InformacaoComId } from "@/features/informacoes/services/informacoes.server";

/**
 * Os cards de informações úteis.
 *
 * Cada card é um **link** para o material — o Portal não hospeda o
 * documento, aponta para onde ele já está. O ícone vem do tipo, que é o que
 * permite a família reconhecer o card sem ler o título inteiro.
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

export function CardsDeInformacao({
  informacoes,
}: {
  informacoes: InformacaoComId[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {informacoes.map((informacao) => {
        const Icone = ICONES[informacao.tipo] ?? FileText;

        return (
          <li key={informacao.id}>
            <a
              href={informacao.url}
              target="_blank"
              // `noopener` impede a página aberta de mexer nesta; `noreferrer`
              // evita contar de onde a família veio.
              rel="noopener noreferrer"
              className={cn(
                "rounded-card border-line bg-surface hover:bg-surface-subtle",
                "flex h-full flex-col gap-2 border p-4",
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <Icone className="text-brand-600 size-5 shrink-0" aria-hidden />
                <ExternalLink
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
            </a>
          </li>
        );
      })}
    </ul>
  );
}
