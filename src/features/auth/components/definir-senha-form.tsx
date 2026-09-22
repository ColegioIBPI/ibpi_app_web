"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import { ErrorState, LoadingState } from "@/core/ui/states";
import { mensagemDeErroDeAuth } from "@/features/auth/domain/mensagens";
import {
  definirSenhaSchema,
  type DefinirSenhaInput,
} from "@/features/auth/schemas/login";
import {
  definirSenha,
  validarCodigoDeSenha,
} from "@/features/auth/services/auth-client";

interface DefinirSenhaFormProps {
  /** Código do link enviado por e-mail pelo Firebase (`oobCode`). */
  codigo?: string;
}

type Estado =
  | { fase: "validando" }
  | { fase: "pronto"; email: string }
  | { fase: "linkInvalido"; mensagem: string }
  | { fase: "concluido" };

/**
 * Tela de primeiro acesso e de troca de senha.
 *
 * É a mesma tela nos dois casos: a secretaria cria a conta com senha
 * aleatória e a pessoa recebe o link para escolher a dela. Assim ninguém da
 * escola chega a conhecer a senha de uma família.
 */
export function DefinirSenhaForm({ codigo }: DefinirSenhaFormProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>(() =>
    codigo
      ? { fase: "validando" }
      : {
          fase: "linkInvalido",
          mensagem: "Abra o link que você recebeu por e-mail.",
        },
  );
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DefinirSenhaInput>({
    resolver: zodResolver(definirSenhaSchema),
    defaultValues: { senha: "", confirmacao: "" },
  });

  useEffect(() => {
    // Link sem código já nasce inválido — resolvido no estado inicial, não
    // aqui, para não disparar uma renderização em cascata.
    if (!codigo) return;

    let cancelado = false;

    // Valida o link antes de mostrar o formulário: é frustrante digitar a
    // senha duas vezes para só então descobrir que o link expirou.
    validarCodigoDeSenha(codigo)
      .then((email) => {
        if (!cancelado) setEstado({ fase: "pronto", email });
      })
      .catch((causa) => {
        if (!cancelado) {
          setEstado({
            fase: "linkInvalido",
            mensagem: mensagemDeErroDeAuth(causa),
          });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [codigo]);

  async function onSubmit(dados: DefinirSenhaInput) {
    if (!codigo) return;
    setErro(null);

    try {
      await definirSenha(codigo, dados.senha);
      setEstado({ fase: "concluido" });
    } catch (causa) {
      setErro(mensagemDeErroDeAuth(causa));
    }
  }

  if (estado.fase === "validando") {
    return <LoadingState title="Verificando o link…" />;
  }

  if (estado.fase === "linkInvalido") {
    return (
      <ErrorState
        title="Link inválido ou expirado"
        description={estado.mensagem}
      >
        <Link
          href="/recuperar-senha"
          className="text-brand-600 text-sm hover:underline"
        >
          Pedir um novo link
        </Link>
      </ErrorState>
    );
  }

  if (estado.fase === "concluido") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-ink text-lg font-semibold">Senha criada</h1>
        <p className="text-ink-muted text-sm">
          Agora é só entrar no Portal com a sua nova senha.
        </p>
        <Button onClick={() => router.replace("/login")}>
          Ir para o login
        </Button>
      </div>
    );
  }

  return (
    // `noValidate`: ver comentário em `login-form.tsx`.
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <div>
        <h1 className="text-ink text-lg font-semibold">Criar sua senha</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Conta: <strong className="text-ink">{estado.email}</strong>
        </p>
      </div>

      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      <TextField
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        autoFocus
        hint="Pelo menos 8 caracteres."
        error={errors.senha?.message}
        {...register("senha")}
      />

      <TextField
        label="Repita a senha"
        type="password"
        autoComplete="new-password"
        error={errors.confirmacao?.message}
        {...register("confirmacao")}
      />

      <Button type="submit" loading={isSubmitting}>
        Salvar senha
      </Button>
    </form>
  );
}
