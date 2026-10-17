"use client";

import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CursoComId } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import {
  alternarCurso,
  criarCurso,
  editarCurso,
  semearCursos,
} from "@/features/cursos/actions/cursos";
import { codigoDoCurso } from "@/features/cursos/domain/curso";

/**
 * Cadastro dos cursos do colégio.
 *
 * O **código não aparece como campo**: ele sai do nome e vira id de
 * documento, referenciado por aluno, turma e boletim. Deixar alguém
 * digitá-lo convidaria a trocar o código de um curso que já tem gente
 * matriculada — e aí todo mundo apontaria para um curso que não existe.
 * O código é mostrado, em cinza, para quem precisa conferir.
 */
export function CadastroDeCursos({
  cursos,
  precisaSemear,
}: {
  cursos: CursoComId[];
  /** O cadastro está vazio: os quatro da tela ainda são o padrão do código. */
  precisaSemear: boolean;
}) {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [ordem, setOrdem] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    setOcupado(true);

    try {
      const resultado = await acao();

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return false;
      }

      router.refresh();
      return true;
    } finally {
      setOcupado(false);
    }
  }

  async function criar() {
    const criou = await executar(() =>
      criarCurso({
        nome,
        sigla: sigla.trim() || null,
        ordem: ordem.trim() ? Number(ordem) : null,
      }),
    );

    if (criou) {
      setNome("");
      setSigla("");
      setOrdem("");
    }
  }

  const codigoPrevisto = codigoDoCurso(nome);

  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      {precisaSemear && (
        <div className="border-line bg-surface-subtle flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
          <p className="text-ink-muted text-sm">
            Estes quatro vêm do código do sistema. Grave-os para poder
            renomeá-los e criar outros.
          </p>
          <Button
            size="sm"
            loading={ocupado}
            onClick={() => executar(semearCursos)}
          >
            Gravar os cursos atuais
          </Button>
        </div>
      )}

      <ul className="divide-line divide-y">
        {cursos.map((curso) =>
          editando === curso.codigo ? (
            <LinhaEmEdicao
              key={curso.codigo}
              curso={curso}
              ocupado={ocupado}
              onCancelar={() => setEditando(null)}
              onSalvar={async (dados) => {
                const salvou = await executar(() =>
                  editarCurso({ codigo: curso.codigo, ...dados }),
                );
                if (salvou) setEditando(null);
              }}
            />
          ) : (
            <li
              key={curso.codigo}
              className="flex flex-wrap items-center justify-between gap-3 py-2.5"
            >
              <div>
                <span className="text-ink text-sm font-medium">
                  {curso.nome}
                </span>
                {curso.sigla && (
                  <span className="text-ink-muted ml-2 text-xs">
                    {curso.sigla}
                  </span>
                )}
                <span className="text-ink-muted block font-mono text-xs">
                  {curso.codigo}
                  {curso.ativo ? "" : " · encerrado"}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={precisaSemear || ocupado}
                  onClick={() => setEditando(curso.codigo)}
                >
                  <Pencil className="size-4" aria-hidden />
                  Renomear
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={precisaSemear || ocupado}
                  onClick={() =>
                    executar(() => alternarCurso(curso.codigo, !curso.ativo))
                  }
                >
                  {curso.ativo ? "Encerrar" : "Reabrir"}
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>

      <div className="border-line flex flex-col gap-3 border-t pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="Nome do curso"
            hint={
              codigoPrevisto
                ? `Código: ${codigoPrevisto}`
                : "O código é gerado a partir do nome."
            }
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
          />
          <TextField
            label="Sigla"
            hint="Opcional."
            value={sigla}
            onChange={(evento) => setSigla(evento.target.value)}
          />
          <TextField
            label="Ordem"
            type="number"
            hint="Menor aparece primeiro. Use de 10 em 10."
            value={ordem}
            onChange={(evento) => setOrdem(evento.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            loading={ocupado}
            disabled={!nome.trim()}
            onClick={criar}
          >
            Cadastrar curso
          </Button>
        </div>
      </div>

      <p className="text-ink-muted text-xs">
        O código não muda depois de criado: é por ele que aluno, turma e
        boletim apontam para o curso. Curso encerrado some dos seletores e
        continua valendo no histórico de quem já se formou.
      </p>
    </div>
  );
}

function LinhaEmEdicao({
  curso,
  ocupado,
  onSalvar,
  onCancelar,
}: {
  curso: CursoComId;
  ocupado: boolean;
  onSalvar: (dados: {
    nome: string;
    sigla: string | null;
    ordem: number | null;
  }) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(curso.nome);
  const [sigla, setSigla] = useState(curso.sigla ?? "");
  const [ordem, setOrdem] = useState(
    curso.ordem == null ? "" : String(curso.ordem),
  );

  return (
    <li className="py-2.5">
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Nome do curso"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
        />
        <TextField
          label="Sigla"
          value={sigla}
          onChange={(evento) => setSigla(evento.target.value)}
        />
        <TextField
          label="Ordem"
          type="number"
          value={ordem}
          onChange={(evento) => setOrdem(evento.target.value)}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-ink-muted font-mono text-xs">{curso.codigo}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancelar}>
            <X className="size-4" aria-hidden />
            Cancelar
          </Button>
          <Button
            size="sm"
            loading={ocupado}
            onClick={() =>
              onSalvar({
                nome,
                sigla: sigla.trim() || null,
                ordem: ordem.trim() ? Number(ordem) : null,
              })
            }
          >
            <Check className="size-4" aria-hidden />
            Salvar
          </Button>
        </div>
      </div>
    </li>
  );
}
