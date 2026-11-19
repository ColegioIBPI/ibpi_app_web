/**
 * Backup completo do Firestore e do Cloud Storage.
 *
 *   npm run backup
 *   npm run backup -- --destino D:/backups-ibpi
 *
 * **Por que existe:** não há `colegioibpi-dev`. Toda mudança de estrutura,
 * toda limpeza e todo script de migração rodam sobre o banco de verdade,
 * com o aplicativo da família apontando para ele. O Firestore não tem
 * lixeira: documento apagado não volta.
 *
 * O que ele grava:
 *
 * - um JSON por coleção, **com o id de cada documento** — aqui o id
 *   carrega significado (a matrícula é a chave de meia dúzia de coleções),
 *   e um backup sem ids não reconstrói nada;
 * - as contas do Firebase Auth, sem senha: o Firebase guarda hash, e nem
 *   ele devolve o original. O que volta é quem existe, com que e-mail,
 *   qual perfil e se está ativo;
 * - os arquivos do Storage — foto de aluno, boleto, anexo de aviso.
 *
 * **O que ele não faz:** restaurar. Escrever de volta é outra ferramenta,
 * e perigosa o bastante para não dividir o arquivo com esta.
 */
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

import { getAdminAuth, getAdminDb, getAdminStorage } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";

const argumentos = process.argv.slice(2);
const destinoBase =
  argumentos[argumentos.indexOf("--destino") + 1] &&
  argumentos.includes("--destino")
    ? argumentos[argumentos.indexOf("--destino") + 1]
    : "backups";

/** `2026-11-19T18-42-07` — ordena sozinho e não tem `:`, que o Windows recusa. */
const carimbo = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const pasta = join(destinoBase, carimbo);

await mkdir(join(pasta, "arquivos"), { recursive: true });

console.log(`\nBackup em ${pasta}\n`);

const db = getAdminDb();
const contagens: Record<string, number> = {};

for (const colecao of Object.values(COLECOES)) {
  const docs = await db.collection(colecao).get();

  const dados = docs.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));

  await writeFile(
    join(pasta, `${colecao}.json`),
    JSON.stringify(dados, null, 2),
    "utf8",
  );

  contagens[colecao] = docs.size;
  console.log(`  ${String(docs.size).padStart(6)}  ${colecao}`);
}

/**
 * As contas, sem senha.
 *
 * `customClaims` entra porque é dali que as Security Rules leem o perfil —
 * um backup que devolvesse os usuários sem a claim devolveria gente que
 * entra e não lê nada.
 */
const contas: unknown[] = [];
let pagina = await getAdminAuth().listUsers(1000);

while (true) {
  contas.push(
    ...pagina.users.map((usuario) => ({
      uid: usuario.uid,
      email: usuario.email ?? null,
      nome: usuario.displayName ?? null,
      desativado: usuario.disabled,
      claims: usuario.customClaims ?? null,
      criadoEm: usuario.metadata.creationTime,
      ultimoAcesso: usuario.metadata.lastSignInTime,
    })),
  );

  if (!pagina.pageToken) break;
  pagina = await getAdminAuth().listUsers(1000, pagina.pageToken);
}

await writeFile(
  join(pasta, "_auth.json"),
  JSON.stringify(contas, null, 2),
  "utf8",
);
console.log(`  ${String(contas.length).padStart(6)}  (contas do Firebase Auth)`);

// Os arquivos. São poucos e pequenos — foto de aluno, boleto, anexo de
// aviso —, e são justamente os que não dá para refazer digitando.
const [arquivos] = await getAdminStorage().bucket().getFiles();

for (const arquivo of arquivos) {
  const destino = join(pasta, "arquivos", arquivo.name.replace(/\//g, "__"));
  await pipeline(arquivo.createReadStream(), createWriteStream(destino));
}

console.log(`  ${String(arquivos.length).padStart(6)}  (arquivos do Storage)`);

await writeFile(
  join(pasta, "manifesto.json"),
  JSON.stringify(
    {
      projeto: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
      em: new Date().toISOString(),
      colecoes: contagens,
      contas: contas.length,
      arquivos: arquivos.length,
    },
    null,
    2,
  ),
  "utf8",
);

const totalDocumentos = Object.values(contagens).reduce((a, b) => a + b, 0);

console.log(
  `\n${totalDocumentos} documentos, ${contas.length} contas e ${arquivos.length} arquivos.`,
);
console.log(`Guarde ${pasta} fora desta máquina antes de mexer no banco.\n`);
