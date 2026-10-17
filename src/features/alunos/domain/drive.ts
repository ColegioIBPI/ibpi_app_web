/**
 * A pasta do aluno no Drive do colégio.
 *
 * A secretaria cola o link que copiou do Drive; o sistema guarda o **id** e
 * monta a URL de novo na hora de abrir.
 *
 * Guardar o link inteiro parece mais simples e é pior, por causa do `/u/4/`
 * que aparece nele: esse número é o **índice da conta Google de quem
 * copiou**, não da pasta. Salvo como veio, mandaria quem tem o
 * `suporte2@` em outra posição para a conta errada — e o Drive responderia
 * "você não tem acesso" a uma pasta que a pessoa acessa todo dia.
 * Normalizar para `/drive/folders/{id}` deixa o Google escolher a conta.
 */

/** Ids de Drive são base64url e nunca curtos. */
const ID = /^[A-Za-z0-9_-]{10,}$/;

/**
 * O id da pasta dentro do que a pessoa colou.
 *
 * Aceita as formas que o Drive realmente produz — o link do botão
 * "Compartilhar", o da barra de endereços com a conta no meio, o `open?id=`
 * antigo — e também o id digitado sozinho, porque é o que acontece quando
 * alguém copia só um pedaço.
 */
export function extrairPastaDoDrive(texto: string): string | null {
  const valor = texto.trim();
  if (!valor) return null;

  const porCaminho = valor.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (porCaminho) return porCaminho[1];

  const porParametro = valor.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (porParametro) return porParametro[1];

  // Um id solto. A validação do formato evita guardar `my-drive` ou um
  // pedaço de frase como se fosse pasta.
  return ID.test(valor) ? valor : null;
}

/** A URL para abrir a pasta, montada a partir do id. */
export function urlDaPasta(pastaId: string): string {
  return `https://drive.google.com/drive/folders/${pastaId}`;
}
