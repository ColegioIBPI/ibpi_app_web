/**
 * Acessos do aluno às plataformas — as regras que não são de tela.
 *
 * **O que a escola relatou:** ao abrir a ficha de um aluno, os campos de
 * usuário e senha apareciam preenchidos com o acesso **da própria pessoa
 * logada**. O banco não tinha nenhum documento de credenciais quando isso
 * aconteceu, então não havia o que o sistema pudesse ter mostrado: quem
 * preencheu foi o **gerenciador de senhas do navegador**, que lê um campo
 * de texto seguido de um campo de senha como formulário de login.
 *
 * A tela foi corrigida para não parecer um login (ver `components/acessos`).
 * Esta verificação existe para o caso de o navegador preencher mesmo
 * assim, porque a consequência é séria e silenciosa: salvar grava a senha
 * do Portal de quem estava atendendo dentro do cadastro do aluno — e **a
 * família lê esse campo**, no Portal e no aplicativo.
 */

/**
 * Algum usuário informado é o login de quem está salvando?
 *
 * Compara sem diferenciar maiúsculas e ignorando espaços, porque o
 * preenchimento automático do navegador repete o endereço exatamente como
 * foi salvo — e um espaço a mais não torna o engano menos engano.
 *
 * Só olha os campos de **usuário**: a senha não se compara, porque o
 * sistema nunca conhece a senha do Portal de ninguém (o Firebase guarda
 * hash). Pegar o usuário basta para reconhecer o acidente.
 */
export function usuarioEhDeQuemSalva(
  usuarios: ReadonlyArray<string | null | undefined>,
  emailDoAutor: string,
): boolean {
  const login = emailDoAutor.trim().toLowerCase();
  if (!login) return false;

  return usuarios.some((usuario) => usuario?.trim().toLowerCase() === login);
}
