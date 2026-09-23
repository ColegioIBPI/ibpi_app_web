"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { SelectField, TextField } from "@/core/ui/field";

/** Turma e data da chamada, guardados na URL para o link ser compartilhável. */
export function SeletorDaChamada({
  turmas,
  turmaId,
  data,
}: {
  turmas: { id: string; codigo: string }[];
  turmaId: string | null;
  data: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function atualizar(chave: string, valor: string) {
    const parametros = new URLSearchParams(searchParams.toString());
    parametros.set(chave, valor);

    startTransition(() => {
      router.replace(`${pathname}?${parametros.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        label="Turma"
        value={turmaId ?? ""}
        onChange={(evento) => atualizar("turma", evento.target.value)}
      >
        {turmas.map((turma) => (
          <option key={turma.id} value={turma.id}>
            {turma.codigo}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Data"
        type="date"
        value={data}
        onChange={(evento) => atualizar("data", evento.target.value)}
      />
    </div>
  );
}
