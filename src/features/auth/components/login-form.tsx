"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import { destinoValido } from "@/features/auth/domain/destino";
import { mensagemDeErroDeAuth } from "@/features/auth/domain/mensagens";
import { loginSchema, type LoginInput } from "@/features/auth/schemas/login";
import { entrar } from "@/features/auth/services/auth-client";

interface LoginFormProps {
  /** Rota que a pessoa tentou abrir antes de ser mandada para o login. */
  continuar?: string;
}

export function LoginForm({ continuar }: LoginFormProps) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", senha: "" },
  });

  async function onSubmit(dados: LoginInput) {
    setErro(null);

    try {
      const rota = await entrar(dados.email, dados.senha);
      // `refresh` descarta o que foi renderizado sem sessão; sem ele, a tela
      // seguinte pode vir do cache do cliente ainda como visitante.
      router.replace(destinoValido(continuar) ?? rota);
      router.refresh();
    } catch (causa) {
      setErro(
        causa instanceof Error && !("code" in causa)
          ? causa.message
          : mensagemDeErroDeAuth(causa),
      );
    }
  }

  return (
    // `noValidate` desliga a validação nativa do navegador. Sem isso, um
    // `type="email"` mal preenchido bloqueia o envio antes do nosso
    // validador rodar, e o usuário vê o balão padrão do navegador — em
    // inglês, com outro visual e sem passar pelas nossas regras.
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
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

      <TextField
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={errors.senha?.message}
        {...register("senha")}
      />

      <Button type="submit" loading={isSubmitting}>
        Entrar
      </Button>

      <Link
        href="/recuperar-senha"
        className="text-brand-600 self-center text-sm hover:underline"
      >
        Esqueci minha senha
      </Link>
    </form>
  );
}
