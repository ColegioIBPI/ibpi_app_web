"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { SelectField, TextField } from "@/core/ui/field";

/** Filtros da listagem de responsáveis, com o estado na URL. */
export function FiltrosDeResponsaveis() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [termo, setTermo] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const atual = searchParams.get("q") ?? "";
    if (termo === atual) return;

    const tempo = setTimeout(() => atualizar("q", termo), 300);
    return () => clearTimeout(tempo);
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
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <div className="relative">
        <Search
          className="text-ink-muted pointer-events-none absolute top-[2.15rem] left-3 size-4"
          aria-hidden
        />
        <TextField
          label="Buscar"
          placeholder="Nome ou e-mail"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          className="pl-9"
        />
      </div>

      <SelectField
        label="Acesso"
        value={searchParams.get("acesso") ?? "todos"}
        onChange={(evento) => atualizar("acesso", evento.target.value)}
      >
        <option value="todos">Todos</option>
        <option value="com-conta">Com acesso</option>
        <option value="sem-conta">Sem acesso</option>
        <option value="sem-filho">Sem aluno vinculado</option>
      </SelectField>
    </div>
  );
}
