import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { pode } from "@/core/auth/roles";
import { Card } from "@/core/ui/card";
import { NovaContaDeEquipe } from "@/features/usuarios/components/nova-conta";
import { ListaDeUsuarios } from "@/features/usuarios/components/lista-de-usuarios";
import { administradoresAtivos } from "@/features/usuarios/domain/administracao";
import { listarUsuarios } from "@/features/usuarios/services/usuarios.server";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const sessao = await exigirPermissao("usuarios", "ler");
  const usuarios = await listarUsuarios();

  const podeTrocarPapel = pode(sessao.role, "usuarios", "gerenciar");
  const podeSuspender = pode(sessao.role, "usuarios", "lancar");
  const admins = administradoresAtivos(usuarios);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Usuários</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Quem tem acesso ao sistema, com que perfil e até onde enxerga.{" "}
          {usuarios.length} {usuarios.length === 1 ? "conta" : "contas"}.
        </p>
      </div>

      {/*
        Uma conta de administração só é a porta trancada por dentro: quem a
        perder não tem como criar outra, nem como promover ninguém. O aviso
        fica aqui, onde se resolve.
      */}
      {admins <= 1 && podeTrocarPapel && (
        <p className="border-warning bg-warning-surface text-warning rounded-md border px-3 py-2 text-sm">
          Há apenas <strong>uma conta de administração ativa</strong>. Se o
          acesso a ela se perder, ninguém poderá criar ou promover usuários.
          Promova uma segunda pessoa de confiança.
        </p>
      )}

      <Card>
        <ListaDeUsuarios
          usuarios={usuarios}
          meuUid={sessao.uid}
          podeTrocarPapel={podeTrocarPapel}
          podeSuspender={podeSuspender}
        />
      </Card>

      {podeTrocarPapel && (
        <Card
          title="Nova conta de equipe"
          description="Professor, secretaria, coordenação, financeiro ou administração. Conta de família nasce no cadastro do aluno ou do responsável, onde o vínculo é feito."
        >
          <NovaContaDeEquipe />
        </Card>
      )}
    </div>
  );
}
