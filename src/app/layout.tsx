import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Portal IBPI",
    template: "%s · Portal IBPI",
  },
  description: "Sistema de gestão escolar do Colégio IBPI",
  // Área restrita: nenhuma página deve ser indexada por buscador.
  robots: { index: false, follow: false },
  // O favicon vem de `src/app/favicon.ico`, detectado pela convenção do
  // App Router — não precisa ser declarado aqui.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
