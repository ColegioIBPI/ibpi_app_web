import type { Metadata } from "next";

import { exigirPermissao } from "@/core/auth/guards";
import { rotuloDoPerfil } from "@/core/auth/roles";
import { IndiceDaAjuda } from "@/features/ajuda/components/indice";
import { TOPICOS } from "@/features/ajuda/domain/topicos";

export const metadata: Metadata = { title: "Ajuda" };

/**
 * A Ajuda do sistema.
 *
 * O manual do colégio, dentro do Portal e atrás do login — não um arquivo
 * que alguém precisa lembrar onde guardou. Estar aqui dentro também
 * permite o que um documento solto não faz: saber quem está lendo, e
 * oferecer primeiro o que é da função dela.
 */
export default async function AjudaPage() {
  // `cadastros: ler` é o menor denominador da equipe — todo perfil de
  // gestão tem. A Ajuda não protege nada: o conteúdo explica as regras,
  // e quem as aplica é a matriz de acesso, não esta tela.
  const sessao = await exigirPermissao("cadastros", "ler");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-ink text-xl font-semibold">Ajuda</h1>
        <p className="text-ink-muted mt-1 max-w-prose text-sm">
          Não é uma lista de botões: é a explicação de{" "}
          <strong className="font-medium">
            por que o sistema se comporta como se comporta
          </strong>
          . Quase toda dúvida nasce de uma regra que faz sentido e que
          ninguém contou.
        </p>
        <p className="text-ink-muted mt-2 text-sm">
          Você está como {rotuloDoPerfil(sessao.role)}.
        </p>
      </div>

      <IndiceDaAjuda topicos={TOPICOS} role={sessao.role} />
    </div>
  );
}
