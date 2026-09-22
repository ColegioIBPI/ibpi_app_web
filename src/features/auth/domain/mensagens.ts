/**
 * Tradução dos erros do Firebase Auth para mensagens que o usuário entende.
 *
 * Função pura, sem dependência do SDK — é o que permite testar todos os casos
 * sem subir Firebase nenhum.
 *
 * Regra de segurança aplicada aqui: **login errado nunca diz o que errou.**
 * "E-mail não encontrado" entrega a quem tenta adivinhar quais e-mails têm
 * conta no sistema. Senha e usuário inexistente devolvem a mesma frase.
 */

const MENSAGEM_CREDENCIAL_INVALIDA =
  "E-mail ou senha incorretos. Confira e tente de novo.";

const MENSAGENS: Record<string, string> = {
  "auth/invalid-credential": MENSAGEM_CREDENCIAL_INVALIDA,
  "auth/invalid-login-credentials": MENSAGEM_CREDENCIAL_INVALIDA,
  "auth/wrong-password": MENSAGEM_CREDENCIAL_INVALIDA,
  "auth/user-not-found": MENSAGEM_CREDENCIAL_INVALIDA,
  "auth/invalid-email": "Esse e-mail não parece válido.",

  "auth/user-disabled":
    "Esta conta está desativada. Fale com a secretaria do colégio.",
  "auth/too-many-requests":
    "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",

  "auth/network-request-failed":
    "Sem conexão com a internet. Verifique a rede e tente de novo.",

  "auth/weak-password": "A senha precisa ter pelo menos 8 caracteres.",
  "auth/expired-action-code":
    "Este link expirou. Peça um novo para a secretaria.",
  "auth/invalid-action-code":
    "Este link não é mais válido. Peça um novo para a secretaria.",
  "auth/requires-recent-login":
    "Por segurança, entre novamente antes de fazer esta alteração.",
};

const MENSAGEM_PADRAO =
  "Não foi possível concluir. Tente de novo em instantes.";

/** Extrai o código de erro do que o SDK do Firebase lançou. */
export function codigoDoErro(erro: unknown): string | null {
  if (typeof erro === "object" && erro !== null && "code" in erro) {
    const code = (erro as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

export function mensagemDeErroDeAuth(erro: unknown): string {
  const codigo = codigoDoErro(erro);
  if (codigo && codigo in MENSAGENS) return MENSAGENS[codigo];
  return MENSAGEM_PADRAO;
}
