import type { Metadata } from "next";

import { navegacaoPara } from "@/core/auth/navegacao";
import { rotuloDoPerfil } from "@/core/auth/roles";
import { exigirArea } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";

export const metadata: Metadata = { title: "Gestão" };

export default async function GestaoPage() {
  const sessao = await exigirArea("gestao");
  const itens = navegacaoPara(sessao.role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">
          Olá, {primeiroNome(sessao)}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          Você está conectado como {rotuloDoPerfil(sessao.role)}.
        </p>
      </div>

      <Card
        title="Seus módulos"
        description="O que o seu perfil tem acesso neste sistema."
      >
        <ul className="divide-line divide-y">
          {itens.map((item) => (
            <li
              key={item.href}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="text-ink">{item.rotulo}</span>
              <span className="text-ink-muted text-xs">
                {item.disponivel ? "disponível" : "em desenvolvimento"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function primeiroNome({ nome, email }: { nome: string; email: string }) {
  return nome.trim().split(/\s+/)[0] || email;
}
