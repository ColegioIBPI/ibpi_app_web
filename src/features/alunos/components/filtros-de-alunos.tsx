"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { SelectField, TextField } from "@/core/ui/field";

interface FiltrosDeAlunosProps {
  turmas: string[];
}

/**
 * Filtros da listagem.
 *
 * O estado vive na URL, não no componente: assim a busca sobrevive ao
 * recarregar, pode ser guardada nos favoritos e mandada por mensagem para
 * outra pessoa da secretaria — "abre esse link, é o aluno que eu falei".
 */
export function FiltrosDeAlunos({ turmas }: FiltrosDeAlunosProps) {
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
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <div className="relative">
        <Search
          className="text-ink-muted pointer-events-none absolute top-[2.15rem] left-3 size-4"
          aria-hidden
        />
        <TextField
          label="Buscar"
          placeholder="Nome ou matrícula"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          className="pl-9"
        />
      </div>

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
        value={searchParams.get("situacao") ?? "ativos"}
        onChange={(evento) => atualizar("situacao", evento.target.value)}
      >
        <option value="ativos">Matriculados</option>
        <option value="inativos">Ex-alunos</option>
        <option value="todos">Todos</option>
      </SelectField>
    </div>
  );
}
