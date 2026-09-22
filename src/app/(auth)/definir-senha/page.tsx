import type { Metadata } from "next";

import { DefinirSenhaForm } from "@/features/auth/components/definir-senha-form";

export const metadata: Metadata = { title: "Criar senha" };

export default async function DefinirSenhaPage({
  searchParams,
}: PageProps<"/definir-senha">) {
  // O Firebase manda o código do link no parâmetro `oobCode`.
  const { oobCode } = await searchParams;

  return (
    <DefinirSenhaForm
      codigo={typeof oobCode === "string" ? oobCode : undefined}
    />
  );
}
