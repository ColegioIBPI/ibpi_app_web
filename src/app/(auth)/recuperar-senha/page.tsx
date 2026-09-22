import type { Metadata } from "next";

import { RecuperarSenhaForm } from "@/features/auth/components/recuperar-senha-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function RecuperarSenhaPage() {
  return <RecuperarSenhaForm />;
}
