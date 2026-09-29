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
  const limpo = raw.trim();
  const json = limpo.startsWith("{")
    ? limpo
    : Buffer.from(limpo, "base64").toString("utf8");

  try {
    const credencial = JSON.parse(json);

    // JSON válido ainda pode ser o arquivo errado — o `google-services.json`
    // do app Android, por exemplo, também é JSON e também vem do Firebase.
    if (!credencial.private_key || !credencial.client_email) {
      throw new Error("sem private_key ou client_email");
    }

    return credencial;
  } catch {
    /**
     * A mensagem descreve **o que chegou**, sem mostrar o conteúdo.
     *
     * Antes ela só dizia "inválida", e uma variável cortada na metade, uma
     * colagem que não foi ou o arquivo errado produziam exatamente o mesmo
     * texto — sem nada que distinguisse os três. Tamanho e primeiro
     * caractere bastam para separá-los, e nenhum dos dois revela a chave.
     */
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT inválida: recebi ${limpo.length} caracteres ` +
        `começando com "${limpo.slice(0, 1)}". Esperado o JSON da conta de ` +
        `serviço (começa com "{") ou o mesmo JSON em base64 (cerca de 3100 ` +
        `caracteres, começa com "ey"). Confira se o valor foi colado inteiro.`,
    );
  }
}
