"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Role } from "@/core/auth/roles";
import { Card } from "@/core/ui/card";
import { TextField } from "@/core/ui/field";
import {
  buscarTopicos,
  ehDoPerfil,
  type Topico,
} from "@/features/ajuda/domain/topico";

/**
 * O índice da Ajuda: buscar e escolher.
 *
 * Duas interações, e nenhuma a mais. A busca é o que resolve a dúvida de
 * quem já sabe o que procura ("liberar boletim"); o filtro por função é o
 * que resolve a de quem está aprendendo o sistema e não quer ler sobre
 * recibo nunca.
 *
 * O filtro **nasce ligado** e é desligável em um clique. Ligado por padrão
 * porque a maioria das aberturas é de alguém no meio de uma tarefa; e
 * desligável porque esconder não é o objetivo — quem quiser entender o
 * sistema inteiro tem direito, e o que é segredo não está aqui, está na
 * matriz de acesso.
 */
export function IndiceDaAjuda({
  topicos,
  role,
}: {
  topicos: Topico[];
  role: Role;
}) {
  const [termo, setTermo] = useState("");
  const [soDaMinhaFuncao, setSoDaMinhaFuncao] = useState(true);

  const { encontrados, foraDaFuncao } = useMemo(() => {
    const noEscopo = soDaMinhaFuncao
      ? topicos.filter((topico) => ehDoPerfil(topico, role))
      : topicos;

    return {
      encontrados: buscarTopicos(noEscopo, termo),
      /**
       * Quantos o **filtro de função** escondeu — não quantos a busca
       * deixou de fora.
       *
       * Eram a mesma conta até a tela real mostrar o contrário: a
       * secretaria alcança todos os assuntos, buscou "falta", achou sete
       * e leu "14 fora do filtro". Nenhum estava fora da função dela.
       */
      foraDaFuncao: topicos.length - noEscopo.length,
    };
  }, [topicos, role, soDaMinhaFuncao, termo]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-64 flex-1">
          <TextField
            label="Buscar na ajuda"
            type="search"
            placeholder="boletim, recibo, falta…"
            hint="Procura no texto inteiro, não só no título."
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            className="accent-brand-600 size-4"
            checked={soDaMinhaFuncao}
            onChange={(evento) => setSoDaMinhaFuncao(evento.target.checked)}
          />
          <span className="text-ink">Só o que é da minha função</span>
        </label>
      </div>

      {encontrados.length === 0 ? (
        <Card>
          <p className="text-ink text-sm">
            Nada encontrado para “{termo}”.
            {soDaMinhaFuncao && (
              <>
                {" "}
                Pode estar fora da sua função —{" "}
                <button
                  type="button"
                  className="text-brand-600 underline"
                  onClick={() => setSoDaMinhaFuncao(false)}
                >
                  procurar em todos os assuntos
                </button>
                .
              </>
            )}
          </p>
        </Card>
      ) : (
        <>
          <p className="text-ink-muted text-sm" aria-live="polite">
            {encontrados.length}{" "}
            {encontrados.length === 1 ? "assunto" : "assuntos"}
            {foraDaFuncao > 0
              ? ` · ${foraDaFuncao} de outras funções, fora do filtro`
              : ""}
          </p>

          <ul className="grid gap-3 sm:grid-cols-2">
            {encontrados.map((topico) => (
              <li key={topico.id}>
                <Link
                  href={`/gestao/ajuda/${topico.id}`}
                  className="focus-visible:outline-brand-600 rounded-card block h-full focus-visible:outline-2"
                >
                  <Card className="hover:border-brand-600 h-full transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-ink text-sm font-medium">
                          {topico.titulo}
                        </p>
                        {/*
                          O resumo responde a pergunta na própria lista:
                          boa parte das dúvidas termina aqui, sem abrir.
                        */}
                        <p className="text-ink-muted mt-1 text-sm">
                          {topico.resumo}
                        </p>
                        {topico.onde && (
                          <p className="text-ink-muted mt-2 text-xs">
                            {topico.onde}
                          </p>
                        )}
                      </div>

                      <ArrowRight
                        className="text-ink-muted mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-ink-muted flex items-center gap-1.5 text-xs">
        <Search className="size-3.5" aria-hidden />
        Não achou? Fale com quem administra o sistema — e o que faltar aqui
        entra na próxima versão.
      </p>
    </div>
  );
}
