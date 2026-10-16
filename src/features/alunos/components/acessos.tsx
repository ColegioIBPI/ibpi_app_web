"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Credenciais } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import { salvarCredenciais } from "@/features/alunos/actions/credenciais";

/**
 * Acessos do aluno às plataformas, para a secretaria preencher.
 *
 * A senha começa escondida e tem um botão para revelar. Não é segurança —
 * quem abre a tela já pode ver — é para o balcão: a secretaria atende com
 * a família do outro lado do monitor, e a senha de outro aluno não precisa
 * ficar à mostra enquanto ela digita.
 */
export function AcessosDoAluno({
  matricula,
  credenciais,
}: {
  matricula: string;
  credenciais: Credenciais | null;
}) {
  const router = useRouter();

  const [ibpiOnlineUsuario, setIbpiOnlineUsuario] = useState(
    credenciais?.ibpiOnline?.usuario ?? "",
  );
  const [ibpiOnlineSenha, setIbpiOnlineSenha] = useState(
    credenciais?.ibpiOnline?.senha ?? "",
  );
  const [pluralUsuario, setPluralUsuario] = useState(
    credenciais?.plural?.usuario ?? "",
  );
  const [pluralSenha, setPluralSenha] = useState(
    credenciais?.plural?.senha ?? "",
  );
  const [observacoes, setObservacoes] = useState(
    credenciais?.observacoes ?? "",
  );

  const [mostrando, setMostrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    setAviso(null);
    setSalvando(true);

    try {
      const resultado = await salvarCredenciais({
        matricula,
        ibpiOnlineUsuario: ibpiOnlineUsuario.trim() || null,
        ibpiOnlineSenha: ibpiOnlineSenha.trim() || null,
        pluralUsuario: pluralUsuario.trim() || null,
        pluralSenha: pluralSenha.trim() || null,
        observacoes: observacoes.trim() || null,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return;
      }

      setAviso("Acessos salvos.");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      {aviso && (
        <p className="border-line bg-surface-subtle text-ink-muted rounded-md border px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMostrando((atual) => !atual)}
        >
          {mostrando ? (
            <>
              <EyeOff className="size-4" aria-hidden />
              Ocultar senhas
            </>
          ) : (
            <>
              <Eye className="size-4" aria-hidden />
              Mostrar senhas
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="IBPI Online — usuário"
          hint="Plataforma de aula (Google Classroom)."
          value={ibpiOnlineUsuario}
          onChange={(evento) => setIbpiOnlineUsuario(evento.target.value)}
        />
        <TextField
          label="IBPI Online — senha"
          type={mostrando ? "text" : "password"}
          autoComplete="off"
          value={ibpiOnlineSenha}
          onChange={(evento) => setIbpiOnlineSenha(evento.target.value)}
        />

        <TextField
          label="Plural — usuário"
          hint="Plataforma do material didático."
          value={pluralUsuario}
          onChange={(evento) => setPluralUsuario(evento.target.value)}
        />
        <TextField
          label="Plural — senha"
          type={mostrando ? "text" : "password"}
          autoComplete="off"
          value={pluralSenha}
          onChange={(evento) => setPluralSenha(evento.target.value)}
        />

        <div className="sm:col-span-2">
          <TextField
            label="Observações"
            hint="Opcional. A família lê este texto."
            value={observacoes}
            onChange={(evento) => setObservacoes(evento.target.value)}
          />
        </div>
      </div>

      {credenciais?.atualizadoPorNome && (
        <p className="text-ink-muted text-xs">
          Atualizado por {credenciais.atualizadoPorNome}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={salvar} loading={salvando}>
          Salvar acessos
        </Button>
      </div>
    </div>
  );
}
