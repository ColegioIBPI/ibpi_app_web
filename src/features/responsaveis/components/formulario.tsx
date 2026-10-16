"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import {
  ROTULOS_DE_TIPO_DE_RESPONSAVEL,
  tipoDeResponsavelSchema,
} from "@/core/modelo";
import { SelectField, TextField } from "@/core/ui/field";
import {
  salvarResponsavel,
  type FormularioDeResponsavel,
} from "@/features/responsaveis/actions/responsaveis";
import type { ResponsavelComId } from "@/features/responsaveis/services/responsaveis.server";

const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  parentesco: z.string().trim(),
  email: z.string().trim(),
  telefone: z.string().trim(),
  cpf: z.string().trim(),
  ativo: z.boolean(),
  tipo: tipoDeResponsavelSchema,

  logradouro: z.string().trim(),
  complemento: z.string().trim(),
  bairro: z.string().trim(),
  cidade: z.string().trim(),
  uf: z.string().trim(),
  cep: z.string().trim(),
});

export interface EnderecoDoAluno {
  alunoNome: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export function FormularioDeResponsavel({
  responsavel,
  enderecoDoAluno,
}: {
  responsavel?: ResponsavelComId;
  /**
   * O endereço de um filho vinculado, para a secretaria copiar em vez de
   * redigitar. Ausente num cadastro novo, que ainda não tem vínculo.
   */
  enderecoDoAluno?: EnderecoDoAluno;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormularioDeResponsavel>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: responsavel?.nome ?? "",
      parentesco: responsavel?.parentesco ?? "",
      email: responsavel?.email ?? "",
      telefone: responsavel?.telefone ?? "",
      cpf: responsavel?.cpf ?? "",
      ativo: responsavel?.ativo ?? true,
      tipo: responsavel?.tipo ?? "ambos",

      logradouro: responsavel?.endereco?.logradouro ?? "",
      complemento: responsavel?.endereco?.complemento ?? "",
      bairro: responsavel?.endereco?.bairro ?? "",
      cidade: responsavel?.endereco?.cidade ?? "",
      uf: responsavel?.endereco?.uf ?? "",
      cep: responsavel?.endereco?.cep ?? "",
    },
  });

  function copiarEnderecoDoAluno() {
    if (!enderecoDoAluno) return;

    // `shouldDirty` para o botão de salvar sair do estado inicial: sem
    // isso, copiar e salvar não gravaria nada.
    for (const campo of [
      "logradouro",
      "complemento",
      "bairro",
      "cidade",
      "uf",
      "cep",
    ] as const) {
      setValue(campo, enderecoDoAluno[campo], { shouldDirty: true });
    }
  }

  async function onSubmit(dados: FormularioDeResponsavel) {
    setErro(null);

    const resultado = await salvarResponsavel(responsavel?.id ?? null, dados);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar.");
      return;
    }

    router.push(`/gestao/responsaveis/${resultado.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex max-w-2xl flex-col gap-6"
    >
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      <Card title="Dados do responsável">
        <div className="grid gap-4">
          <TextField
            label="Nome completo"
            required
            error={errors.nome?.message}
            {...register("nome")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Parentesco"
              hint="Mãe, pai, avó…"
              error={errors.parentesco?.message}
              {...register("parentesco")}
            />
            <TextField
              label="CPF"
              hint="Com ou sem pontuação"
              error={errors.cpf?.message}
              {...register("cpf")}
            />
            <TextField
              label="E-mail"
              type="email"
              hint="É com ele que o responsável entra no Portal"
              error={errors.email?.message}
              {...register("email")}
            />
            <TextField
              label="Telefone"
              error={errors.telefone?.message}
              {...register("telefone")}
            />

            <SelectField
              label="Tipo de responsável"
              hint="Boletim vai para quem acompanha; cobrança, para quem paga."
              error={errors.tipo?.message}
              {...register("tipo")}
            >
              {Object.entries(ROTULOS_DE_TIPO_DE_RESPONSAVEL).map(
                ([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ),
              )}
            </SelectField>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="border-line size-4 rounded"
              {...register("ativo")}
            />
            <span className="text-ink">Responsável ativo</span>
          </label>
        </div>
      </Card>

      <Card
        title="Endereço"
        description="Em boa parte dos casos é o mesmo do aluno."
      >
        {enderecoDoAluno && (
          <div className="mb-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={copiarEnderecoDoAluno}
            >
              Usar o endereço de {enderecoDoAluno.alunoNome}
            </Button>
            {/* Copiar, e não apontar: o responsável pode mudar de casa
                  sem que isso mude o cadastro do filho. */}
            <p className="text-ink-muted mt-1 text-xs">
              Os campos são preenchidos e continuam editáveis.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label="Logradouro"
              error={errors.logradouro?.message}
              {...register("logradouro")}
            />
          </div>
          <TextField
            label="Complemento"
            error={errors.complemento?.message}
            {...register("complemento")}
          />
          <TextField
            label="Bairro"
            error={errors.bairro?.message}
            {...register("bairro")}
          />
          <TextField
            label="Cidade"
            error={errors.cidade?.message}
            {...register("cidade")}
          />
          <TextField
            label="UF"
            maxLength={2}
            error={errors.uf?.message}
            {...register("uf")}
          />
          <TextField
            label="CEP"
            inputMode="numeric"
            error={errors.cep?.message}
            {...register("cep")}
          />
        </div>

        {!responsavel && (
          <p className="text-ink-muted mt-4 text-xs">
            O vínculo com os alunos e o acesso ao Portal são definidos depois de
            salvar, na ficha do responsável.
          </p>
        )}
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
