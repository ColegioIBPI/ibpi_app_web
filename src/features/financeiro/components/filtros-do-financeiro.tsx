"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { SelectField, TextField } from "@/core/ui/field";

/**
 * Filtros da lista financeira.
 *
 * O estado vive na URL, como no resto do sistema: a busca sobrevive ao
 * recarregar e o link pode ser mandado para outra pessoa da secretaria.
 */
export function FiltrosDoFinanceiro({ turmas }: { turmas: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [termo, setTermo] = useState(searchParams.get("q") ?? "");

  // Espera a digitação parar antes de navegar: sem isso, cada tecla vira uma
  // renderização no servidor.
  useEffect(() => {
    const atual = searchParams.get("q") ?? "";
    if (termo === atual) return;

    const espera = setTimeout(() => atualizar("q", termo), 300);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);

  function atualizar(chave: string, valor: string) {
    const parametros = new URLSearchParams(searchParams.toString());

    if (valor) parametros.set(chave, valor);
    else parametros.delete(chave);

    startTransition(() => {
      router.replace(`${pathname}?${parametros.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_12rem_12rem]">
      <TextField
        label="Buscar"
        placeholder="Nome ou matrícula"
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
      />

      <SelectField
        label="Turma"
        value={searchParams.get("turma") ?? ""}
        onChange={(evento) => atualizar("turma", evento.target.value)}
      >
        <option value="">Todas</option>
        {turmas.map((turma) => (
          <option key={turma} value={turma}>
            {turma}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Situação"
        value={searchParams.get("situacao") ?? "vencidas"}
        onChange={(evento) => atualizar("situacao", evento.target.value)}
      >
        <option value="vencidas">Com parcela vencida</option>
        <option value="em-aberto">Com saldo em aberto</option>
        <option value="todos">Todos os alunos</option>
      </SelectField>
    </div>
  );
}
