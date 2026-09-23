import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { COLECOES } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";
import { FormularioDeAviso } from "@/features/avisos/components/formulario-de-aviso";
import { destinosPermitidos } from "@/features/avisos/domain/destinatarios";

export const metadata: Metadata = { title: "Novo aviso" };

export default async function NovoAvisoPage() {
  const sessao = await exigirPermissao("avisos", "lancar");
  const db = getAdminDb();

  // O professor só escolhe entre as próprias turmas: a ação recusaria outra,
  // e oferecer na tela o que vai ser recusado é uma armadilha.
  const minhasTurmas =
    sessao.role === "professor"
      ? (((await db.collection(COLECOES.users).doc(sessao.uid).get()).data()
          ?.turmas as string[]) ?? [])
      : null;

  const [turmasDocs, alunosDocs, responsaveisDocs] = await Promise.all([
    db.collection(COLECOES.turmas).get(),
    db.collection(COLECOES.alunos).where("ativo", "==", true).get(),
    db.collection(COLECOES.responsaveis).get(),
  ]);

  const turmas = turmasDocs.docs
    .filter((doc) => !minhasTurmas || minhasTurmas.includes(doc.id))
    .map((doc) => ({ valor: doc.id, rotulo: doc.data().codigo as string }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  const alunos = alunosDocs.docs
    .filter(
      (doc) =>
        !minhasTurmas || minhasTurmas.includes(doc.data().turmaId as string),
    )
    .map((doc) => ({
      valor: doc.data().matricula as string,
      rotulo: doc.data().nome as string,
    }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  const responsaveis = responsaveisDocs.docs
    .map((doc) => ({ valor: doc.id, rotulo: doc.data().nome as string }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Novo aviso</h1>
        <p className="text-ink-muted mt-1 text-sm">
          O aviso aparece no Portal de quem for destinatário.
        </p>
      </div>

      <FormularioDeAviso
        destinosPermitidos={destinosPermitidos(sessao.role)}
        turmas={turmas}
        alunos={alunos}
        responsaveis={responsaveis}
      />
    </div>
  );
}
