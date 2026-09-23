/**
 * Cálculo do que mudou entre duas versões de um documento.
 *
 * A trilha de auditoria guarda **só os campos alterados**, com valor antes e
 * depois. Guardar o documento inteiro a cada edição inflaria a coleção e,
 * pior, esconderia a informação que importa: numa contestação de nota, o
 * colégio precisa responder "quem mudou o quê", não "como estava o cadastro
 * naquele dia".
 *
 * Função pura — é o que permite testar cada formato de mudança sem banco.
 */

export interface Alteracao {
  de: unknown;
  para: unknown;
}

export type Alteracoes = Record<string, Alteracao>;

/**
 * Compara recursivamente, devolvendo caminhos com ponto
 * (`contato.endereco.cidade`).
 *
 * Campos ausentes nos dois lados não aparecem; `null` e `undefined` são
 * tratados como o mesmo "sem valor", porque o Firestore devolve `undefined`
 * para campo que nunca existiu e o formulário manda `null` para campo
 * apagado — não é uma alteração de verdade.
 */
export function calcularAlteracoes(
  antes: unknown,
  depois: unknown,
  prefixo = "",
): Alteracoes {
  const alteracoes: Alteracoes = {};

  if (!ehObjeto(antes) || !ehObjeto(depois)) {
    if (!saoIguais(antes, depois)) {
      alteracoes[prefixo || "valor"] = {
        de: normalizar(antes),
        para: normalizar(depois),
      };
    }
    return alteracoes;
  }

  for (const chave of new Set([
    ...Object.keys(antes),
    ...Object.keys(depois),
  ])) {
    const caminho = prefixo ? `${prefixo}.${chave}` : chave;
    const valorAntes = antes[chave];
    const valorDepois = depois[chave];

    if (ehObjeto(valorAntes) && ehObjeto(valorDepois)) {
      Object.assign(
        alteracoes,
        calcularAlteracoes(valorAntes, valorDepois, caminho),
      );
      continue;
    }

    if (!saoIguais(valorAntes, valorDepois)) {
      alteracoes[caminho] = {
        de: normalizar(valorAntes),
        para: normalizar(valorDepois),
      };
    }
  }

  return alteracoes;
}

export function houveAlteracao(alteracoes: Alteracoes): boolean {
  return Object.keys(alteracoes).length > 0;
}

/**
 * Ignora campos que o próprio sistema escreve.
 *
 * Sem isto, toda edição registraria "atualizadoEm mudou" — ruído que
 * atrapalha quem procura a mudança real.
 */
const CAMPOS_TECNICOS = new Set([
  "atualizadoEm",
  "atualizadoPor",
  "criadoEm",
  "criadoPor",
  "migradoEm",
  "nomeParaBusca",
  "origem",
]);

export function semCamposTecnicos(alteracoes: Alteracoes): Alteracoes {
  return Object.fromEntries(
    Object.entries(alteracoes).filter(([caminho]) => {
      const ultimo = caminho.split(".").at(-1) ?? caminho;
      return !CAMPOS_TECNICOS.has(ultimo);
    }),
  );
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor) &&
    !(valor instanceof Date)
  );
}

function saoIguais(a: unknown, b: unknown): boolean {
  const na = normalizar(a);
  const nb = normalizar(b);

  if (Array.isArray(na) && Array.isArray(nb)) {
    return (
      na.length === nb.length && na.every((item, i) => saoIguais(item, nb[i]))
    );
  }

  return na === nb;
}

/** `undefined`, `null` e string vazia são o mesmo "sem valor". */
function normalizar(valor: unknown): unknown {
  if (valor === undefined || valor === "") return null;
  if (valor instanceof Date) return valor.toISOString();
  return valor;
}
