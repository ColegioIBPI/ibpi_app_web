import type { Metadata } from "next";

import { exigirArea } from "@/core/auth/guards";
import { navegacaoPara } from "@/core/auth/navegacao";
import { Card } from "@/core/ui/card";
import { SeletorDeAluno } from "@/features/auth/components/seletor-de-aluno";

export const metadata: Metadata = { title: "Portal" };

export default async function PortalPage() {
  const sessao = await exigirArea("consulta");
  const itens = navegacaoPara(sessao.role);
  const ehResponsavel = sessao.role === "responsavel";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">
          Olá, {sessao.nome.trim().split(/\s+/)[0] || sessao.email}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          {ehResponsavel
            ? "Acompanhe a vida escolar dos seus filhos."
            : "Acompanhe suas notas, faltas e boletim."}
        </p>
      </div>

      {ehResponsavel && sessao.alunosVinculados.length > 0 && (
        <Card title="Aluno">
          <SeletorDeAluno vinculados={sessao.alunosVinculados} />
          {sessao.alunosVinculados.length === 1 && (
            <p className="text-ink-muted text-sm">
              Matrícula {sessao.alunosVinculados[0]}
            </p>
          )}
        </Card>
      )}

      <Card
        title="O que você pode consultar"
        description="As telas entram conforme o sistema avança."
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
