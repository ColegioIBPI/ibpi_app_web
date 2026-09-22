import { z } from "zod";

/**
 * Tipos compartilhados entre as coleções.
 *
 * O modelo inteiro é declarado com Zod e os tipos saem por inferência: um
 * esquema só, usado na validação do formulário, na Server Action e na
 * leitura do Firestore. Duas declarações da mesma coisa é como o formulário
 * passa a aceitar o que o banco recusa.
 */

export const segmentoSchema = z.enum([
  "fundamental",
  "medio",
  "eja-fundamental",
  "eja-medio",
]);

export type Segmento = z.infer<typeof segmentoSchema>;

export const ROTULOS_DE_SEGMENTO: Record<Segmento, string> = {
  fundamental: "Ensino Fundamental",
  medio: "Ensino Médio",
  "eja-fundamental": "EJA — Fundamental",
  "eja-medio": "EJA — Médio",
};

export const turnoSchema = z.enum(["manha", "tarde", "flex"]);

export type Turno = z.infer<typeof turnoSchema>;

export const ROTULOS_DE_TURNO: Record<Turno, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  flex: "Flex",
};

/** O colégio trabalha com três trimestres. Ver README, seção 5.6. */
export const trimestreSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export type Trimestre = z.infer<typeof trimestreSchema>;

export const TRIMESTRES: Trimestre[] = [1, 2, 3];

/** Data sem hora, como `2026-03-27`. */
export const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");

/** Campo de texto que aceita vazio e guarda `null` em vez de string vazia. */
export const textoOpcional = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((valor) => (valor ? valor : null));

/**
 * De onde o registro veio. `access` marca o que foi migrado do sistema
 * antigo — útil para saber o que ainda não passou por revisão humana.
 */
export const origemSchema = z.enum(["access", "portal"]).default("portal");

/** Metadados de auditoria gravados pelo servidor, nunca pelo formulário. */
export const auditoriaDoDocumentoSchema = z.object({
  criadoEm: z.string().nullish(),
  criadoPor: z.string().nullish(),
  atualizadoEm: z.string().nullish(),
  atualizadoPor: z.string().nullish(),
});
