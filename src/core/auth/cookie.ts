/**
 * Constantes do cookie de sessão.
 *
 * Fica num módulo próprio, sem `server-only`, porque o `proxy.ts` também
 * precisa do nome do cookie e roda fora do runtime Node.
 */

export const SESSION_COOKIE = "ibpi_sessao";

/**
 * Cinco dias. O Firebase aceita até 14, mas o sistema trata dado de menor de
 * idade e costuma ser aberto em computador compartilhado da secretaria —
 * sessão curta reduz a janela de um acesso indevido.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
