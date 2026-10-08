import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPermissao } from "@/core/auth/guards";
import { COLECOES, type Aluno } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";
import { NovaSolicitacao } from "@/features/solicitacoes/components/nova-solicitacao";
import { listarDocumentosAtivos } from "@/features/documentos/services/documentos.server";

export const metadata: Metadata = { title: "Nova solicitação" };

export default async function NovaSolicitacaoPage() {
  const sessao = await exigirPermissao("solicitacoes", "lancar");
  const db = getAdminDb();

  // Os filhos vêm da sessão, e não de uma consulta aberta: é o mesmo
  // vínculo que a ação vai conferir ao receber o pedido.
  const alunosDocs = await Promise.all(
    sessao.alunosVinculados.map((matricula) =>
      db.collection(COLECOES.alunos).doc(matricula).get(),
    ),
  );

  const alunos = alunosDocs
    .filter((doc) => doc.exists)
    .map((doc) => ({
      matricula: doc.id,
      nome: (doc.data() as Aluno).nome,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const documentos = (await listarDocumentosAtivos()).map((documento) => ({
    id: documento.id,
    nome: documento.nome,
    descricao: documento.descricao ?? null,
    prazoEmDiasUteis: documento.prazoEmDiasUteis ?? null,
    valor: documento.valor ?? null,
    exigeComprovante: documento.exigeComprovante ?? false,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/portal/solicitacoes"
          className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Solicitações
        </Link>

        <h1 className="text-ink mt-2 text-xl font-semibold">
          Nova solicitação
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          Documentação ou saída antecipada.
        </p>
      </div>

      <NovaSolicitacao alunos={alunos} documentos={documentos} />
    </div>
  );
}
