import { exigirArea } from "@/core/auth/guards";
import { AppShell } from "@/core/ui/app-shell";

/**
 * Área de gestão: secretaria, coordenação, financeiro e professor.
 *
 * A verificação acontece aqui, no servidor, antes de qualquer dado ser lido.
 * O `proxy.ts` só olhou se existe cookie.
 */
export default async function GestaoLayout({ children }: LayoutProps<"/">) {
  const sessao = await exigirArea("gestao");

  return <AppShell sessao={sessao}>{children}</AppShell>;
}
