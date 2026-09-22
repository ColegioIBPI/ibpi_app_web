"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import { mensagemDeErroDeAuth } from "@/features/auth/domain/mensagens";
import {
  recuperarSenhaSchema,
  type RecuperarSenhaInput,
} from "@/features/auth/schemas/login";
import { enviarEmailDeSenha } from "@/features/auth/services/auth-client";

export function RecuperarSenhaForm() {
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarSenhaInput>({
    resolver: zodResolver(recuperarSenhaSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(dados: RecuperarSenhaInput) {
    setErro(null);

    try {
      await enviarEmailDeSenha(dados.email);
    } catch (causa) {
      // Erro de rede ou de limite de tentativas o usuário precisa saber.
      // "E-mail não cadastrado", não — ver a confirmação genérica abaixo.
      const codigo = (causa as { code?: string })?.code;
      if (codigo && codigo !== "auth/user-not-found") {
        setErro(mensagemDeErroDeAuth(causa));
        return;
      }
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-ink text-lg font-semibold">Verifique seu e-mail</h1>
        {/*
          Confirmação propositalmente genérica: dizer "esse e-mail não está
          cadastrado" transformaria esta tela num verificador de quais
          famílias têm conta no colégio.
        */}
        <p className="text-ink-muted text-sm">
          Se esse e-mail estiver cadastrado no colégio, você vai receber em
          instantes um link para criar uma nova senha. O link vale por pouco
          tempo — se demorar para usar, peça outro.
        </p>
        <p className="text-ink-muted text-sm">
          Não chegou? Confira a caixa de spam ou fale com a secretaria.
        </p>
        <Link
          href="/login"
          className="text-brand-600 self-center text-sm hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    // `noValidate`: a validação é a nossa, em português e com o mesmo visual
    // do resto do sistema. Ver comentário em `login-form.tsx`.
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <div>
        <h1 className="text-ink text-lg font-semibold">Recuperar senha</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Enviamos um link para você criar uma nova senha.
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
        label="E-mail"
        type="email"
        autoComplete="username"
        autoFocus
        error={errors.email?.message}
        {...register("email")}
      />

      <Button type="submit" loading={isSubmitting}>
        Enviar link
      </Button>

      <Link
        href="/login"
        className="text-brand-600 self-center text-sm hover:underline"
      >
        Voltar para o login
      </Link>
    </form>
  );
}
