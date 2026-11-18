import Image from "next/image";

import { formatDate, formatGrade } from "@/core/lib/format";
import {
  ROTULOS_DE_SITUACAO,
  type BoletimManual,
  type ColunaDoBoletim,
  type Dependencia,
  type Eletiva,
  type LinhaDoBoletim,
  type ProjetoBilingue,
  type SituacaoFinal,
} from "@/core/modelo";
import { GraficoDeMedias } from "@/features/notas/components/grafico-de-medias";
import {
  linhaDoBilingue,
  ordenarDisciplinas,
} from "@/features/notas/domain/boletim";
import {
  colunaVisivel,
  rotuloDaColuna,
} from "@/features/notas/domain/boletim-manual";

/**
 * Boletim escolar, no formato que o colégio emite.
 *
 * Reproduz o `boletim_resultado.pdf`: A4 **deitado**, cabeçalho oficial,
 * faixa de identificação, a grade de disciplinas com os três trimestres, os
 * blocos de Projeto Bilíngue, eletivas e dependências, e o gráfico de
 * médias.
 *
 * O documento é o mesmo na tela e no papel — é ele que a família recebe, e
 * manter duas versões é como as duas acabam divergindo.
 */

export interface BoletimProps {
  nome: string;
  matricula: string;
  segmentoRotulo: string | null;
  serie: string | null;
  turmaCodigo: string | null;
  anoLetivo: number;
  dataMatricula: string | null;
  disciplinas: LinhaDoBoletim[];
  faltasPorTrimestre: Record<string, number>;
  percentualDeFrequencia: number | null;
  situacao: SituacaoFinal;
  projetoBilingue?: ProjetoBilingue | null;
  eletivas?: Eletiva[];
  dependencias?: Dependencia[];
  observacoes?: string | null;
  /**
   * Rótulos e colunas escondidas, quando o que está sendo impresso é o
   * **boletim 2**. Ausentes, vale o quadro do colégio — e a saída é
   * exatamente a de antes deste recurso existir.
   */
  rotulos?: BoletimManual["rotulos"];
  ocultas?: ColunaDoBoletim[];
}

const TRIMESTRES = ["1", "2", "3"] as const;
const AVALIACOES = ["projeto", "tarefas", "av"] as const;

/**
 * Posição do Projeto Bilíngue na grade.
 *
 * Ele não é uma disciplina da coleção `disciplinas` — é um bloco próprio —,
 * então a posição dele não vem do cadastro. No boletim do colégio ele fica
 * em 11º, entre Projeto de Vida e Educação Física.
 */
const ORDEM_DO_BILINGUE = 110;

/** Linhas em branco que o formulário impresso sempre tem, para preencher à mão. */
const LINHAS_DE_ELETIVA = 6;
const LINHAS_DE_DEPENDENCIA = 8;

