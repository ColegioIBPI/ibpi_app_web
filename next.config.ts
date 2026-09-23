import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * O padrão é 1 MB, e a foto do aluno pode chegar a 8 MB — foto de
       * celular passa de 5 MB com facilidade. O limite aqui fica um pouco
       * acima do que a tela aceita, para cobrir o envelope do multipart.
       *
       * O tamanho útil continua sendo validado em
       * `features/alunos/domain/foto.ts`; este número é só o teto do
       * transporte.
       */
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
