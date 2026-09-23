"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { TextField } from "@/core/ui/field";
import {
  salvarResponsavel,
  type FormularioDeResponsavel,
} from "@/features/responsaveis/actions/responsaveis";
import type { ResponsavelComId } from "@/features/responsaveis/services/responsaveis.server";

const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  parentesco: z.string().trim(),
  email: z.string().trim(),
  telefone: z.string().trim(),
  cpf: z.string().trim(),
  ativo: z.boolean(),
});

export function FormularioDeResponsavel({
  responsavel,
}: {
  responsavel?: ResponsavelComId;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormularioDeResponsavel>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: responsavel?.nome ?? "",
      parentesco: responsavel?.parentesco ?? "",
      email: responsavel?.email ?? "",
      telefone: responsavel?.telefone ?? "",
      cpf: responsavel?.cpf ?? "",
      ativo: responsavel?.ativo ?? true,
    },
  });

  async function onSubmit(dados: FormularioDeResponsavel) {
    setErro(null);

    const resultado = await salvarResponsavel(responsavel?.id ?? null, dados);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }

    router.push(`/gestao/responsaveis/${resultado.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex max-w-2xl flex-col gap-6"
    >
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      <Card title="Dados do responsável">
        <div className="grid gap-4">
          <TextField
            label="Nome completo"
            required
            error={errors.nome?.message}
            {...register("nome")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Parentesco"
              hint="Mãe, pai, avó…"
              error={errors.parentesco?.message}
              {...register("parentesco")}
            />
            <TextField
              label="CPF"
              hint="Com ou sem pontuação"
              error={errors.cpf?.message}
              {...register("cpf")}
            />
            <TextField
              label="E-mail"
              type="email"
              hint="É com ele que o responsável entra no Portal"
              error={errors.email?.message}
              {...register("email")}
            />
            <TextField
              label="Telefone"
              error={errors.telefone?.message}
              {...register("telefone")}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="border-line size-4 rounded"
              {...register("ativo")}
            />
            <span className="text-ink">Responsável ativo</span>
          </label>

          {!responsavel && (
            <p className="text-ink-muted text-xs">
              O vínculo com os alunos e o acesso ao Portal são definidos depois
              de salvar, na ficha do responsável.
            </p>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