export function Boletim({
  nome,
  matricula,
  segmentoRotulo,
  serie,
  turmaCodigo,
  anoLetivo,
  dataMatricula,
  disciplinas,
  faltasPorTrimestre,
  projetoBilingue,
  eletivas = [],
  dependencias = [],
  observacoes,
  rotulos,
  ocultas,
}: BoletimProps) {
  const bilingue = linhaDoBilingue(projetoBilingue);

  // O Projeto Bilíngue é uma linha da grade cuja nota vem do bloco próprio.
  // No boletim do colégio ele fica entre Projeto de Vida e Educação Física.
  const grade: LinhaDoBoletim[] = ordenarDisciplinas([
    ...disciplinas,
    ...(projetoBilingue?.componentes?.length
      ? [
          {
            disciplinaId: "__bilingue",
            disciplinaNome: "Projeto Bilíngue",
            ordem: ORDEM_DO_BILINGUE,
            trimestres: {},
            mediasPorTrimestre: bilingue.mediasPorTrimestre,
            mediaAnual: bilingue.mediaAnual,
            mediaParcial: bilingue.mediaParcial,
            recuperacao: null,
            mediaFinal: bilingue.mediaAnual,
            faltas: 0,
            situacao: "cursando" as SituacaoFinal,
          },
        ]
      : []),
  ]);

  return (
    <article className="boletim text-[10px] leading-tight text-black">
      <Image
        src="/brand/boletim-cabecalho.jpg"
        alt="Colégio IBPI — Boletim Escolar"
        width={2000}
        height={190}
        priority
        className="mb-1 h-auto w-full"
      />

      <Identificacao
        nome={nome}
        matricula={matricula}
        segmentoRotulo={segmentoRotulo}
        serie={serie}
        turmaCodigo={turmaCodigo}
      />

      <Faixa>BOLETIM {anoLetivo}</Faixa>

      <GradeDeDisciplinas
        linhas={grade}
        faltasPorTrimestre={faltasPorTrimestre}
        rotulos={rotulos}
        ocultas={ocultas}
      />

      <p className="mt-0.5 mb-1 text-right text-[9px]">
        Matriculado em: {dataMatricula ? formatDate(dataMatricula) : "—"}
      </p>

      <div className="grid grid-cols-[minmax(0,42%)_minmax(0,58%)] gap-2">
        <div className="flex flex-col gap-2">
          <BlocoBilingue projeto={projetoBilingue} />
          <BlocoEletivas eletivas={eletivas} />
          <BlocoDependencias dependencias={dependencias} />
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <p className="mb-0.5 font-bold">OBSERVAÇÕES:</p>
            <div className="min-h-[3.5rem] bg-[#D9E2F3] p-1.5 whitespace-pre-line">
              {observacoes ?? ""}
            </div>
          </div>

          <GraficoDeMedias
            linhas={grade.map((linha) => ({
              nome: linha.disciplinaNome,
              media: linha.mediaParcial,
            }))}
          />
        </div>
      </div>

      <footer className="mt-1 flex items-center justify-between text-[9px] font-bold">
        <span>Boletim para simples conferência — sem valor legal</span>
        <span>{formatDate(new Date())}</span>
      </footer>
    </article>
  );
}

function Identificacao({
  nome,
  matricula,
  segmentoRotulo,
  serie,
  turmaCodigo,
}: Pick<
  BoletimProps,
  "nome" | "matricula" | "segmentoRotulo" | "serie" | "turmaCodigo"
>) {
  const caixa =
    "border-2 border-[#ED7D31] px-2 py-0.5 text-center font-bold uppercase";

  return (
    <div className="mb-0.5 flex flex-col gap-0.5">
      <div className="grid grid-cols-[1fr_9rem] gap-0.5">
        <div className={`${caixa} text-[13px]`}>{nome}</div>
        <div className={caixa}>{matricula}</div>
      </div>

      <div className="grid grid-cols-[1fr_9rem_9rem] gap-0.5">
        <div className={caixa}>{segmentoRotulo ?? "—"}</div>
        <div className={caixa}>{rotuloDaSerie(serie)}</div>
        <div className={caixa}>{turmaCodigo ?? "—"}</div>
      </div>
    </div>
  );
}

/**
 * `"2"` vira `"2ª SÉRIE"`, como o boletim do colégio escreve. Texto que já
 * venha escrito por extenso passa direto.
 */
function rotuloDaSerie(serie: string | null): string {
  if (!serie) return "—";

  return /^\d+$/.test(serie.trim()) ? `${serie.trim()}ª SÉRIE` : serie;
}

function Faixa({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#8EAADB] py-0.5 text-center text-[12px] font-bold">
      {children}
    </div>
  );
}

/**
 * A grade de notas.
 *
 * **Sem a coluna META.** Ela existia na planilha do colégio para alimentar
 * o gráfico, e era um número fixo repetido em toda linha — informação
 * nenhuma para quem lê o boletim, e uma coluna a mais disputando largura
 * num documento que já é apertado. O gráfico nunca a usou aqui.
 */
