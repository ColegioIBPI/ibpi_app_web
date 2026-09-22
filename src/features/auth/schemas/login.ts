import { z } from "zod";

/** Mesmo esquema usado no formulário e na validação do servidor. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("Esse e-mail não parece válido."),
  senha: z.string().min(1, "Informe sua senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const recuperarSenhaSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("Esse e-mail não parece válido."),
});

export type RecuperarSenhaInput = z.infer<typeof recuperarSenhaSchema>;

/**
 * Mínimo de 8 caracteres.
 *
 * Fica só na definição de senha, nunca no login: exigir formato ao entrar
 * apenas informa a quem tenta adivinhar como são as senhas do sistema, e
 * ainda tranca quem tem senha antiga fora do formato.
 */
export const definirSenhaSchema = z
  .object({
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmacao: z.string().min(1, "Repita a senha."),
  })
  .refine((dados) => dados.senha === dados.confirmacao, {
    message: "As senhas não são iguais.",
    path: ["confirmacao"],
  });

export type DefinirSenhaInput = z.infer<typeof definirSenhaSchema>;
