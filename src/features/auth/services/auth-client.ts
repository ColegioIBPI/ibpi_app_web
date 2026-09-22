"use client";

import {
  browserSessionPersistence,
  confirmPasswordReset,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  verifyPasswordResetCode,
} from "firebase/auth";

import { getFirebaseAuth } from "@/core/firebase/client";

/**
 * Operações de autenticação no navegador.
 *
 * O estado de login que vale é o cookie de sessão HttpOnly criado pelo
 * servidor — o SDK do Firebase é usado só para obter o token de ID e para os
 * fluxos de senha, que exigem o cliente.
 */

/**
 * Entra e devolve a rota inicial do perfil.
 *
 * A persistência é de sessão do navegador (`browserSessionPersistence`) de
 * propósito: quem controla o acesso é o cookie do servidor, e deixar um
 * segundo estado de login guardado no `localStorage` só cria divergência —
 * usuário "deslogado" no servidor e ainda logado no SDK.
 */
export async function entrar(email: string, senha: string): Promise<string> {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserSessionPersistence);

  const credencial = await signInWithEmailAndPassword(auth, email, senha);
  const idToken = await credencial.user.getIdToken();

  const resposta = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!resposta.ok) {
    // A sessão do servidor não foi criada; não deixe o SDK logado por conta
    // própria, senão a interface mostra um estado que o servidor não aceita.
    await signOut(auth).catch(() => undefined);
    const corpo = await resposta.json().catch(() => null);
    throw new Error(corpo?.erro ?? "Não foi possível entrar. Tente de novo.");
  }

  const { rota } = (await resposta.json()) as { rota: string };
  return rota;
}

export async function sair(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
  await signOut(getFirebaseAuth()).catch(() => undefined);
}

/**
 * Envia o e-mail de definição de senha.
 *
 * É o mesmo mecanismo do primeiro acesso: a secretaria cria a conta com uma
 * senha aleatória e a pessoa recebe este e-mail para escolher a dela. Assim
 * ninguém da escola chega a conhecer a senha de uma família.
 */
export async function enviarEmailDeSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

/** Valida o código do link de e-mail e devolve o e-mail correspondente. */
export async function validarCodigoDeSenha(codigo: string): Promise<string> {
  return verifyPasswordResetCode(getFirebaseAuth(), codigo);
}

export async function definirSenha(
  codigo: string,
  novaSenha: string,
): Promise<void> {
  await confirmPasswordReset(getFirebaseAuth(), codigo, novaSenha);
}
