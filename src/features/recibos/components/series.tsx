"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SerieDeRecibos } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { TextField } from "@/core/ui/field";
import { abrirSerie, alternarSerie } from "@/features/recibos/actions/recibos";

/**
 * Os talões de recibo.
 *
 * O campo que importa é o **próximo número**: o colégio já tem talão de
 * papel, e começar do 1 criaria recibos com número que já existe numa
 * gaveta. Quem está no 847 abre a série informando 848.
 *
 * A série não se apaga, se encerra: os recibos dela continuam sendo
 * procurados depois de o talão fechar.
 */
export function SeriesDeRecibo({
  series,
  podeGerenciar,
}: {
  series: SerieDeRecibos[];
  podeGerenciar: boolean;
}) {
  const router = useRouter();

  const [serie, setSerie] = useState("");
  const [descricao, setDescricao] = useState("");
  const [proximoNumero, setProximoNumero] = useState("1");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function abrir() {
    setErro(null);
    setSalvando(true);

    try {
      const resultado = await abrirSerie({
        serie,
        descricao: descricao.trim() || null,
        proximoNumero: Number(proximoNumero),
      });

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível abrir a série.");
        return;
      }

      setSerie("");
      setDescricao("");
      setProximoNumero("1");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(alvo: SerieDeRecibos) {
    setErro(null);

    const resultado = await alternarSerie({
      serie: alvo.serie,
      ativa: !alvo.ativa,
    });

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível alterar a série.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      {series.length === 0 ? (
        <p className="text-ink-muted text-sm">
          Nenhum talão aberto. Sem série não há numeração, e sem numeração não
          há recibo.
        </p>
      ) : (
        <ul className="divide-line divide-y text-sm">
          {series.map((talao) => (
            <li
              key={talao.serie}
              className="flex flex-wrap items-center justify-between gap-3 py-2.5"
            >
              <div>
                <span className="text-ink font-medium">Série {talao.serie}</span>
                {talao.descricao && (
                  <span className="text-ink-muted ml-2 text-xs">
                    {talao.descricao}
                  </span>
                )}
                <span className="text-ink-muted block text-xs">
                  Próximo nº {talao.proximoNumero}
                  {talao.ativa ? "" : " · encerrada"}
                </span>
              </div>

              {podeGerenciar && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => alternar(talao)}
                >
                  {talao.ativa ? "Encerrar" : "Reabrir"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeGerenciar && (
        <div className="border-line flex flex-col gap-3 border-t pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label="Série"
              hint="A, B, 2026."
              value={serie}
              onChange={(evento) => setSerie(evento.target.value)}
            />
            <TextField
              label="Descrição"
              hint="Opcional."
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
            />
            <TextField
              label="Próximo número"
              type="number"
              min={1}
              hint="Se o talão de papel está no 847, informe 848."
              value={proximoNumero}
              onChange={(evento) => setProximoNumero(evento.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={abrir}
              loading={salvando}
              disabled={!serie.trim()}
            >
              Abrir talão
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
