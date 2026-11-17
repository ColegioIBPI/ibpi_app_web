import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { Card } from "@/core/ui/card";
import { CadastroDeCursos } from "@/features/cursos/components/cadastro-de-cursos";
import { cursosPadraoFaltando } from "@/features/cursos/domain/curso";
import { listarCursos } from "@/features/cursos/services/cursos.server";

export const metadata: Metadata = { title: "Cursos" };

export default async function CursosPage() {
  await exigirPermissao("cadastros", "gerenciar");

  const cursos = await listarCursos();

  // Não "o cadastro está vazio?", e sim "falta algum dos que o sistema já
  // usa?". Ver `domain/curso.ts` — a primeira pergunta escondia a oferta
  // de quem criou um curso próprio antes de gravar os quatro.
  const faltando = cursosPadraoFaltando(cursos);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/gestao/configuracoes"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Configurações
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">Cursos</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Ensino Fundamental, Médio, EJA — e o que o colégio abrir. A turma é
          vinculada a um curso no cadastro dela.
        </p>
      </div>

      <Card>
        <CadastroDeCursos cursos={cursos} faltando={faltando} />
      </Card>
    </div>
  );
}
