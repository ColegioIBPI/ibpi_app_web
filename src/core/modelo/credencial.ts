import { z } from "zod";

import {
  auditoriaDoDocumentoSchema,
  origemSchema,
  textoOpcional,
} from "@/core/modelo/comum";

/**
 * Acessos do aluno às plataformas do colégio.
 *
 * O colégio cria essas contas e as entrega à família, que as esquece. Hoje
 * a resposta é um telefonema para a secretaria; aqui a família consulta
 * sozinha.
 *
 * **Coleção separada de `alunos`, de propósito.** O cadastro do aluno é
 * lido pelo professor e pelo próprio aluno; credencial não pode ser. A
 * Security Rule decide por documento e nunca por campo — juntos, seria
 * preciso escolher entre o professor ler a senha ou não ler a turma.
 *
 * > A senha fica **em texto**, por decisão do colégio. Isso significa que
 * > quem obtiver acesso indevido ao banco obtém as credenciais de todos os
 * > alunos de uma vez. O que limita o estrago é a regra de leitura: só a
 * > família daquele aluno e a equipe escolar.
 */

export const acessoSchema = z.object({
  usuario: textoOpcional,
  senha: textoOpcional,
});

export type Acesso = z.infer<typeof acessoSchema>;

/** Um acesso em branco — o Zod 4 exige o valor de saída no `default`. */
export const ACESSO_VAZIO = { usuario: null, senha: null } as const;

export const credenciaisSchema = z.object({
  matricula: z.string().min(1),

  /** Plataforma de aula — Google Classroom. */
  ibpiOnline: acessoSchema.default(ACESSO_VAZIO),
  /** Plataforma do material didático. */
  plural: acessoSchema.default(ACESSO_VAZIO),

  /**
   * A senha do **Meu IBPI** não mora aqui, e não é omissão.
   *
   * Ela é a senha do Firebase Auth, que guarda apenas um hash: ninguém
   * consegue lê-la — nem o colégio, nem o Google. Guardar uma cópia em
   * texto criaria uma segunda senha que o sistema nunca confere e que
   * envelhece sozinha na primeira vez que a família a trocar.
   *
   * Quem esqueceu usa "Esqueci minha senha" na tela de entrada. O que a
   * ficha mostra é o **e-mail de acesso**, que é o que costuma faltar.
   */
  observacoes: textoOpcional,

  atualizadoPorNome: z.string().optional(),
  origem: origemSchema,
  ...auditoriaDoDocumentoSchema.shape,
});

export type Credenciais = z.infer<typeof credenciaisSchema>;
