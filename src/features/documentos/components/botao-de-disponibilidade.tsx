"use client";

import { BotaoDePublicacao } from "@/core/ui/botao-de-publicacao";
import { alterarDisponibilidade } from "@/features/documentos/actions/documentos";

/**
 * Tira o documento da lista da família, ou devolve.
 *
 * Reusa o botão dos avisos e das informações úteis — a mecânica é a mesma —
 * e só troca os rótulos: aqui não se trata de publicar, e sim de o colégio
 * oferecer ou deixar de oferecer aquele documento.
 */
export function BotaoDeDisponibilidade({
  id,
  ativo,
}: {
  id: string;
  ativo: boolean;
}) {
  return (
    <BotaoDePublicacao
      id={id}
      ativo={ativo}
      acao={alterarDisponibilidade}
      rotulos={{
        tirar: "Tirar da lista",
        publicar: "Voltar para a lista",
      }}
    />
  );
}
