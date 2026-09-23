import { z } from "zod";

import {
  normalizarCpf,
  normalizarTelefone,
} from "@/features/migracao/domain/texto";
import { chaveDeComparacao } from "@/features/migracao/domain/texto";
import type { AlunoEditavel } from "@/core/modelo";

/**
 * Conversão entre o formulário e o modelo.
 *
 * E-mails e telefones são listas no banco e campos de texto na tela — a
 * secretaria digita separando por vírgula, que é mais rápido do que clicar
 * em "adicionar" a cada item. A conversão vive aqui, pura e testada, e não
 * espalhada no componente.
 *
 * CPF e telefone são **normalizados na entrada**: quem digita escolhe o
 * formato, o banco guarda um só. Sem isso, o mesmo telefone entra como
 * `(21) 99999-8888` e `21999998888` e nenhuma busca casa os dois.
 */

export const formularioDoAlunoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  dataNascimento: z.string().trim(),
  cpf: z.string().trim(),
  ativo: z.boolean(),

  turmaCodigo: z.string().trim(),
  serie: z.string().trim(),
  dataMatricula: z.string().trim(),

  emails: z.string().trim(),
  telefones: z.string().trim(),
  logradouro: z.string().trim(),
  complemento: z.string().trim(),
  bairro: z.string().trim(),
  cidade: z.string().trim(),
  uf: z.string().trim(),
  cep: z.string().trim(),

  mae: z.string().trim(),
  pai: z.string().trim(),

  identidade: z.string().trim(),
  orgaoEmissor: z.string().trim(),
  ufEmissor: z.string().trim(),
  dataEmissao: z.string().trim(),
  certidaoTermo: z.string().trim(),
  certidaoFolha: z.string().trim(),
  certidaoLivro: z.string().trim(),
  cartorio: z.string().trim(),
  ufCartorio: z.string().trim(),
  codigoINEP: z.string().trim(),
  nacionalidade: z.string().trim(),
  naturalidade: z.string().trim(),
  ufNaturalidade: z.string().trim(),

  observacoes: z.string().trim(),
});

export type FormularioDoAluno = z.infer<typeof formularioDoAlunoSchema>;

