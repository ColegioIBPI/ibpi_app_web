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
  salvarProfessor,
  type FormularioDeProfessor,
} from "@/features/professores/actions/professores";
import type { ProfessorComId } from "@/features/professores/services/professores.server";

const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  email: z.string().trim(),
  telefone: z.string().trim(),
  cpf: z.string().trim(),
  identidade: z.string().trim(),
  codigoInterno: z.string().trim(),
  horario: z.string().trim(),
  observacoes: z.string().trim(),
  ativo: z.boolean(),
});

export function FormularioDeProfessorComponent({
  professor,
}: {
  professor?: ProfessorComId;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormularioDeProfessor>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: professor?.nome ?? "",
      email: professor?.email ?? "",
      telefone: professor?.telefones?.[0] ?? "",
      cpf: professor?.cpf ?? "",
      identidade: professor?.identidade ?? "",
      codigoInterno: professor?.codigoInterno ?? "",
      horario: professor?.horario ?? "",
      observacoes: professor?.observacoes ?? "",
      ativo: professor?.ativo ?? true,
    },
  });

  async function onSubmit(dados: FormularioDeProfessor) {
    setErro(null);

    const resultado = await salvarProfessor(professor?.id ?? null, dados);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }

    router.push(`/gestao/professores/${resultado.id}`);
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

      <Card title="Dados do professor">
        <div className="grid gap-4">
          <TextField
            label="Nome completo"
            required
            error={errors.nome?.message}
            {...register("nome")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="E-mail"
              type="email"
              hint="É com ele que o professor entra no Portal"
              error={errors.email?.message}
              {...register("email")}
            />
            <TextField
              label="Telefone"
              error={errors.telefone?.message}
              {...register("telefone")}
            />
            <TextField
              label="CPF"
              hint="Com ou sem pontuação"
              error={errors.cpf?.message}
              {...register("cpf")}
            />
            <TextField
              label="Identidade"
              error={errors.identidade?.message}
              {...register("identidade")}
            />
            <TextField
              label="Código interno"
              hint="Opcional, se o colégio usa"
              {...register("codigoInterno")}
            />
            <TextField
              label="Horário"
              hint="Ex.: manhã, seg/qua/sex"
              {...register("horario")}
            />
          </div>

          <TextField label="Observações" {...register("observacoes")} />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="border-line size-4 rounded"
              {...register("ativo")}
            />
            <span className="text-ink">Professor ativo</span>
          </label>

          {!professor && (
            <p className="text-ink-muted text-xs">
              As turmas e disciplinas são definidas depois de salvar, na ficha
              do professor — elas vêm das alocações.
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
