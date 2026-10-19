import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Os testes E2E são do Playwright; o Vitest não deve tentar executá-los.
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    /**
     * 15 s, e não os 5 s de fábrica.
     *
     * Os testes de componente que **digitam** estouravam o limite quando a
     * suíte inteira roda em paralelo — e falhavam por timeout, nunca por
     * asserção. Não é lentidão do produto: é o jsdom somado à concorrência
     * entre os workers, e o mesmo teste passa em milissegundos sozinho.
     *
     * Um limite curto demais transforma carga da máquina em falha
     * intermitente, e falha intermitente ensina a ignorar teste vermelho.
     */
    testTimeout: 15_000,
  },
});
