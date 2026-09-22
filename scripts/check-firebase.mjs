/**
 * Diagnóstico da configuração do Firebase.
 *
 *   npm run check:firebase
 *
 * Confere, com as credenciais do `.env.local`, se os serviços que o Portal
 * usa estão ativos no projeto. Serve para separar "o código está errado" de
 * "o serviço não foi ligado no console" — que foi exatamente a confusão do
 * primeiro setup.
 *
 * Não imprime nenhum valor de credencial.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const ok = (label, detail = "") =>
  console.log(`  ok   ${label}${detail ? ` — ${detail}` : ""}`);
const fail = (label, detail = "") => {
  console.log(`  FALHA ${label}${detail ? ` — ${detail}` : ""}`);
  process.exitCode = 1;
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    fail(name, "ausente no .env.local");
    return null;
  }
  return value;
}

function parseServiceAccount(raw) {
  const json = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(json);
}

console.log("\nVerificando o projeto Firebase\n");

console.log("Variáveis de ambiente:");
const projectId = requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
const apiKey = requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
const appId = requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID");
const bucket = requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
const rawServiceAccount = requireEnv("FIREBASE_SERVICE_ACCOUNT");

if (!projectId || !apiKey || !appId || !bucket || !rawServiceAccount) {
  console.log("\nPreencha o .env.local (ver .env.example) e rode de novo.\n");
  process.exit(1);
}

ok("variáveis do cliente", `projeto ${projectId}`);

let serviceAccount;
try {
  serviceAccount = parseServiceAccount(rawServiceAccount);
} catch {
  fail(
    "FIREBASE_SERVICE_ACCOUNT",
    "não é um JSON válido. O valor precisa estar em UMA linha, ou em base64",
  );
  process.exit(1);
}

if (serviceAccount.project_id !== projectId) {
  fail(
    "conta de serviço",
    `aponta para ${serviceAccount.project_id}, diferente de ${projectId}`,
  );
  process.exit(1);
}

ok("conta de serviço", serviceAccount.client_email);

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount), storageBucket: bucket });
}

console.log("\nServiços:");

// Authentication — o provedor e-mail/senha é verificado pela API pública,
// porque o Admin SDK não reporta quais provedores estão habilitados.
try {
  await getAuth().listUsers(1);
  ok("Authentication", "acessível pelo Admin SDK");
} catch (error) {
  fail("Authentication", error.message.split("\n")[0]);
}

try {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "verificacao@example.invalid",
        password: "x".repeat(12),
        returnSecureToken: true,
      }),
    },
  );
  const code = (await response.json())?.error?.message ?? "OK";

  if (code === "CONFIGURATION_NOT_FOUND") {
    fail(
      "provedor e-mail/senha",
      "não habilitado — Console → Authentication → Sign-in method",
    );
  } else {
    ok("provedor e-mail/senha", "habilitado");
  }
} catch (error) {
  fail("provedor e-mail/senha", error.message);
}

try {
  await getFirestore().collection("_verificacao").limit(1).get();
  ok("Cloud Firestore", "banco criado e acessível");
} catch (error) {
  const message = error.message ?? "";
  const notEnabled = /has not been used|is disabled|NOT_FOUND/i.test(message);
  fail(
    "Cloud Firestore",
    notEnabled
      ? "banco não criado — Console → Firestore Database → Criar banco de dados"
      : message.split("\n")[0],
  );
}

try {
  const [exists] = await getStorage().bucket().exists();
  if (exists) ok("Cloud Storage", bucket);
  else fail("Cloud Storage", `bucket ${bucket} não existe`);
} catch (error) {
  fail("Cloud Storage", error.message.split("\n")[0]);
}

console.log(
  process.exitCode
    ? "\nAlgum item acima precisa ser resolvido no console do Firebase.\n"
    : "\nTudo pronto.\n",
);
