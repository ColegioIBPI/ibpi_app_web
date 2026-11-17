# Como o sistema funciona — o manual mudou de lugar

O manual da equipe do colégio **agora vive dentro do Portal**, em
`Gestão › Ajuda`, e o conteúdo está em
[`src/features/ajuda/domain/topicos.ts`](../src/features/ajuda/domain/topicos.ts).

## Por que saiu daqui

Duas razões, e as duas doem na prática:

**Ajuda que exige ir procurar em outro lugar é ajuda que ninguém abre.** A
dúvida aparece com a tela na frente — "por que a família não está vendo o
boletim?" — e um arquivo no repositório, ou um PDF no e-mail de fevereiro,
não chega lá.

**Manual longe do código envelhece em silêncio.** Este arquivo foi
reescrito seis vezes em duas semanas, sempre junto de uma mudança de
comportamento. Agora o texto é **dado tipado**: ele cita perfis
(`Role`), e renomear um perfil quebra a compilação em vez de deixar uma
frase errada no ar.

## O que a tela faz que um arquivo não faz

- **Busca no texto inteiro**, não só nos títulos.
- **Filtra pela função de quem está lendo**, porque o professor não
  precisa aprender recibo para usar o sistema — e desliga em um clique,
  porque esconder não é o objetivo.
- **Um endereço por assunto** (`/gestao/ajuda/liberacao-do-boletim`), para
  mandar o link a um colega em vez de explicar de novo.

## Ao mudar uma regra

Mude o tópico correspondente em `topicos.ts`, no mesmo commit. É a mesma
disciplina que já valia para este arquivo — só que agora o texto chega a
quem precisa dele sem passar por ninguém.

> A Ajuda é da **equipe**. A família tem o aplicativo, e o que ela precisa
> saber está em [`app-telas.md`](app-telas.md).
