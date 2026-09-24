/**
 * Gráfico de médias por disciplina, como no boletim do colégio.
 *
 * É SVG, e não uma biblioteca de gráficos: são onze barras e uma escala
 * fixa de 0 a 10, e o gráfico precisa sair na impressão — biblioteca que
 * desenha em canvas costuma sair branca no papel.
 */

export interface BarraDoGrafico {
  nome: string;
  media: number | null;
}

const LARGURA = 620;
const ALTURA = 225;
// A esquerda é larga por causa do rótulo inclinado: "Português/Literatura"
// desce para fora da área do gráfico e seria cortado pelo viewBox.
const MARGEM = { topo: 6, direita: 8, base: 78, esquerda: 52 };

export function GraficoDeMedias({ linhas }: { linhas: BarraDoGrafico[] }) {
  const area = {
    largura: LARGURA - MARGEM.esquerda - MARGEM.direita,
    altura: ALTURA - MARGEM.topo - MARGEM.base,
  };

  const passo = linhas.length > 0 ? area.largura / linhas.length : 0;
  const larguraDaBarra = Math.min(22, passo * 0.45);

  const y = (valor: number) =>
    MARGEM.topo + area.altura - (valor / 10) * area.altura;

  return (
    <div className="rounded border border-[#BFBFBF] p-1">
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label="Média anual por disciplina"
        className="h-auto w-full"
      >
        {/* Escala 0 a 10, como no boletim impresso. */}
        {Array.from({ length: 11 }, (_, i) => i).map((valor) => (
          <g key={valor}>
            <line
              x1={MARGEM.esquerda}
              x2={LARGURA - MARGEM.direita}
              y1={y(valor)}
              y2={y(valor)}
              stroke="#D9D9D9"
              strokeWidth={0.6}
            />
            <text
              x={MARGEM.esquerda - 4}
              y={y(valor) + 3}
              textAnchor="end"
              fontSize={8}
              fill="#000"
            >
              {valor.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </text>
          </g>
        ))}

        {linhas.map((linha, indice) => {
          const centro = MARGEM.esquerda + passo * (indice + 0.5);
          const altura = linha.media === null ? 0 : (linha.media / 10) * area.altura;

          return (
            <g key={`${linha.nome}-${indice}`}>
              {altura > 0 && (
                <rect
                  x={centro - larguraDaBarra / 2}
                  y={y(linha.media ?? 0)}
                  width={larguraDaBarra}
                  height={altura}
                  fill="#4472C4"
                />
              )}

              {/* Rótulo inclinado: onze nomes de disciplina não cabem
                  na horizontal, e é assim que o boletim atual os mostra. */}
              <text
                x={centro}
                y={MARGEM.topo + area.altura + 6}
                fontSize={8}
                fill="#000"
                textAnchor="end"
                transform={`rotate(-45 ${centro} ${MARGEM.topo + area.altura + 6})`}
              >
                {linha.nome}
              </text>
            </g>
          );
        })}

        <line
          x1={MARGEM.esquerda}
          x2={LARGURA - MARGEM.direita}
          y1={y(0)}
          y2={y(0)}
          stroke="#548235"
          strokeWidth={1.6}
        />
      </svg>
    </div>
  );
}
