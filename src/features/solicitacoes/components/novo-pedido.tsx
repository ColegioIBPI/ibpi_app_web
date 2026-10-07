"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatCurrency } from "@/core/lib/format";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { SelectField, TextField } from "@/core/ui/field";
import { abrirPedidoDeDocumentacao } from "@/features/solicitacoes/actions/solicitacoes";

export interface OpcaoDeAluno {
  matricula: string;
  nome: string;
}

export interface OpcaoDeDocumento {
  id: string;
  nome: string;
  descricao: string | null;
  prazoEmDiasUteis: number | null;
  valor: number | null;
  exigeComprovante: boolean;
}

/**
 * Pedido de documentação pela família.
 *
 * O que o documento custa e quanto demora aparece **antes** de enviar, e
 * não depois: é a informação que faz a família decidir se pede, e deixá-la
 * para a confirmação só gera um pedido que será cancelado.
 */
export function NovoPedido({
  alunos,
  documentos,
}: {
  alunos: OpcaoDeAluno[];
  documentos: OpcaoDeDocumento[];
}) {
  const router = useRouter();

  const [matricula, setMatricula] = useState(alunos[0]?.matricula ?? "");
  const [documentoId, setDocumentoId] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const escolhido = documentos.find((doc) => doc.id === documentoId);

  async function enviar() {
    setErro(null);
    setEnviando(true);

    try {
      const resultado = await abrirPedidoDeDocumentacao({
        matricula,
        documentoId,
        observacoes: observacoes.trim() || null,
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível enviar o pedido.");
        return;
      }

      router.push("/portal/solicitacoes");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  if (documentos.length === 0) {
    return (
      <Card>
        <p className="text-ink-muted text-sm">
          A secretaria ainda não publicou documentos para solicitação. Fale com
          ela diretamente.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      <Card title="O pedido">
        <div className="grid gap-4">
          {/* Com um filho só, o seletor não acrescenta nada — mas o nome do
              aluno continua visível, para o pedido não parecer genérico. */}
          {alunos.length > 1 ? (
            <SelectField
              label="Aluno"
              value={matricula}
              onChange={(evento) => setMatricula(evento.target.value)}
            >
              {alunos.map((aluno) => (
                <option key={aluno.matricula} value={aluno.matricula}>
                  {aluno.nome}
                </option>
              ))}
            </SelectField>
          ) : (
            <p className="text-ink-muted text-sm">
              Aluno: <span className="text-ink">{alunos[0]?.nome}</span>
            </p>
          )}

          <SelectField
            label="Documento"
            value={documentoId}
            onChange={(evento) => setDocumentoId(evento.target.value)}
          >
            <option value="">Selecione…</option>
            {documentos.map((documento) => (
              <option key={documento.id} value={documento.id}>
                {documento.nome}
              </option>
            ))}
          </SelectField>

          {escolhido && (
            <div className="border-line bg-surface-subtle rounded-md border p-3 text-sm">
              {escolhido.descricao && (
                <p className="text-ink">{escolhido.descricao}</p>
              )}
              <p className="text-ink-muted mt-1">
                {escolhido.prazoEmDiasUteis === null
                  ? "Prazo a combinar com a secretaria"
                  : escolhido.prazoEmDiasUteis === 0
                    ? "Pronto no mesmo dia"
                    : `Prazo de ${escolhido.prazoEmDiasUteis} ${
                        escolhido.prazoEmDiasUteis === 1
                          ? "dia útil"
                          : "dias úteis"
                      }`}
                {" · "}
                {escolhido.valor === null
                  ? "Gratuito"
                  : formatCurrency(escolhido.valor)}
              </p>

              {escolhido.exigeComprovante && (
                <p className="text-warning mt-2 text-xs">
                  Este documento exige comprovante de pagamento. Leve-o à
                  secretaria na retirada.
                </p>
              )}
            </div>
          )}

          <TextField
            label="Observações"
            hint="Opcional. Para que precisa, ou qualquer detalhe que ajude a secretaria."
            value={observacoes}
            onChange={(evento) => setObservacoes(evento.target.value)}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={enviar} loading={enviando} disabled={!documentoId}>
          Enviar pedido
        </Button>
      </div>
    </div>
  );
}
