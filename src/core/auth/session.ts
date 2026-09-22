import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getAdminAuth, getAdminDb } from "@/core/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/core/auth/cookie";
import { isRole, type Role } from "@/core/auth/roles";

/**
 * Sessão do usuário, verificada no servidor.
 *
 * O `proxy.ts` apenas confere se o cookie existe — ele roda fora do runtime
 * Node e não consegue validar assinatura. A verificação de verdade acontece
 * aqui, nos layouts e nas Server Actions. Não confie no proxy para autorizar.
 */
export interface SessionUser {
  uid: string;
  email: string;
  nome: string;
  role: Role;
  /** Matrícula, quando o usuário é um aluno. */
  matricula?: string;
  /** Matrículas dos filhos, quando o usuário é responsável. */
  alunosVinculados: string[];
}

/**
 * Troca o token de login por um cookie de sessão HttpOnly.
 *
 * O token de ID do Firebase dura uma hora e fica acessível ao JavaScript da
 * página. O cookie de sessão dura mais, é HttpOnly e pode ser revogado no
 * servidor — é o que o Firebase recomenda para aplicação renderizada no
 * servidor.
 */
export async function criarSessao(idToken: string): Promise<void> {
  const expiresIn = SESSION_MAX_AGE_SECONDS * 1000;
  const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
    expiresIn,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function encerrarSessao(): Promise<void> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;

  store.delete(SESSION_COOKIE);

  if (!cookie) return;

  // Revoga os tokens de atualização: sem isso, um cookie copiado antes do
  // logout continuaria valendo até expirar.
  try {
    const claims = await getAdminAuth().verifySessionCookie(cookie);
    await getAdminAuth().revokeRefreshTokens(claims.sub);
  } catch {
    // Cookie já inválido — nada a revogar.
  }
}

/**
 * Sessão atual, ou `null` se não houver.
 *
 * Memorizada por requisição com `cache()`: vários layouts e componentes
 * chamam esta função na mesma renderização, e não faz sentido verificar o
 * cookie e ler o Firestore mais de uma vez.
 */
export const lerSessao = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;

  if (!cookie) return null;

  try {
    // `true` verifica se o token foi revogado — é o que faz o logout valer
    // de verdade em outras abas e dispositivos.
    const claims = await getAdminAuth().verifySessionCookie(cookie, true);
    const perfil = await carregarPerfil(claims.uid, claims.role);

    if (!perfil) return null;

    return {
      uid: claims.uid,
      email: claims.email ?? perfil.email ?? "",
      nome: perfil.nome,
      role: perfil.role,
      matricula: perfil.matricula,
      alunosVinculados: perfil.alunosVinculados,
    };
  } catch {
    return null;
  }
});

export interface Perfil {
  nome: string;
  email?: string;
  role: Role;
  matricula?: string;
  alunosVinculados: string[];
}

/**
 * Perfil de um usuário específico, sem depender do cookie de sessão.
 *
 * Usada logo após o login, quando ainda não há cookie para ler mas já é
 * preciso saber para qual área mandar a pessoa.
 */
export async function lerPerfil(
  uid: string,
  roleDaClaim?: unknown,
): Promise<Perfil | null> {
  return carregarPerfil(uid, roleDaClaim);
}

/**
 * Perfil e vínculos vêm sempre do servidor — nunca do que o cliente informa.
 *
 * A `role` preferida é a da _custom claim_, porque é ela que as Security
 * Rules enxergam: se o portal decidisse por um valor e as regras por outro,
 * a tela mostraria opções que o banco recusa. O documento em `users` só
 * serve de reserva, para uma conta criada antes de a claim ser aplicada.
 */
async function carregarPerfil(
  uid: string,
  roleDaClaim: unknown,
): Promise<Perfil | null> {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();

  if (!snapshot.exists) return null;

  const dados = snapshot.data() ?? {};

  // Conta desativada perde o acesso na hora, sem esperar o cookie expirar.
  if (dados.ativo === false) return null;

  const role = isRole(roleDaClaim)
    ? roleDaClaim
    : isRole(dados.role)
      ? dados.role
      : null;

  if (!role) return null;

  return {
    nome: typeof dados.nome === "string" ? dados.nome : "",
    email: typeof dados.email === "string" ? dados.email : undefined,
    role,
    matricula:
      typeof dados.matricula === "string" ? dados.matricula : undefined,
    alunosVinculados: Array.isArray(dados.alunosVinculados)
      ? dados.alunosVinculados.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}