function GradeDeDisciplinas({
  linhas,
  faltasPorTrimestre,
  rotulos,
  ocultas,
}: {
  linhas: LinhaDoBoletim[];
  faltasPorTrimestre: Record<string, number>;
  rotulos?: BoletimManual["rotulos"];
  ocultas?: ColunaDoBoletim[];
}) {
  const rotulo = (coluna: ColunaDoBoletim) => rotuloDaColuna(coluna, rotulos);

  /*
    As colunas que sobram depois do que a secretaria escondeu no boletim
    2. No boletim calculado `ocultas` não existe, e todas ficam — a saída
    é exatamente a de antes.

    `media` e `mediaFinal` não entram no filtro: sem elas o quadro deixa
    de ser boletim (ver `COLUNAS_OBRIGATORIAS`).
  */
  const doTrimestre = AVALIACOES.filter((campo) => colunaVisivel(campo, ocultas));
  const colunasDoTrimestre = [...doTrimestre, "media" as const];

  const finais = (
    [
      { coluna: "total", campo: "mediaParcial" },
      { coluna: "recuperacao", campo: "recuperacao" },
      { coluna: "mediaFinal", campo: "mediaFinal" },
      { coluna: "situacao", campo: "situacao" },
    ] as const
  ).filter((item) => colunaVisivel(item.coluna, ocultas));

  return (
    <table className="w-full table-fixed border-separate border-spacing-[1px]">
      <caption className="sr-only">
        Notas por disciplina e trimestre, média anual e situação
      </caption>

      {/*
        As larguras somam mais de 100% desde sempre — o navegador
        normaliza. Por isso esconder uma coluna não exige recalcular
        nada: as que ficam se redistribuem sozinhas.
      */}
      <colgroup>
        <col className="w-[19%]" />
        {TRIMESTRES.map((t) =>
          colunasDoTrimestre.map((campo) => (
            <col key={`${t}-${campo}`} className="w-[5.2%]" />
          )),
        )}
        {finais.map((item) => (
          <col
            key={item.coluna}
            className={item.coluna === "situacao" ? "w-[11%]" : "w-[6%]"}
          />
        ))}
      </colgroup>

      <thead>
        <tr>
          <td />
          {TRIMESTRES.map((t) => (
            <th
              key={t}
              scope="colgroup"
              colSpan={colunasDoTrimestre.length}
              className="bg-[#F8CBAD] py-0.5 text-center text-[9px] font-bold"
            >
              {t}º TRI
            </th>
          ))}
          <td colSpan={finais.length} />
        </tr>

        <tr>
          <th
            scope="col"
            className="bg-[#8EAADB] py-0.5 text-center text-[9px] font-bold"
          >
            {rotulo("disciplina")}
          </th>

          {TRIMESTRES.map((t) => (
            <Cabecalhos key={t} colunas={colunasDoTrimestre} rotulo={rotulo} />
          ))}

          {finais.map((item) => (
            <th
              key={item.coluna}
              scope="col"
              className="bg-[#B4C6E7] py-0.5 text-center text-[9px] font-bold"
            >
              {rotulo(item.coluna)}
            </th>
          ))}

        </tr>
      </thead>

      <tbody>
        {linhas.map((linha, indice) => {
          const fundo = indice % 2 === 0 ? "bg-[#D9E2F3]" : "bg-[#FCE4D6]";

          return (
            <tr key={linha.disciplinaId}>
              <th
                scope="row"
                className={`${fundo} px-1 py-[1px] text-right text-[9px] font-bold`}
              >
                {linha.disciplinaNome}
              </th>

              {TRIMESTRES.map((t) => (
                <Trimestre
                  key={t}
                  fundo={fundo}
                  colunas={doTrimestre}
                  avaliacoes={linha.trimestres?.[t]}
                  media={linha.mediasPorTrimestre?.[t] ?? null}
                />
              ))}

              {finais.map((item) =>
                item.campo === "situacao" ? (
                  <td
                    key={item.coluna}
                    className={`${fundo} text-center text-[9px] font-bold`}
                  >
                    {linha.mediaAnual === null
                      ? ""
                      : ROTULOS_DE_SITUACAO[linha.situacao]}
                  </td>
                ) : (
                  <Celula
                    key={item.coluna}
                    fundo={fundo}
                    negrito={item.campo !== "recuperacao"}
                    valor={linha[item.campo]}
                  />
                ),
              )}
            </tr>
          );
        })}

        {colunaVisivel("faltas", ocultas) && (
          <tr>
            <th
              scope="row"
              className="bg-[#D9E2F3] px-1 py-[1px] text-right text-[9px] font-bold"
            >
              {rotulo("faltas")}
            </th>

            {TRIMESTRES.map((t) => (
              <Faltas
                key={t}
                vazias={doTrimestre.length}
                total={faltasPorTrimestre[t] ?? 0}
              />
            ))}

            <td colSpan={finais.length} />
          </tr>
        )}
      </tbody>
    </table>
  );
}

