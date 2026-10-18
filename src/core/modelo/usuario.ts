import { z } from "zod";

import { ROLES } from "@/core/auth/roles";

/**
 * A conta de acesso ao sistema — `users/{uid}`.
 *
 * O documento **espelha** o que vive no Firebase Auth (nome, e-mail,
 * ativo) e acrescenta o que as Security Rules precisam ler a cada consulta:
 * o papel, a matrícula, os filhos vinculados e as turmas lecionadas.
 *
 * A regra do Firestore não consegue chamar o Auth. Por isso o espelho
 * existe — e por isso toda gravação tem de mexer nos dois lados, ou a
 * pessoa entra e não lê nada (ou, pior, continua lendo o que não deveria).
 *
 * O `uid` **não** é campo: é o id do documento, e é o mesmo do Auth.
 */
export const usuarioSchema = z.object({
  nome: z.string().trim().min(1),
  email: z.string().email(),
  role: z.enum(ROLES),
  /**
   * Conta suspensa fica `false`.
   *
   * A sessão do Portal já recusa quem está assim, mas **a desativação de
   * verdade é no Firebase Auth**: o aplicativo lê o Firestore direto, com
   * o próprio token, e não passa pela sessão do Portal. Ver
   * `features/usuarios/actions`.
   */
  ativo: z.boolean().default(true),
  /** Matrícula, quando a conta é de um aluno. */
  matricula: z.string().nullish(),
  /** Matrículas dos filhos, quando é de um responsável. */
  alunosVinculados: z.array(z.string()).default([]),
  /** Turmas que leciona, quando é de um professor. */
  turmas: z.array(z.string()).default([]),
  /** Destinos de aviso que alcançam esta pessoa. */
  chavesDeAlcance: z.array(z.string()).default([]),
  atualizadoEm: z.string().nullish(),
});

export type Usuario = z.infer<typeof usuarioSchema>;

export type UsuarioComId = Usuario & { id: string };
