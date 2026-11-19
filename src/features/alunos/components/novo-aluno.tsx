"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { SelectField, TextField } from "@/core/ui/field";
import { criarAluno } from "@/features/alunos/actions/criar-aluno";

/**
 * Cadastro de um aluno novo — o mínimo para ele existir.
 *
 * A ficha do aluno tem quase cem campos, e pedi-los antes de o aluno
 * existir é como um cadastro fica pela metade: a secretaria atende no
 * balcão, com a família na frente, e precisa do número da matrícula para
 * seguir. O resto ela completa com os papéis na mão, na ficha.
 *
 * **O número não aparece aqui.** Ele é gerado no servidor, a partir do
 * ano letivo em que ela está trabalhando — deixar alguém digitá-lo é como
 * um aluno novo herda o boletim de um que saiu.
 */
export function NovoAluno({
  anoLetivo,
  turmas,
}: {
  anoLetivo: number;
  turmas: Array<{ id: string; codigo: string }>;
}) {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [dataMatricula, setDataMatricula] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function criar() {
    setErro(null);
    setSalvando(true);

    try {
      const resultado = await criarAluno({
        nome,
        dataNascimento,
        cpf,
        turmaId,
        dataMatricula,
      });

      if (!resultado.ok || !resultado.matricula) {
        setErro(resultado.erro ?? "Não foi possível cadastrar.");
        return;
      }

      // Direto para a ficha: é lá que ela completa documentos, contato e
      // filiação, e é lá que o número aparece.
      router.push(`/gestao/alunos/${resultado.matricula}/editar`);
      router.refresh();
    } finally {
      setSalvando(false);
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            label="Nome completo"
            required
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
          />
        </div>

        <TextField
          label="Data de nascimento"
          type="date"
          value={dataNascimento}
          onChange={(evento) => setDataNascimento(evento.target.value)}
        />

        <TextField
          label="CPF"
          hint="Com ou sem pontuação. Pode ficar para depois."
          value={cpf}
          onChange={(evento) => setCpf(evento.target.value)}
        />

        <SelectField
          label="Turma"
          hint={`Turmas de ${anoLetivo}. Pode ficar sem, e definir depois.`}
          value={turmaId}
          onChange={(evento) => setTurmaId(evento.target.value)}
        >
          <option value="">Sem turma por enquanto</option>
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.codigo}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Data de matrícula"
          type="date"
          value={dataMatricula}
          onChange={(evento) => setDataMatricula(evento.target.value)}
        />
      </div>

      <p className="text-ink-muted text-sm">
        A matrícula é gerada automaticamente, no formato do colégio
        (&nbsp;<strong className="text-ink">{String(anoLetivo).slice(-2)}000</strong>&nbsp;),
        e <strong className="text-ink">nunca se repete</strong> — nem quando
        um aluno sai.
      </p>

      <div className="flex justify-end">
        <Button onClick={criar} loading={salvando} disabled={nome.trim().length < 3}>
          <UserPlus className="size-4" aria-hidden />
          Cadastrar aluno
        </Button>
      </div>
    </div>
  );
}
