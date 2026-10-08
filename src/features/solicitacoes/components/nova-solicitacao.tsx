"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatCurrency } from "@/core/lib/format";
import {
  ROTULOS_DE_TIPO_DE_SOLICITACAO,
  type TipoDeSolicitacao,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { SelectField, TextField } from "@/core/ui/field";
import {
  abrirPedidoDeDocumentacao,
  abrirPedidoDeSaida,
} from "@/features/solicitacoes/actions/solicitacoes";

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

/** Os tipos que a família pode abrir hoje. A 2ª chamada entra depois. */
const TIPOS: TipoDeSolicitacao[] = ["documentacao", "saida-antecipada"];

/**
 * Abertura de um pedido pela família.
 *
 * Aluno e observações são comuns aos tipos; o resto do formulário muda com
 * a escolha. Um componente só, com os campos variando, porque a decisão
 * "para qual aluno" é a mesma em todos e duplicá-la é como um dos
 * formulários passa a tratá-la diferente.
 */
export function NovaSolicitacao({
  alunos,
  documentos,
}: {
  alunos: OpcaoDeAluno[];
  documentos: OpcaoDeDocumento[];
}) {
  const router = useRouter();

  const [tipo, setTipo] = useState<TipoDeSolicitacao>("documentacao");
  const [matricula, setMatricula] = useState(alunos[0]?.matricula ?? "");
  const [observacoes, setObservacoes] = useState("");

  const [documentoId, setDocumentoId] = useState("");

  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [motivo, setMotivo] = useState("");
  const [acompanhada, setAcompanhada] = useState(false);
  const [nomeDeQuemBusca, setNomeDeQuemBusca] = useState("");
  const [cpfDeQuemBusca, setCpfDeQuemBusca] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const escolhido = documentos.find((doc) => doc.id === documentoId);

  const pronto =
    tipo === "documentacao"
      ? Boolean(documentoId)
      : Boolean(data && horario && motivo.trim());

  async function enviar() {
    setErro(null);
    setEnviando(true);

    try {
      const resultado =
        tipo === "documentacao"
          ? await abrirPedidoDeDocumentacao({
              matricula,
              documentoId,
              observacoes: observacoes.trim() || null,
            })
          : await abrirPedidoDeSaida({
              matricula,
              data,
              horario,
              motivo: motivo.trim(),
              acompanhada,
              acompanhante: acompanhada
                ? {
                    nome: nomeDeQuemBusca.trim(),
                    // O CPF chega com ponto e traço do teclado do celular; o
                    // modelo guarda só os onze dígitos.
                    cpf: cpfDeQuemBusca.replace(/\D/g, ""),
                  }
                : null,
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
          <SelectField
            label="Tipo de solicitação"
            value={tipo}
            onChange={(evento) =>
              setTipo(evento.target.value as TipoDeSolicitacao)
            }
          >
            {TIPOS.map((opcao) => (
              <option key={opcao} value={opcao}>
                {ROTULOS_DE_TIPO_DE_SOLICITACAO[opcao]}
              </option>
            ))}
          </SelectField>

          {/* Com um filho só o seletor não acrescenta nada — mas o nome
              continua visível, para o pedido não parecer genérico. */}
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

          {tipo === "documentacao" ? (
            <>
              {documentos.length === 0 ? (
                <p className="text-ink-muted text-sm">
                  A secretaria ainda não publicou documentos para solicitação.
                  Fale com ela diretamente.
                </p>
              ) : (
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
              )}

              {/* Prazo e valor aparecem antes de enviar, e não depois: é o
                  que faz a família decidir se pede. */}
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
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Data da saída"
                  type="date"
                  required
                  value={data}
                  onChange={(evento) => setData(evento.target.value)}
                />
                <TextField
                  label="Horário"
                  type="time"
                  required
                  value={horario}
                  onChange={(evento) => setHorario(evento.target.value)}
                />
              </div>

              <TextField
                label="Motivo"
                required
                hint="A coordenação decide com base nele."
                placeholder="Ex.: consulta médica"
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
              />

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="border-line mt-0.5 size-4 rounded"
                  checked={acompanhada}
                  onChange={(evento) => setAcompanhada(evento.target.checked)}
                />
                <span>
                  <span className="text-ink">Alguém vem buscar o aluno</span>
                  <span className="text-ink-muted block text-xs">
                    Desmarque se ele sai sozinho.
                  </span>
                </span>
              </label>

              {acompanhada && (
                <div className="border-line grid gap-4 rounded-md border p-3 sm:grid-cols-2">
                  <TextField
                    label="Nome de quem vem buscar"
                    required
                    value={nomeDeQuemBusca}
                    onChange={(evento) =>
                      setNomeDeQuemBusca(evento.target.value)
                    }
                  />
                  <TextField
                    label="CPF"
                    required
                    inputMode="numeric"
                    hint="Quem recebe na portaria não conhece a família de vista."
                    value={cpfDeQuemBusca}
                    onChange={(evento) =>
                      setCpfDeQuemBusca(evento.target.value)
                    }
                  />
                </div>
              )}
            </>
          )}

          <TextField
            label="Observações"
            hint="Opcional. Qualquer detalhe que ajude a escola."
            value={observacoes}
            onChange={(evento) => setObservacoes(evento.target.value)}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={enviar} loading={enviando} disabled={!pronto}>
          Enviar pedido
        </Button>
      </div>
    </div>
  );
}
