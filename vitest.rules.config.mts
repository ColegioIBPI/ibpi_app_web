import { defineConfig } from "vitest/config";

/**
 * Configuração separada para os testes das Security Rules.
 *
 * Eles rodam contra o emulador do Firestore, em ambiente Node (sem jsdom) e
 * em sequência — testes paralelos limpariam o banco uns dos outros.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
