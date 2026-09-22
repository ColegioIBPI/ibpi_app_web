import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { getPublicEnv, getServerEnv } from "@/core/config/env";

/**
 * Admin SDK — ignora as Security Rules e tem acesso total ao projeto.
 *
 * Só pode ser importado em Server Actions e Route Handlers. O `server-only`
 * no topo transforma um import acidental no cliente em erro de build, em vez
 * de vazar a chave de serviço para o navegador.
 */

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const { FIREBASE_SERVICE_ACCOUNT } = getServerEnv();
  const { NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET } = getPublicEnv();

  return initializeApp({
    credential: cert(parseServiceAccount(FIREBASE_SERVICE_ACCOUNT)),
    storageBucket: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}

/**
 * A chave é guardada como JSON em uma variável de ambiente. Aceita tanto o
 * JSON cru quanto a versão em base64 — a Vercel lida melhor com base64, que
 * não tem quebra de linha.
 */
function parseServiceAccount(raw: string) {
  const json = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");

  try {
    return JSON.parse(json);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT inválida: esperado JSON da conta de serviço " +
        "(ou o mesmo JSON em base64).",
    );
  }
}
