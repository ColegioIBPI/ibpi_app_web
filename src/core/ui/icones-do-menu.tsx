import {
  BookOpen,
  CalendarCheck,
  CircleDot,
  Contact,
  Flag,
  Megaphone,
  NotebookPen,
  Presentation,
  School,
  ScrollText,
  SquarePen,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Ícone de cada item do menu, por rota.
 *
 * Mora aqui, e não em `core/auth/navegacao`, para a matriz de permissões não
 * depender de uma biblioteca de ícones — ela é lida por teste e por código de
 * servidor, e nada disso precisa saber desenhar nada.
 *
 * Um teste garante que todo item do menu tem ícone; o `PADRAO` é só para o
 * caso de uma rota nova chegar antes do ícone dela.
 */

export const PADRAO: LucideIcon = CircleDot;

const ICONES: Record<string, LucideIcon> = {
  "/gestao/alunos": Users,
  "/gestao/responsaveis": Contact,
  "/gestao/professores": Presentation,
  "/gestao/turmas": School,
  "/gestao/disciplinas": BookOpen,
  "/gestao/frequencia": CalendarCheck,
  "/gestao/diario": NotebookPen,
  "/gestao/ocorrencias": Flag,
  "/gestao/notas": SquarePen,
  "/gestao/boletins": ScrollText,
  "/gestao/avisos": Megaphone,
  "/gestao/financeiro": Wallet,

  "/portal/avisos": Megaphone,
  "/portal/boletim": ScrollText,
  "/portal/frequencia": CalendarCheck,
  "/portal/ocorrencias": Flag,
  "/portal/financeiro": Wallet,
};

export function iconeDoMenu(href: string): LucideIcon {
  return ICONES[href] ?? PADRAO;
}

/** Rotas que já têm ícone — usado pelo teste de cobertura do menu. */
export const ROTAS_COM_ICONE = Object.keys(ICONES);
