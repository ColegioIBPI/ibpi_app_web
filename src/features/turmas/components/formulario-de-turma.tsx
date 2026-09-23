"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  ROTULOS_DE_SEGMENTO,
  ROTULOS_DE_TURNO,
  segmentoSchema,
  turnoSchema,
  type Segmento,
  type Turno,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { SelectField, TextField } from "@/core/ui/field";
import { salvarTurma } from "@/features/turmas/actions/salvar";
import type { TurmaComId } from "@/features/turmas/services/turmas.server";

const schema = z.object({
  codigo: z.string().trim().min(1, "Informe o código da turma"),
  anoLetivo: z.coerce.number().int().min(2000).max(2100),
  segmento: segmentoSchema,
  turno: turnoSchema,
  ativa: z.boolean(),
});

type Formulario = z.input<typeof schema>;

interface FormularioDeTurmaProps {
  turma?: TurmaComId;
  anoLetivoPadrao: number;
}

export function FormularioDeTurma({
  turma,
  anoLetivoPadrao,
}: FormularioDeTurmaProps) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(schema),
    defaultValues: {
      codigo: turma?.codigo ?? "",
      anoLetivo: turma?.anoLetivo ?? anoLetivoPadrao,
      segmento: turma?.segmento ?? "medio",
      turno: turma?.turno ?? "manha",
      ativa: turma?.ativa ?? true,
    },
  });

  async function onSubmit(dados: Formulario) {
    setErro(null);

    const resultado = await salvarTurma(turma?.id ?? null, {
      ...dados,
      anoLetivo: Number(dados.anoLetivo),
    });

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }

    router.push(`/gestao/turmas/${resultado.id}`);
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

      <Card title="Dados da turma">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Código"
            required
            hint="Como a secretaria escreve: EM1A, E.J.A. EF"
            error={errors.codigo?.message}
            {...register("codigo")}
          />
          <TextField
            label="Ano letivo"
            type="number"
            required
            error={errors.anoLetivo?.message}
            {...register("anoLetivo")}
          />
          <SelectField
            label="Segmento"
            error={errors.segmento?.message}
            {...register("segmento")}
          >
            {Object.entries(ROTULOS_DE_SEGMENTO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Turno"
            error={errors.turno?.message}
            {...register("turno")}
          >
            {Object.entries(ROTULOS_DE_TURNO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </SelectField>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="border-line size-4 rounded"
            {...register("ativa")}
          />
          <span className="text-ink">Turma ativa</span>
        </label>

        {turma && (
          <p className="text-ink-muted mt-4 text-xs">
            O identificador da turma ({turma.id}) é formado pelo ano e pelo
            código e não muda na edição — as matrículas apontam para ele.
          </p>
        )}
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

/** Rótulos usados também fora do formulário. */
export const rotuloDeSegmento = (valor: Segmento) => ROTULOS_DE_SEGMENTO[valor];
export const rotuloDeTurno = (valor: Turno) => ROTULOS_DE_TURNO[valor];