function Cabecalhos({
  colunas,
  rotulo,
}: {
  colunas: readonly ColunaDoBoletim[];
  rotulo: (coluna: ColunaDoBoletim) => string;
}) {
  return (
    <>
      {colunas.map((coluna) => (
        <th
          key={coluna}
          scope="col"
          className="bg-[#B4C6E7] px-px py-0.5 text-center text-[7px] font-bold"
        >
          {rotulo(coluna)}
        </th>
      ))}
    </>
  );
}

function Trimestre({
  fundo,
  colunas,
  avaliacoes,
  media,
}: {
  fundo: string;
  colunas: readonly (typeof AVALIACOES)[number][];
  avaliacoes?: { projeto: number | null; tarefas: number | null; av: number | null };
  media: number | null;
}) {
  return (
    <>
      {colunas.map((campo) => (
        <Celula key={campo} fundo={fundo} valor={avaliacoes?.[campo] ?? null} />
      ))}
      <Celula fundo={fundo} negrito valor={media} />
    </>
  );
}

/**
 * Célula de nota.
 *
 * Nota ausente fica **em branco**, e não com travessão: o boletim impresso
 * tem a célula vazia, e um travessão em toda a grade de um aluno do 1º
 * trimestre polui o documento inteiro.
 */
function Celula({
  fundo,
  valor,
  negrito,
}: {
  fundo: string;
  valor: number | null;
  negrito?: boolean;
}) {
  return (
    <td
      className={`${fundo} text-center text-[9px] tabular-nums ${negrito ? "font-bold" : ""}`}
    >
      {valor === null ? "" : formatGrade(valor)}
    </td>
  );
}

/**
 * As faltas do trimestre ficam na coluna da média, como na planilha.
 *
 * `vazias` é quantas colunas de avaliação sobraram antes dela — três no
 * boletim do colégio, menos quando o boletim 2 esconde alguma.
 */
function Faltas({ vazias, total }: { vazias: number; total: number }) {
  return (
    <>
      {vazias > 0 && <td colSpan={vazias} />}
      <td className="bg-[#D9E2F3] text-center text-[9px] font-bold tabular-nums">
        {total > 0 ? total : ""}
      </td>
    </>
  );
}

