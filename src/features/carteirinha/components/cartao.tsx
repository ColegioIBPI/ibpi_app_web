import { ROTULOS_DE_TURNO, type Turno } from "@/core/modelo";
import { formatDate } from "@/core/lib/format";
import { FotoDoAluno } from "@/features/alunos/components/foto-do-aluno";
import {
  linhaDaTurma,
  type Validade,
} from "@/features/carteirinha/domain/carteirinha";

export interface DadosDoCartao {
  matricula: string;
  nome: string;
  turmaCodigo?: string | null;
  serie?: string | null;
  turno?: Turno | null;
  curso: string;
  dataNascimento?: string | null;
  fotoPath?: string | null;
  fotoAtualizadaEm?: string | null;
}

/**
 * A carteirinha, em forma de cartão.
 *
 * Proporção e peso visual de cartão de verdade, porque é assim que ela
 * será usada: mostrada na tela do celular a alguém que olha de longe por
 * dois segundos. O que esse alguém precisa ler primeiro é **foto, nome e
 * turma** — o resto é confirmação.
 *
 * Imprime junto: a mesma tela vale no papel, e `Ctrl+P` é o caminho de
 * quem prefere a carteirinha física.
 */
export function Cartao({
  aluno,
  anoLetivo,
  validade,
}: {
  aluno: DadosDoCartao;
  anoLetivo: number;
  validade: Validade;
}) {
  return (
    <div className="rounded-card border-line bg-surface max-w-sm overflow-hidden border">
      <header className="bg-brand-600 px-4 py-3 text-white">
        <p className="text-sm font-semibold">Colégio IBPI</p>
        <p className="text-xs text-white/80">
          Carteirinha estudantil · {anoLetivo}
        </p>
      </header>

      {/*
        O aviso vem **antes** dos dados, e não num rodapé: quem mostra o
        cartão controla o que o outro vê primeiro, e um "cancelada" no pé
        da tela não seria lido.
      */}
      {!validade.valida && (
        <p className="border-danger bg-danger-surface text-danger border-b px-4 py-2 text-sm font-medium">
          Sem validade — {validade.motivo}
        </p>
      )}

      <div className="flex gap-4 p-4">
        <FotoDoAluno
          matricula={aluno.matricula}
          nome={aluno.nome}
          fotoPath={aluno.fotoPath}
          fotoAtualizadaEm={aluno.fotoAtualizadaEm}
          tamanho={88}
          // Retangular, como foto de documento — o redondo da listagem é
          // retrato de perfil, e aqui o cartão imita identidade.
          className="rounded-md"
        />

        <div className="min-w-0">
          <p className="text-ink text-base leading-tight font-semibold">
            {aluno.nome}
          </p>
          <p className="text-ink-muted mt-1 text-sm">
            {linhaDaTurma(aluno.turmaCodigo, aluno.serie)}
            {aluno.turno ? ` · ${ROTULOS_DE_TURNO[aluno.turno]}` : ""}
          </p>
          <p className="text-ink-muted text-sm">{aluno.curso}</p>
        </div>
      </div>

      <dl className="border-line grid grid-cols-2 gap-x-4 gap-y-3 border-t px-4 py-3 text-sm">
        <div>
          <dt className="text-ink-muted text-xs">Matrícula</dt>
          <dd className="text-ink tabular-nums">{aluno.matricula}</dd>
        </div>
        <div>
          <dt className="text-ink-muted text-xs">Nascimento</dt>
          <dd className="text-ink tabular-nums">
            {aluno.dataNascimento ? formatDate(aluno.dataNascimento) : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ink-muted text-xs">Validade</dt>
          <dd className={validade.valida ? "text-ink" : "text-danger"}>
            {formatDate(validade.ate)}
          </dd>
        </div>
      </dl>

      {/*
        Sem foto a carteirinha não identifica ninguém, e quem a mostra
        precisa saber disso antes da portaria dizer.
      */}
      {!aluno.fotoPath && (
        <p className="border-line text-ink-muted border-t px-4 py-2 text-xs">
          Sem foto no cadastro. Procure a secretaria para incluir a sua.
        </p>
      )}
    </div>
  );
}
