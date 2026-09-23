import { FileText, ImageIcon } from "lucide-react";

import type { Anexo } from "@/core/modelo";
import { ehImagem, formatar, urlDoAnexo } from "@/features/avisos/domain/anexo";

/** Lista de anexos, apontando sempre para a rota autenticada. */
export function AnexosDoAviso({
  avisoId,
  anexos,
}: {
  avisoId: string;
  anexos: Anexo[];
}) {
  return (
    <ul className="divide-line divide-y text-sm">
      {anexos.map((anexo, indice) => {
        const Icone = ehImagem(anexo.tipo) ? ImageIcon : FileText;

        return (
          <li key={anexo.path} className="flex items-center gap-3 py-2.5">
            <Icone className="text-ink-muted size-4 shrink-0" aria-hidden />
            <a
              href={urlDoAnexo(avisoId, indice)}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 truncate hover:underline"
            >
              {anexo.nome}
            </a>
            <span className="text-ink-muted ml-auto shrink-0 text-xs">
              {formatar(anexo.tamanho)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
