"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ROLES, rotuloDoPerfil, type Role } from "@/core/auth/roles";
import { Button } from "@/core/ui/button";
import { SelectField, TextField } from "@/core/ui/field";
import { criarContaDeEquipe } from "@/features/usuarios/actions/usuarios";

/** Perfis de equipe. Família nasce no cadastro, com o vínculo junto. */
const DE_EQUIPE: Role[] = ROLES.filter(
  (role) => role !== "aluno" && role !== "responsavel",
);

export function NovaContaDeEquipe() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("professor");
  const [erro, setErro] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function criar() {
    setErro(null);
    setLink(null);
    setSalvando(true);

    try {
      const resultado = await criarContaDeEquipe({ nome, email, role });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível criar a conta.");
        return;
      }

      // A conta nasce sem senha utilizável: quem entra é a pessoa, pelo
      // link. Ninguém da escola chega a conhecer a senha de ninguém.
      setLink(resultado.link ?? null);
      setNome("");
      setEmail("");
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

      {link && (
        <div className="border-line bg-surface-subtle rounded-md border px-3 py-2">
          <p className="text-ink text-sm font-medium">Conta criada</p>
          <p className="text-ink-muted text-xs">
            Passe este link para a pessoa definir a própria senha. Ele é de uso
            único e expira.
          </p>
          <input
            readOnly
            aria-label="Link de primeira senha"
            value={link}
            onFocus={(evento) => evento.target.select()}
            className="border-line bg-surface text-ink mt-2 w-full rounded-md border px-2 py-1 font-mono text-xs"
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Nome completo"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
        />
        <TextField
          label="E-mail"
          type="email"
          hint="É o login."
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
        />
        <SelectField
          label="Perfil"
          value={role}
          onChange={(evento) => setRole(evento.target.value as Role)}
        >
          {DE_EQUIPE.map((opcao) => (
            <option key={opcao} value={opcao}>
              {rotuloDoPerfil(opcao)}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={criar}
          loading={salvando}
          disabled={!nome.trim() || !email.trim()}
        >
          Criar conta
        </Button>
      </div>
    </div>
  );
}
