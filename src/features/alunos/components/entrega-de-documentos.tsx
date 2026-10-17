"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatDate } from "@/core/lib/format";
import {
  DOCUMENTOS_DA_MATRICULA,
  ROTULOS_DE_DOCUMENTO_ENTREGUE,
  type EntregaDeDocumentos,
  type TipoDeDocumentoEntregue,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { TextAreaField } from "@/core/ui/field";
import {
  marcarEntrega,
  salvarObservacoesDaEntrega,
} from "@/features/alunos/actions/entrega";
import {
  ehOpcional,
  resumir,
  type Itens,
} from "@/features/alunos/domain/entrega";

/**
 * A lista que a secretaria risca quando a família entrega o papel.
 *
 * Cada clique grava sozinho, sem botão "salvar": a conferência acontece
 * com a família no balcão, um documento de cada vez, e um formulário que
 * só persiste no fim perderia a marcação de quem foi interrompido no meio
 * do atendimento.
 *
 * A caixa fica **desabilitada enquanto grava** e o estado só muda quando o
 * servidor confirma. Marcar na hora e desfazer no erro mostraria por um
 * instante um "entregue" que não existe — e é exatamente o que a pessoa
 * olha antes de dizer à família que está tudo certo.
 */
export function EntregaDeDocumentosDoAluno({
  matricula,
  entrega,
  podeMarcar,
}: {
  matricula: string;
  entrega: EntregaDeDocumentos | null;
  podeMarcar: boolean;
}) {
  const router = useRouter();

  const itens: Itens = entrega?.itens ?? {};
  const resumo = resumir(itens);

  const [gravando, setGravando] = useState<TipoDeDocumentoEntregue | null>(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(
    tipo: TipoDeDocumentoEntregue,
    entregue: boolean,
  ) {
    setErro(null);
    setGravando(tipo);

    try {
      const resultado = await marcarEntrega({ matricula, tipo, entregue });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível registrar a entrega.");
        return;
      }

      router.refresh();
    } finally {
      setGravando(null);
    }
  }

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

      <p className="text-sm">
        {resumo.completo ? (
          <span className="text-success font-medium">
            Documentação completa
          </span>
        ) : (
          <span className="text-warning font-medium">
            {resumo.faltam === 1
              ? "Falta 1 documento obrigatório"
              : `Faltam ${resumo.faltam} documentos obrigatórios`}
          </span>
        )}
        <span className="text-ink-muted">
          {" · "}
          {resumo.entregues} de {resumo.exigidos} exigidos
        </span>
      </p>

      <ul className="divide-line divide-y">
        {DOCUMENTOS_DA_MATRICULA.map((tipo) => {
          const item = itens[tipo];
          const entregue = item?.entregue === true;

          return (
            <li key={tipo} className="py-2.5">
              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="border-line mt-0.5 size-4 rounded"
                  checked={entregue}
                  disabled={!podeMarcar || gravando !== null}
                  onChange={(evento) => alternar(tipo, evento.target.checked)}
                />
                <span>
                  <span className="text-ink">
                    {ROTULOS_DE_DOCUMENTO_ENTREGUE[tipo]}
                  </span>
                  {ehOpcional(tipo) && (
                    <span className="text-ink-muted ml-2 text-xs">
                      quando houver
                    </span>
                  )}

                  {/* Quem conferiu e quando: é a resposta para "eu já
                      entreguei isso", que é por que a lista existe. */}
                  <span className="text-ink-muted block text-xs">
                    {entregue
                      ? [
                          item?.em ? `Entregue em ${formatDate(item.em)}` : null,
                          item?.porNome ? `conferido por ${item.porNome}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Entregue"
                      : "Não entregue"}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {podeMarcar && (
        <ObservacoesDaEntrega
          matricula={matricula}
          texto={entrega?.observacoes ?? ""}
        />
      )}
    </div>
  );
}

/**
 * O que não cabe em caixa marcada: "a mãe trouxe cópia simples, vai
 * trazer a autenticada", "histórico retido na escola anterior".
 */
function ObservacoesDaEntrega({
  matricula,
  texto,
}: {
  matricula: string;
  texto: string;
}) {
  const router = useRouter();

  const [valor, setValor] = useState(texto);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, comecarSalvamento] = useTransition();

  function salvar() {
    setErro(null);
    setAviso(null);

    comecarSalvamento(async () => {
      const resultado = await salvarObservacoesDaEntrega({
        matricula,
        observacoes: valor.trim() || null,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return;
      }

      setAviso("Observação salva.");
      router.refresh();
    });
  }

  return (
    <div className="border-line flex flex-col gap-3 border-t pt-4">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      {aviso && (
        <p className="border-line bg-surface-subtle text-ink-muted rounded-md border px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      <TextAreaField
        label="Observações da conferência"
        hint="Uso interno da secretaria. A família não lê."
        rows={3}
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
      />

      <div className="flex justify-end">
        <Button size="sm" onClick={salvar} loading={salvando}>
          Salvar observação
        </Button>
      </div>
    </div>
  );
}
