import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { continuar } = await searchParams;

  return (
    <>
      <h1 className="text-ink text-lg font-semibold">Entrar no Portal</h1>
      <p className="text-ink-muted mt-1 mb-6 text-sm">
        Use o e-mail cadastrado no colégio.
      </p>

      <LoginForm
        continuar={typeof continuar === "string" ? continuar : undefined}
      />
    </>
  );
}
