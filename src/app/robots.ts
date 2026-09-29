import type { MetadataRoute } from "next";

/**
 * Nada daqui é indexado.
 *
 * O `layout.tsx` já manda `robots: { index: false }` na `<meta>`, mas a meta
 * só chega ao buscador **depois** de ele carregar a página. O `robots.txt` é
 * lido antes, e vale também para o que não é HTML — as rotas de exportação,
 * por exemplo, que devolvem planilha.
 *
 * Isso não é controle de acesso: robô mal-educado ignora as duas coisas.
 * É para o buscador bem-comportado não deixar uma matrícula em cache
 * público.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
