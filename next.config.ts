import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança, aplicados a toda resposta.
 *
 * O alvo aqui é a **sessão de quem já entrou**. Um ataque contra este
 * sistema não precisa descobrir senha: basta conseguir que a secretaria,
 * logada, clique em algo que aja em nome dela.
 */
const CABECALHOS = [
  /**
   * Ninguém embute o Portal num iframe.
   *
   * Sem isto, um site qualquer carrega o Portal invisível por cima de um
   * botão e a secretaria, já logada, clica em "apagar" achando que clicou em
   * outra coisa. `frame-ancestors` é a forma moderna; o `X-Frame-Options`
   * abaixo cobre navegador antigo.
   */
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'none'",
      // Impede que um `<base>` injetado reescreva para onde vão os links e
      // os formulários da página.
      "base-uri 'self'",
      // Server Action e formulário só postam para o próprio domínio.
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },

  /**
   * Um ano de HTTPS obrigatório.
   *
   * O cookie de sessão já é `Secure`, mas a **primeira** visita digitada sem
   * `https://` ainda sairia em texto claro. Com HSTS, o navegador nem tenta.
   */
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },

  // Navegador não "adivinha" o tipo do arquivo: um upload de aluno servido
  // como imagem não vira script por causa do conteúdo.
  { key: "X-Content-Type-Options", value: "nosniff" },

  /**
   * A URL não vaza para fora do domínio.
   *
   * Os caminhos daqui carregam matrícula (`/gestao/alunos/26029`). Sem isso,
   * clicar num link externo manda essa matrícula no `Referer` para o site de
   * destino.
   */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Nada aqui precisa de câmera, microfone ou localização. Negar por
  // escrito evita que um script de terceiro peça em nome do Portal.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Não anuncia a versão do Next: é informação que só serve para quem está
  // procurando uma falha conhecida.
  poweredByHeader: false,

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

  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS }];
  },
};

export default nextConfig;
