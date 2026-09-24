/**
 * Reparo pontual das 847 cobranças migradas:
 *
 * 1. corrige `valor` e `valorPago`, que perdiam o ponto decimal quando o
 *    Access exportava o número como float — R$ 3.270,12 virava
 *    R$ 327.012,00 (55 linhas afetadas);
 * 2. preenche `emitidaPeloBanco` / `emitidaPeloColegio`, que a migração lia
 *    da origem mas não gravava;
 * 3. apaga `situacao`, que agora é calculada na leitura — deixá-la gravada
 *    criaria duas verdades, e a gravada envelhece.
 *
 * Só toca em `cobrancas`, e só nesses cinco campos. É idempotente: rodar de
 * novo reescreve os mesmos valores.
 *
 * **Não toca em parcela que o Portal já alterou.** Sobrescrever o valor
 * vindo do Access por cima de uma baixa lançada na secretaria apagaria um
 * pagamento que a família fez — e é justamente esse registro que o colégio
 * precisa quando a família contesta.
 */
import { readFileSync } from "node:fs";

import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";
import {
  idDaCobranca,
  parsearParcela,
  parsearValor,
} from "@/features/migracao/domain/financeiro";
import { limparTexto } from "@/features/migracao/domain/texto";
import { paraDataISO } from "@/core/lib/datas";
import { FieldValue } from "firebase-admin/firestore";

interface Linha {
  Matricula?: unknown;
  Vencimento?: unknown;
  "QTDE de Parcelas"?: unknown;
  Valor?: unknown;
  "Valor Pago"?: unknown;
  "No Banco"?: unknown;
  "No IBPI"?: unknown;
  "Observações"?: unknown;
}

const brutos: Linha[] = JSON.parse(
  readFileSync(
    "scripts/migrate-access/data/Tabela_pagamento.json",
    "utf8",
  ),
);

interface Correcao {
  valor: number | null;
  valorPago: number | null;
  banco: boolean;
  colegio: boolean;
}

const correcoes = new Map<string, Correcao>();

for (const bruto of brutos) {
  const matricula = limparTexto(bruto.Matricula);
  const vencimentoBruto = bruto.Vencimento;
  if (!matricula || !vencimentoBruto) continue;

  const vencimento = paraDataISO(String(vencimentoBruto));
  const parcela = parsearParcela(bruto["QTDE de Parcelas"]);
  const distintivo = `${bruto.Valor ?? ""}|${bruto["Observações"] ?? ""}`;

  correcoes.set(idDaCobranca(matricula, vencimento, parcela, distintivo), {
    valor: parsearValor(bruto.Valor),
    valorPago: parsearValor(bruto["Valor Pago"]),
    banco: bruto["No Banco"] === true,
    colegio: bruto["No IBPI"] === true,
  });
}

console.log(`origem: ${brutos.length} linhas, ${correcoes.size} ids distintos`);

const db = getAdminDb();
const docs = await db.collection(COLECOES.cobrancas).get();

let atualizados = 0;
let valoresCorrigidos = 0;
let preservados = 0;
let semCorrespondencia = 0;
let lote = db.batch();
let noLote = 0;

for (const doc of docs.docs) {
  const correcao = correcoes.get(doc.id);
  if (!correcao) {
    semCorrespondencia += 1;
    continue;
  }

  const atual = doc.data();

  if (atual.baixadoPor || atual.origem !== "access") {
    preservados += 1;
    continue;
  }

  if (atual.valor !== correcao.valor || atual.valorPago !== correcao.valorPago) {
    valoresCorrigidos += 1;
    console.log(
      `  valor ${doc.id}: ${atual.valor}/${atual.valorPago} -> ${correcao.valor}/${correcao.valorPago}`,
    );
  }

  lote.update(doc.ref, {
    valor: correcao.valor,
    valorPago: correcao.valorPago,
    emitidaPeloBanco: correcao.banco,
    emitidaPeloColegio: correcao.colegio,
    situacao: FieldValue.delete(),
  });

  atualizados += 1;
  noLote += 1;

  if (noLote === 400) {
    await lote.commit();
    lote = db.batch();
    noLote = 0;
  }
}

if (noLote > 0) await lote.commit();

console.log(`atualizadas: ${atualizados}`);
console.log(`com valor corrigido: ${valoresCorrigidos}`);
console.log(`preservadas por terem sido lançadas no Portal: ${preservados}`);
console.log(`sem correspondência na origem: ${semCorrespondencia}`);

const conferencia = await db.collection(COLECOES.cobrancas).limit(3).get();
for (const doc of conferencia.docs) {
  console.log(" ", doc.id, JSON.stringify(doc.data()));
}
