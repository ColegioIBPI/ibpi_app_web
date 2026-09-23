"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { TextField } from "@/core/ui/field";
import { salvarAluno } from "@/features/alunos/actions/salvar-aluno";
import {
  formularioDoAlunoSchema,
  paraFormulario,
  type FormularioDoAluno,
} from "@/features/alunos/domain/formulario";
import type { AlunoComId } from "@/features/alunos/services/alunos.server";

interface FormularioDoAlunoProps {
  aluno: AlunoComId;
}

/**
 * Edição do cadastro, nos mesmos blocos da ficha.
 *
 * E-mails e telefones são campos de texto separados por vírgula: digitar é
 * mais rápido que clicar em "adicionar" a cada item, e a secretaria trabalha
 * no teclado. A conversão para lista está em `domain/formulario.ts`.
 */
export function FormularioDoAluno({ aluno }: FormularioDoAlunoProps) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormularioDoAluno>({
    resolver: zodResolver(formularioDoAlunoSchema),
    defaultValues: paraFormulario(aluno),
  });

  async function onSubmit(dados: FormularioDoAluno) {
    setErro(null);

    const resultado = await salvarAluno(aluno.matricula, dados);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }

    router.push(`/gestao/alunos/${aluno.matricula}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Identificação">
          <div className="grid gap-4">
            <TextField
              label="Nome completo"
              required
              error={errors.nome?.message}
              {...register("nome")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Data de nascimento"
                type="date"
                error={errors.dataNascimento?.message}
                {...register("dataNascimento")}
              />
              <TextField
                label="CPF"
                hint="Com ou sem pontuação"
                error={errors.cpf?.message}
                {...register("cpf")}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="border-line size-4 rounded"
                {...register("ativo")}
              />
              <span className="text-ink">Matriculado</span>
              <span className="text-ink-muted text-xs">
                desmarque para ex-aluno; o histórico é preservado
              </span>
            </label>
          </div>
        </Card>

        <Card title="Matrícula">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Turma"
              hint="Ex.: EM1A"
              error={errors.turmaCodigo?.message}
              {...register("turmaCodigo")}
            />
            <TextField
              label="Série"
              error={errors.serie?.message}
              {...register("serie")}
            />
            <TextField
              label="Data da matrícula"
              type="date"
              error={errors.dataMatricula?.message}
              {...register("dataMatricula")}
            />
          </div>
        </Card>

        <Card title="Contato">
          <div className="grid gap-4">
            <TextField
              label="E-mails"
              hint="Separe por vírgula"
              error={errors.emails?.message}
              {...register("emails")}
            />
            <TextField
              label="Telefones"
              hint="Separe por vírgula"
              error={errors.telefones?.message}
              {...register("telefones")}
            />
            <TextField label="Endereço" {...register("logradouro")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Complemento" {...register("complemento")} />
              <TextField label="Bairro" {...register("bairro")} />
              <TextField label="Cidade" {...register("cidade")} />
              <TextField label="UF" maxLength={2} {...register("uf")} />
              <TextField label="CEP" {...register("cep")} />
            </div>
          </div>
        </Card>

        <Card title="Filiação">
          <div className="grid gap-4">
            <TextField label="Mãe" {...register("mae")} />
            <TextField label="Pai" {...register("pai")} />
          </div>
        </Card>

        <Card title="Documentos" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Identidade" {...register("identidade")} />
            <TextField label="Órgão emissor" {...register("orgaoEmissor")} />
            <TextField
              label="UF do emissor"
              maxLength={2}
              {...register("ufEmissor")}
            />
            <TextField
              label="Data de emissão"
              type="date"
              {...register("dataEmissao")}
            />
            <TextField
              label="Certidão — termo"
              {...register("certidaoTermo")}
            />
            <TextField
              label="Certidão — folha"
              {...register("certidaoFolha")}
            />
            <TextField
              label="Certidão — livro"
              {...register("certidaoLivro")}
            />
            <TextField label="Cartório" {...register("cartorio")} />
            <TextField
              label="UF do cartório"
              maxLength={2}
              {...register("ufCartorio")}
            />
            <TextField label="Código INEP" {...register("codigoINEP")} />
            <TextField label="Nacionalidade" {...register("nacionalidade")} />
            <TextField label="Naturalidade" {...register("naturalidade")} />
            <TextField
              label="UF de naturalidade"
              maxLength={2}
              {...register("ufNaturalidade")}
            />
          </div>
        </Card>

        <Card title="Observações" className="lg:col-span-2">
          <TextField label="Anotações" {...register("observacoes")} />
        </Card>
      </div>

      <div className="border-line bg-surface sticky bottom-0 flex items-center justify-end gap-3 border-t py-3">
        {isDirty && (
          <span className="text-ink-muted mr-auto text-sm">
            Há alterações não salvas.
          </span>
        )}
        <Button
          variant="secondary"
          onClick={() => router.push(`/gestao/alunos/${aluno.matricula}`)}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
