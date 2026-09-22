import Image from "next/image";

import { Card } from "@/core/ui/card";

/**
 * Página inicial provisória.
 *
 * Na FASE 2 ela passa a redirecionar para `/login` (ou para a área do perfil,
 * se já houver sessão). Por enquanto confirma que build, tema e assets da
 * marca estão de pé.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12">
      <Card className="text-center">
        <Image
          src="/brand/logo-ibpi.png"
          alt="Colégio IBPI"
          width={240}
          height={109}
          priority
          className="mx-auto h-auto w-60"
        />
        <h1 className="text-brand-700 mt-6 text-xl font-semibold">
          Portal IBPI
        </h1>
        <p className="text-ink-muted mt-2 text-sm">
          Sistema de gestão escolar do Colégio IBPI. O acesso é restrito à
          comunidade escolar e a tela de login entra na próxima fase.
        </p>
      </Card>
    </main>
  );
}