/** `"a@x.com, b@y.com"` → `["a@x.com", "b@y.com"]` */
export function parsearLista(texto: string): string[] {
  return texto
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatarLista(itens: readonly string[] | undefined): string {
  return (itens ?? []).join(", ");
}

/**
 * Telefone digitado em qualquer formato vira E.164.
 *
 * O que não dá para normalizar é **mantido como veio**, em vez de
 * descartado: número incompleto no cadastro ainda é melhor que campo vazio,
 * e a secretaria corrige quando notar.
 */
export function normalizarTelefones(texto: string): string[] {
  return parsearLista(texto).map((item) => normalizarTelefone(item) ?? item);
}

const vazioParaNulo = (valor: string) => (valor.trim() ? valor.trim() : null);

/**
 * Converte o formulário na forma que vai para o Firestore.
 *
 * Devolve **só os campos que o formulário edita**. `turmaId`, `segmento` e
 * `turno` são derivados da turma e resolvidos no servidor; a foto tem ação
 * própria. Incluí-los aqui como `null` apagaria dado bom na gravação com
 * `merge` — foi exatamente o que aconteceu na primeira versão.
 */
export type AlunoDoFormulario = Omit<
  AlunoEditavel,
  | "turmaId"
  | "segmento"
  | "turno"
  | "statusOriginal"
  | "fotoPath"
  | "fotoAtualizadaEm"
> & { nomeParaBusca: string };

export function paraAluno(formulario: FormularioDoAluno): AlunoDoFormulario {
  return {
    nome: formulario.nome.trim(),
    nomeParaBusca: chaveDeComparacao(formulario.nome),
    dataNascimento: vazioParaNulo(formulario.dataNascimento),
    cpf: normalizarCpf(formulario.cpf),
    ativo: formulario.ativo,

    turmaCodigo: vazioParaNulo(formulario.turmaCodigo),
    serie: vazioParaNulo(formulario.serie),

    contato: {
      emails: parsearLista(formulario.emails),
      telefones: normalizarTelefones(formulario.telefones),
      endereco: {
        logradouro: vazioParaNulo(formulario.logradouro),
        complemento: vazioParaNulo(formulario.complemento),
        bairro: vazioParaNulo(formulario.bairro),
        cidade: vazioParaNulo(formulario.cidade),
        uf: formulario.uf.trim() ? formulario.uf.trim().toUpperCase() : null,
        cep: vazioParaNulo(formulario.cep),
      },
    },

    filiacao: {
      mae: vazioParaNulo(formulario.mae),
      pai: vazioParaNulo(formulario.pai),
    },

    documentos: {
      identidade: vazioParaNulo(formulario.identidade),
      orgaoEmissor: vazioParaNulo(formulario.orgaoEmissor),
      ufEmissor: vazioParaNulo(formulario.ufEmissor),
      dataEmissao: vazioParaNulo(formulario.dataEmissao),
      certidaoTermo: vazioParaNulo(formulario.certidaoTermo),
      certidaoFolha: vazioParaNulo(formulario.certidaoFolha),
      certidaoLivro: vazioParaNulo(formulario.certidaoLivro),
      cartorio: vazioParaNulo(formulario.cartorio),
      ufCartorio: vazioParaNulo(formulario.ufCartorio),
      codigoINEP: vazioParaNulo(formulario.codigoINEP),
      nacionalidade: vazioParaNulo(formulario.nacionalidade),
      naturalidade: vazioParaNulo(formulario.naturalidade),
      ufNaturalidade: vazioParaNulo(formulario.ufNaturalidade),
    },

    observacoes: vazioParaNulo(formulario.observacoes),
    dataMatricula: vazioParaNulo(formulario.dataMatricula),
  };
}

/** Preenche o formulário a partir do que está no banco. */
export function paraFormulario(
  aluno: Partial<AlunoEditavel> | null | undefined,
): FormularioDoAluno {
  const contato = aluno?.contato;
  const endereco = contato?.endereco;
  const documentos = aluno?.documentos;

  return {
    nome: aluno?.nome ?? "",
    dataNascimento: aluno?.dataNascimento ?? "",
    cpf: aluno?.cpf ?? "",
    ativo: aluno?.ativo ?? true,

    turmaCodigo: aluno?.turmaCodigo ?? "",
    serie: aluno?.serie ?? "",
    dataMatricula: aluno?.dataMatricula ?? "",

    emails: formatarLista(contato?.emails),
    telefones: formatarLista(contato?.telefones),
    logradouro: endereco?.logradouro ?? "",
    complemento: endereco?.complemento ?? "",
    bairro: endereco?.bairro ?? "",
    cidade: endereco?.cidade ?? "",
    uf: endereco?.uf ?? "",
    cep: endereco?.cep ?? "",

    mae: aluno?.filiacao?.mae ?? "",
    pai: aluno?.filiacao?.pai ?? "",

    identidade: documentos?.identidade ?? "",
    orgaoEmissor: documentos?.orgaoEmissor ?? "",
    ufEmissor: documentos?.ufEmissor ?? "",
    dataEmissao: documentos?.dataEmissao ?? "",
    certidaoTermo: documentos?.certidaoTermo ?? "",
    certidaoFolha: documentos?.certidaoFolha ?? "",
    certidaoLivro: documentos?.certidaoLivro ?? "",
    cartorio: documentos?.cartorio ?? "",
    ufCartorio: documentos?.ufCartorio ?? "",
    codigoINEP: documentos?.codigoINEP ?? "",
    nacionalidade: documentos?.nacionalidade ?? "",
    naturalidade: documentos?.naturalidade ?? "",
    ufNaturalidade: documentos?.ufNaturalidade ?? "",

    observacoes: aluno?.observacoes ?? "",
  };
}
