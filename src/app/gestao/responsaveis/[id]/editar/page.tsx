import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { exigirPermissao } from "@/core/auth/guards";
import { COLECOES, type Aluno } from "@/core/modelo";
import { getAdminDb } from "@/core/firebase/admin";
import { FormularioDeResponsavel } from "@/features/responsaveis/components/formulario";
import { obterResponsavel } from "@/features/responsaveis/services/responsaveis.server";

export const metadata: Metadata = { title: "Editar responsável" };

export default async function EditarResponsavelPage({
  params,
}: PageProps<"/gestao/responsaveis/[id]/editar">) {
  await exigirPermissao("cadastros", "gerenciar");
  const { id } = await params;

  const responsavel = await obterResponsavel(id);
  if (!responsavel) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Editar responsável</h1>
        <p className="text-ink-muted mt-1 text-sm">
          O vínculo com os alunos é gerenciado na ficha.
        </p>
      </div>

      <FormularioDeResponsavel
        responsavel={responsavel}
        enderecoDoAluno={await enderecoDeUmFilho(responsavel.alunosVinculados)}
      />
    </div>
  );
}

/**
 * O endereço de um dos filhos, para a secretaria copiar.
 *
 * Pega o primeiro vínculo que tiver endereço preenchido: com irmãos na
 * escola o endereço costuma ser o mesmo, e escolher entre dois iguais seria
 * uma pergunta sem resposta interessante.
 */
async function enderecoDeUmFilho(matriculas: readonly string[] | undefined) {
  const db = getAdminDb();

  for (const matricula of matriculas ?? []) {
    const doc = await db.collection(COLECOES.alunos).doc(matricula).get();
    if (!doc.exists) continue;

    const aluno = doc.data() as Aluno;
    const endereco = aluno.contato?.endereco;

    if (!endereco?.logradouro) continue;

    return {
      alunoNome: aluno.nome,
      logradouro: endereco.logradouro ?? "",
      complemento: endereco.complemento ?? "",
      bairro: endereco.bairro ?? "",
      cidade: endereco.cidade ?? "",
      uf: endereco.uf ?? "",
      cep: endereco.cep ?? "",
    };
  }

  return undefined;
}