function BlocoBilingue({ projeto }: { projeto?: ProjetoBilingue | null }) {
  const componentes = projeto?.componentes ?? [];
  const nomes = ["STEAM", "ENGLISH", "PROJECT"] as const;

  return (
    <table className="w-full table-fixed border-separate border-spacing-[1px]">
      <caption className="sr-only">Projeto Bilíngue por trimestre</caption>
      <thead>
        <tr>
          <th colSpan={5} className="bg-[#8EAADB] py-0.5 text-center font-bold">
            PROJETO BILÍNGUE
          </th>
        </tr>
        <tr>
          <th scope="col" className="w-[28%] bg-[#F4B183] py-0.5 text-center text-[9px] font-bold">
            {projeto?.nivel ? `IBEU ${projeto.nivel}` : "IBEU"}
          </th>
          {["1º TRI", "2º TRI", "3º TRI", "REC"].map((titulo) => (
            <th
              key={titulo}
              scope="col"
              className="bg-[#F4B183] py-0.5 text-center text-[9px] font-bold"
            >
              {titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {nomes.map((nome, indice) => {
          const componente = componentes.find((c) => c.nome === nome);
          const fundo = indice % 2 === 0 ? "bg-[#D9E2F3]" : "bg-[#FCE4D6]";

          return (
            <tr key={nome}>
              <th
                scope="row"
                className={`${fundo} px-1 py-[1px] text-right text-[9px] font-bold`}
              >
                {nome}
              </th>
              {TRIMESTRES.map((t) => (
                <Celula
                  key={t}
                  fundo={fundo}
                  valor={componente?.trimestres?.[t] ?? null}
                />
              ))}
              <Celula fundo={fundo} valor={componente?.recuperacao ?? null} />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function BlocoEletivas({ eletivas }: { eletivas: Eletiva[] }) {
  const linhas = [
    ...eletivas,
    ...Array.from(
      { length: Math.max(0, LINHAS_DE_ELETIVA - eletivas.length) },
      () => null,
    ),
  ];

  return (
    <table className="w-full table-fixed border-separate border-spacing-[1px]">
      <caption className="sr-only">Eletivas cursadas</caption>
      <thead>
        <tr>
          <th scope="col" className="w-[62%] bg-[#8EAADB] py-0.5 text-center font-bold">
            ELETIVA
          </th>
          <th scope="col" className="bg-[#8EAADB] py-0.5 text-center font-bold">
            SITUAÇÃO
          </th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((eletiva, indice) => {
          const fundo = indice % 2 === 0 ? "bg-[#D9E2F3]" : "bg-[#FCE4D6]";

          return (
            <tr key={indice}>
              <td className={`${fundo} px-1 py-[1px] text-center text-[9px] font-bold`}>
                {eletiva
                  ? `${eletiva.nome}${eletiva.periodo ? ` ${eletiva.periodo}` : ""}`.toUpperCase()
                  : " "}
              </td>
              <td className={`${fundo} text-center text-[9px] font-bold`}>
                {eletiva ? ROTULOS_DE_ELETIVA[eletiva.situacao] : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const ROTULOS_DE_ELETIVA: Record<Eletiva["situacao"], string> = {
  cursando: "CURSANDO",
  concluida: "CONCLUÍDA",
  cancelada: "CANCELADA",
};

function BlocoDependencias({ dependencias }: { dependencias: Dependencia[] }) {
  const linhas = [
    ...dependencias,
    ...Array.from(
      { length: Math.max(0, LINHAS_DE_DEPENDENCIA - dependencias.length) },
      () => null,
    ),
  ];

  return (
    <table className="w-full table-fixed border-separate border-spacing-[1px]">
      <caption className="sr-only">Dependência e reclassificação</caption>
      <thead>
        <tr>
          <th colSpan={7} className="bg-[#8EAADB] py-0.5 text-center font-bold italic">
            DEPENDÊNCIA/RECLASSIFICAÇÃO
          </th>
        </tr>
        <tr>
          <th scope="col" className="w-[32%] bg-[#B4C6E7] py-0.5 text-center text-[9px] font-bold">
            DISCIPLINA
          </th>
          {["P1", "P2", "TOTAL", "REC", "MÉDIA"].map((titulo) => (
            <th
              key={titulo}
              scope="col"
              className="bg-[#B4C6E7] py-0.5 text-center text-[9px] font-bold"
            >
              {titulo}
            </th>
          ))}
          <th scope="col" className="w-[20%] bg-[#B4C6E7] py-0.5 text-center text-[9px] font-bold">
            SITUAÇÃO
          </th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((dependencia, indice) => {
          const fundo = indice % 2 === 0 ? "bg-[#D9E2F3]" : "bg-[#FCE4D6]";

          return (
            <tr key={indice}>
              <td className={`${fundo} px-1 py-[1px] text-center text-[9px] font-bold`}>
                {dependencia?.disciplinaNome ?? " "}
              </td>
              <Celula fundo={fundo} valor={dependencia?.p1 ?? null} />
              <Celula fundo={fundo} valor={dependencia?.p2 ?? null} />
              <Celula fundo={fundo} valor={dependencia?.total ?? null} />
              <Celula fundo={fundo} valor={dependencia?.recuperacao ?? null} />
              <Celula fundo={fundo} negrito valor={dependencia?.media ?? null} />
              <td className={`${fundo} text-center text-[9px] font-bold`}>
                {dependencia ? ROTULOS_DE_SITUACAO[dependencia.situacao] : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
