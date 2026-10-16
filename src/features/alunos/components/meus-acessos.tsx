"use client";

import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import type { Credenciais } from "@/core/modelo";
import { Button } from "@/core/ui/button";

/**
 * Os acessos do aluno, para a família consultar.
 *
 * A senha começa escondida — a família costuma abrir isto com o celular na
 * mão, perto de outras pessoas — e tem botão de copiar, porque o uso real é
 * colar na outra plataforma.
 */
export function MeusAcessos({
  credenciais,
  emailDeAcesso,
}: {
  credenciais: Credenciais | null;
  /** O login do Meu IBPI, que é o que costuma faltar. */
  emailDeAcesso: string;
}) {
  const plataformas = [
    {
      nome: "IBPI Online",
      descricao: "Plataforma de aula",
      acesso: credenciais?.ibpiOnline,
    },
    {
      nome: "Plural",
      descricao: "Material didático",
      acesso: credenciais?.plural,
    },
  ].filter((item) => item.acesso?.usuario || item.acesso?.senha);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-line rounded-md border p-3">
        <p className="text-ink text-sm font-medium">Meu IBPI</p>
        <p className="text-ink-muted text-xs">Este Portal e o aplicativo</p>
        <Campo rotulo="E-mail" valor={emailDeAcesso} />
        {/* A senha do Meu IBPI não é mostrada porque não existe em lugar
            nenhum legível: o Firebase guarda só um resumo dela. Quem
            esqueceu redefine, que é mais rápido do que ligar. */}
        <p className="text-ink-muted mt-2 text-xs">
          Esqueceu a senha? Use <strong>Esqueci minha senha</strong> na tela de
          entrada — o link chega no seu e-mail.
        </p>
      </div>

      {plataformas.map((plataforma) => (
        <div
          key={plataforma.nome}
          className="border-line rounded-md border p-3"
        >
          <p className="text-ink text-sm font-medium">{plataforma.nome}</p>
          <p className="text-ink-muted text-xs">{plataforma.descricao}</p>

          {plataforma.acesso?.usuario && (
            <Campo rotulo="Usuário" valor={plataforma.acesso.usuario} />
          )}
          {plataforma.acesso?.senha && (
            <Campo rotulo="Senha" valor={plataforma.acesso.senha} sigiloso />
          )}
        </div>
      ))}

      {credenciais?.observacoes && (
        <p className="text-ink-muted text-sm">{credenciais.observacoes}</p>
      )}

      {plataformas.length === 0 && (
        <p className="text-ink-muted text-sm">
          A secretaria ainda não cadastrou os acessos às plataformas. Fale com
          ela.
        </p>
      )}
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  sigiloso = false,
}: {
  rotulo: string;
  valor: string;
  sigiloso?: boolean;
}) {
  const [revelado, setRevelado] = useState(!sigiloso);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    // Volta ao normal sozinho: um "copiado" permanente deixa de informar.
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="text-sm">
        <span className="text-ink-muted">{rotulo}: </span>
        <span className="text-ink font-mono">
          {revelado ? valor : "••••••••"}
        </span>
      </span>

      <span className="flex items-center gap-1">
        {sigiloso && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={revelado ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setRevelado((atual) => !atual)}
          >
            {revelado ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Copiar ${rotulo.toLowerCase()}`}
          onClick={copiar}
        >
          {copiado ? (
            <Check className="text-success size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
        </Button>
      </span>
    </div>
  );
}
