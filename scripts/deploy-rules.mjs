/**
 * Publica `firestore.rules` no projeto Firebase.
 *
 *   npm run deploy:rules
 *
 * Por que não `firebase deploy --only firestore:rules`?
 *
 * O CLI sempre roda um dry-run no endpoint `projects/{id}:test` antes de
 * publicar, e esse endpoint exige a permissão `firebaserules.rulesets.test`,
 * que a conta de serviço do Admin SDK não tem. Ela tem as permissões que
 * importam — criar ruleset e atualizar release —, então este script faz as
 * duas chamadas diretamente, com a mesma credencial do resto do sistema.
 *
 * Quando alguém com papel de Owner no projeto rodar o CLI com a própria
 * conta Google, `firebase deploy` funciona normalmente e este script vira
 * opcional.
 *
 * Cada publicação cria um ruleset novo; o anterior continua no projeto e dá
 * para voltar pelo console (Firestore → Regras → histórico).
 */

import { readFileSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";

const ARQUIVO = "firestore.rules";
const API = "https://firebaserules.googleapis.com/v1";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!raw || !projectId) {
  console.error(
    "Faltam variáveis de ambiente. Rode com as chaves do .env.local.",
  );
  process.exit(1);
}

const credentials = JSON.parse(
  raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8"),
);

const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const client = await auth.getClient();
const { token } = await client.getAccessToken();

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function chamar(caminho, init) {
  const resposta = await fetch(`${API}/${caminho}`, { ...init, headers });
  const corpo = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${caminho} → ${resposta.status} ` +
        `${corpo?.error?.status ?? ""}: ${corpo?.error?.message ?? ""}`,
    );
  }

  return corpo;
}

const source = {
  files: [{ name: ARQUIVO, content: readFileSync(ARQUIVO, "utf8") }],
};

console.log(`\nPublicando ${ARQUIVO} em ${projectId}\n`);

// 1. Cria o ruleset. A compilação acontece aqui: regra com erro de sintaxe
//    é recusada nesta chamada, antes de virar release.
const ruleset = await chamar(`projects/${projectId}/rulesets`, {
  method: "POST",
  body: JSON.stringify({ source }),
});

console.log(`  ruleset criado: ${ruleset.name.split("/").pop()}`);

// 2. Aponta o release do Firestore para o novo ruleset. É este passo que
//    coloca as regras em vigor.
const release = `projects/${projectId}/releases/cloud.firestore`;
const corpo = JSON.stringify({
  release: { name: release, rulesetName: ruleset.name },
});

try {
  await chamar(release, { method: "PATCH", body: corpo });
  console.log("  release atualizado");
} catch (erro) {
  // Projeto que nunca publicou regras ainda não tem release para atualizar.
  if (!/NOT_FOUND|404/.test(erro.message)) throw erro;
  await chamar(`projects/${projectId}/releases`, {
    method: "POST",
    body: corpo,
  });
  console.log("  release criado");
}

console.log("\nRegras em vigor.\n");
