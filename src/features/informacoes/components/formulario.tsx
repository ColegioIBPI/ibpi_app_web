"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ESCOPO_USUAL,
  ROTULOS_DE_INFORMACAO,
  tipoDeInformacaoSchema,
  type Destino,
  type TipoDeInformacao,
} from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { SelectField, TextAreaField, TextField } from "@/core/ui/field";
import {
  montarDestino,
  opcoesDoTipo,
  ROTULO_DO_TIPO,
  SeletorDeDestino,
  type OpcaoDeDestino,
} from "@/core/ui/seletor-de-destino";
import { salvarInformacao } from "@/features/informacoes/actions/informacoes";
import type { InformacaoComId } from "@/features/informacoes/services/informacoes.server";

const TIPOS = tipoDeInformacaoSchema.options;
const DESTINOS: Destino["tipo"][] = [
  "todos",
  "segmento",
  "turma",
  "aluno",
  "responsavel",
];

interface FormularioProps {
  turmas: OpcaoDeDestino[];
  alunos: OpcaoDeDestino[];
  responsaveis: OpcaoDeDestino[];
  informacao?: InformacaoComId;
}

/**
 * Publicação de uma informação útil.
 *
 * O tipo **sugere** o destinatário — o colégio publica calendário escolar
 * para todos e horário de aulas por turma. É sugestão, não trava: quem
 * publica pode ter um motivo que o modelo não conhece.
 */
export function FormularioDeInformacao({
  turmas,
  alunos,
  responsaveis,
  informacao,
}: FormularioProps) {
  const router = useRouter();

  const [tipo, setTipo] = useState<TipoDeInformacao>(
    informacao?.tipo ?? "calendario-escolar",
  );
  const [titulo, setTitulo] = useState(
    informacao?.titulo ?? ROTULOS_DE_INFORMACAO["calendario-escolar"],
  );
  const [descricao, setDescricao] = useState(informacao?.descricao ?? "");
  const [conteudo, setConteudo] = useState(informacao?.conteudo ?? "");
  const [url, setUrl] = useState(informacao?.url ?? "");
  const [ordem, setOrdem] = useState(String(informacao?.ordem ?? 0));

  const [destino, setDestino] = useState<Destino["tipo"]>(
    informacao?.destino.tipo ?? ESCOPO_USUAL["calendario-escolar"],
  );
  const [alvo, setAlvo] = useState(alvoInicial(informacao));

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function trocarTipo(novo: TipoDeInformacao) {
    setTipo(novo);
    setDestino(ESCOPO_USUAL[novo]);
    setAlvo("");

    // O título acompanha o tipo enquanto ninguém o personalizou — poupa
    // digitação sem apagar o que a pessoa escreveu.
    if (
      !titulo.trim() ||
      TIPOS.some((t) => ROTULOS_DE_INFORMACAO[t] === titulo)
    ) {
      setTitulo(ROTULOS_DE_INFORMACAO[novo]);
    }
  }

  async function salvar() {
    setErro(null);

    const opcoes = opcoesDoTipo(destino, turmas, alunos, responsaveis);
    const montado = montarDestino(destino, alvo, opcoes);

    if (!montado) {
      return setErro(`Escolha ${ROTULO_DO_TIPO[destino].toLowerCase()}.`);
    }

    setSalvando(true);

    try {
      const resultado = await salvarInformacao({
        id: informacao?.id,
        tipo,
        titulo,
        descricao: descricao.trim() || null,
        conteudo,
        url: url.trim() || null,
        destino: montado,
        ordem: Number(ordem) || 0,
      });

      if (!resultado.ok) {
        return setErro(resultado.erro ?? "Não foi possível salvar.");
      }

      router.push("/gestao/informacoes");
      router.refresh();
    } finally {
      setSalvando(false);
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

      <Card title="O material">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Tipo"
            value={tipo}
            onChange={(evento) =>
              trocarTipo(evento.target.value as TipoDeInformacao)
            }
          >
            {TIPOS.map((opcao) => (
              <option key={opcao} value={opcao}>
                {ROTULOS_DE_INFORMACAO[opcao]}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Título do card"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
          />

          <div className="sm:col-span-2">
            <TextField
              label="Descrição"
              hint="Uma linha, opcional, abaixo do título no card."
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <TextAreaField
              label="Texto"
              required
              rows={12}
              hint="É isto que a família lê ao abrir o card, no Portal e no aplicativo."
              value={conteudo}
              onChange={(evento) => setConteudo(evento.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <TextField
              label="Link complementar"
              type="url"
              inputMode="url"
              placeholder="https://..."
              hint="Opcional, para quando há um material à parte — um calendário em PDF, por exemplo."
              value={url}
              onChange={(evento) => setUrl(evento.target.value)}
            />
          </div>

          <TextField
            label="Ordem"
            type="number"
            hint="Menor aparece primeiro. Use de 10 em 10."
            value={ordem}
            onChange={(evento) => setOrdem(evento.target.value)}
          />
        </div>
      </Card>

      <Card title="Para quem">
        <SeletorDeDestino
          tipos={DESTINOS}
          tipo={destino}
          alvo={alvo}
          turmas={turmas}
          alunos={alunos}
          responsaveis={responsaveis}
          onTipo={setDestino}
          onAlvo={setAlvo}
        />

        {destino !== ESCOPO_USUAL[tipo] && (
          <p className="text-warning mt-3 text-xs">
            O colégio costuma publicar {ROTULOS_DE_INFORMACAO[tipo]} para{" "}
            {ROTULO_DO_TIPO[ESCOPO_USUAL[tipo]].toLowerCase()}. Você escolheu
            outro alcance — quem ficar de fora não verá o card.
          </p>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} loading={salvando}>
          {informacao ? "Salvar alterações" : "Publicar"}
        </Button>
      </div>
    </div>
  );
}

/** O alvo já escolhido, quando se está editando. */
function alvoInicial(informacao?: InformacaoComId): string {
  const destino = informacao?.destino;
  if (!destino) return "";

  switch (destino.tipo) {
    case "segmento":
      return destino.segmento;
    case "turma":
      return destino.turmaId;
    case "aluno":
      return destino.matricula;
    case "responsavel":
      return destino.responsavelId;
    default:
      return "";
  }
}
