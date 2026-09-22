import { exigirArea } from "@/core/auth/guards";
import { AppShell } from "@/core/ui/app-shell";

/** Área de consulta: aluno e responsável. */
export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const sessao = await exigirArea("consulta");

  return <AppShell sessao={sessao}>{children}</AppShell>;
}
