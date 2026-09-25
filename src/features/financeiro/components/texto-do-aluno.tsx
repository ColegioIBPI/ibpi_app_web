"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatDate } from "@/core/lib/format";
import { Button } from "@/core/ui/button";
import { TextAreaField } from "@/core/ui/field";
import {
  salvarAnotacaoFinanceira,
  salvarPlanoAcordado,
  type EntradaDeTexto,
  type ResultadoFinanceiro,
} from "@/features/financeiro/actions/financeiro";

/**
 * Os dois textos livres do financeiro de um aluno.
 *
 * **Plano acordado** é a condição negociada na matrícula, e o responsável
 * lê. **Anotação interna** é o que a equipe precisa lembrar para atender bem
 * — "ligar dia 10", "pai pediu prazo até a folha" —, e a família não lê.
 *
 * Eles moram em coleções separadas porque a Security Rule do Firestore
 * decide por documento, nunca por campo: juntos, seria preciso escolher
 * entre o responsável ler o recado interno ou não ler o próprio plano.
 *
 * A tela dos dois é a mesma — um texto por aluno, com quem escreveu e
 * quando —, então é um componente só, com a ação e os rótulos vindo de
 * fora.
 */

export interface TextoDoAluno {
  texto: string;
  atualizadoPorNome?: string;
  atualizadoEm?: string | null;
}

interface TextoDoAlunoProps {
  matricula: string;
  registro: TextoDoAluno | null;
  podeLancar: boolean;
  rotulo: string;
  dica: string;
  exemplo: string;
  vazio: string;
  botao: string;
  acao: (dados: EntradaDeTexto) => Promise<ResultadoFinanceiro>;
}

function CampoDeTexto({
  matricula,
  registro,
  podeLancar,
  rotulo,
  dica,
  exemplo,
  vazio,
  botao,
  acao,
}: TextoDoAlunoProps) {
  const router = useRouter();

  const [texto, setTexto] = useState(registro?.texto ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    setAviso(null);
    setSalvando(true);

    try {
      const resultado = await acao({ matricula, texto });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível salvar.");
        return;
      }

      setAviso("Salvo.");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  if (!podeLancar) {
    return registro ? (
      <>
        <p className="text-ink text-sm whitespace-pre-wrap">{registro.texto}</p>
        <Assinatura registro={registro} />
      </>
    ) : (
      <p className="text-ink-muted text-sm">{vazio}</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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
        label={rotulo}
        rows={6}
        placeholder={exemplo}
        hint={dica}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />

      {registro && <Assinatura registro={registro} />}

      <div className="flex justify-end">
        <Button onClick={salvar} loading={salvando}>
          {botao}
        </Button>
      </div>
    </div>
  );
}

type UsoProps = Pick<
  TextoDoAlunoProps,
  "matricula" | "registro" | "podeLancar"
>;

export function PlanoAcordado(props: UsoProps) {
  return (
    <CampoDeTexto
      {...props}
      rotulo="Plano acordado"
      dica="O responsável lê este texto no Portal e no aplicativo. Escreva o que foi combinado com a família; o que for recado interno vai na anotação abaixo."
      exemplo={
        "Ex.: Anuidade de R$ 23.076,00 em 12x de R$ 1.923,00, vencendo todo dia 5.\n" +
        "Desconto de 10% para pagamento até o vencimento.\n" +
        "Taxa de material paga à vista na matrícula."
      }
      vazio="Nenhum plano registrado para este aluno."
      botao="Salvar plano"
      acao={salvarPlanoAcordado}
    />
  );
}

export function AnotacaoInterna(props: UsoProps) {
  return (
    <CampoDeTexto
      {...props}
      rotulo="Anotação interna"
      dica="Só a equipe do colégio lê. A família não vê este texto no Portal nem no aplicativo."
      exemplo={
        "Ex.: Ligar dia 10 — o pai recebe no dia 5.\n" +
        "Pediu prazo até a folha de pagamento sair.\n" +
        "Falar com a mãe, não com o pai."
      }
      vazio="Nenhuma anotação para este aluno."
      botao="Salvar anotação"
      acao={salvarAnotacaoFinanceira}
    />
  );
}

function Assinatura({ registro }: { registro: TextoDoAluno }) {
  return (
    <p className="text-ink-muted text-xs">
      Atualizado por {registro.atualizadoPorNome ?? "—"}
      {registro.atualizadoEm ? ` em ${formatDate(registro.atualizadoEm)}` : ""}
    </p>
  );
}
