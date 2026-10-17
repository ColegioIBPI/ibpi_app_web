import {
  BookOpen,
  GraduationCap,
  Link2,
  Presentation,
  School,
  ScrollText,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { anoLetivoAtual } from "@/core/lib/ano-letivo";
import { Card } from "@/core/ui/card";

export const metadata: Metadata = { title: "Configurações" };

/**
 * O ponto de partida do ano letivo.
 *
 * As telas de turma, disciplina e professor já existiam, cada uma no seu
 * canto do menu. Elas continuam onde estavam — quem usa todo dia não deveria
 * ter de passar por "Configurações" para abrir a lista de turmas —, e aqui
 * ficam **reunidas na ordem em que o ano é montado**: primeiro o curso,
 * depois a turma que pertence a ele, depois a disciplina, e por fim o
 * professor que leciona aquela disciplina naquela turma.
 *
 * Essa ordem é a informação principal desta página. Quem chega em janeiro
 * sem saber por onde começar erra justamente a sequência: cria turma antes
 * do curso existir, ou aloca professor em disciplina que ninguém cadastrou.
 */

interface Passo {
  href: string;
  titulo: string;
  descricao: string;
  icone: typeof School;
}

const PASSOS: Passo[] = [
  {
    href: "/gestao/configuracoes/cursos",
    titulo: "1. Cursos",
    descricao:
      "Ensino Fundamental, Médio, EJA e o que o colégio abrir. Tudo o mais pendura aqui.",
    icone: GraduationCap,
  },
  {
    href: "/gestao/turmas",
    titulo: "2. Turmas",
    descricao:
      "Código, ano letivo, turno e sala. Cada turma pertence a um curso.",
    icone: School,
  },
  {
    href: "/gestao/disciplinas",
    titulo: "3. Disciplinas",
    descricao:
      "O que se ensina, e em que ordem aparece no boletim.",
    icone: BookOpen,
  },
  {
    href: "/gestao/professores",
    titulo: "4. Professores",
    descricao:
      "O cadastro de quem dá aula, e o acesso dele ao Portal.",
    icone: Presentation,
  },
  {
    href: "/gestao/configuracoes/vinculos",
    titulo: "5. Vínculos",
    descricao:
      "Quem leciona qual disciplina em qual turma. É isto que define o que cada professor enxerga.",
    icone: Link2,
  },
  {
    href: "/gestao/configuracoes/avaliacao",
    titulo: "6. Critérios de avaliação",
    descricao:
      "Pesos, média mínima e frequência do ano, para professores e famílias lerem.",
    icone: ScrollText,
  },
];

export default async function ConfiguracoesPage() {
  await exigirPermissao("cadastros", "gerenciar");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Configurações</h1>
        <p className="text-ink-muted mt-1 text-sm">
          O que se monta no começo do ano letivo, na ordem em que se monta.
          Ano atual: {anoLetivoAtual()}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PASSOS.map((passo) => (
          <Link
            key={passo.href}
            href={passo.href}
            className="focus-visible:outline-brand-600 rounded-card block focus-visible:outline-2"
          >
            <Card className="hover:border-brand-600 h-full transition-colors">
              <div className="flex items-start gap-3">
                <passo.icone
                  className="text-brand-600 mt-0.5 size-5 shrink-0"
                  aria-hidden
                />
                <div>
                  <h2 className="text-ink text-base font-semibold">
                    {passo.titulo}
                  </h2>
                  <p className="text-ink-muted mt-1 text-sm">
                    {passo.descricao}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-ink-muted text-sm">
        Turmas, Disciplinas e Professores continuam no menu lateral: quem
        trabalha nelas todo dia não precisa passar por aqui.
      </p>
    </div>
  );
}
