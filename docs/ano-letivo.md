# Ano letivo

O colégio **não apaga nada** na virada do ano. Cada ano é um conjunto
próprio de turmas, vínculos, notas e boletins; a secretaria circula entre
eles, e abrir 2026 em março de 2027 é consulta ao histórico, não exceção.

## Já era quase tudo assim

O ano está **na chave** da maioria das coleções, e por isso criar 2027 não
toca em 2026:

```
turmas/2027-EM1A                     notas/2027-t1-26007-fisica
alocacoes/2027-{prof}-{turma}-{disc} boletins/2027-26007
matriculas/2027-26007                criteriosDeAvaliacao/2027
```

`frequenciaDiaria` e `ocorrencias` levam a data. **`cobrancas` não tem ano
letivo** — tem vencimento, e "o financeiro de 2026" é deduzido dele.

## A turma de um ano não é a turma de hoje

`alunos` guarda **uma** turma, e ela é a atual. Trocá-la na virada é o
certo — e é exatamente o que apagaria o passado se o resto do sistema a
usasse para tudo.

> O boletim de 2026 monta a grade a partir das alocações daquela turma
> naquele ano. Depois da virada, perguntar ao cadastro devolveria a turma
> de 2027, cujas alocações não existem em 2026: o boletim sairia **sem
> nenhuma coluna**, sem erro na tela. O histórico some e ninguém percebe
> até a família pedir a segunda via.

Quem responde é `matriculas/{ano}-{matrícula}`, que guarda turma, série,
turno e situação por ano. A regra está em
[`features/alunos/domain/matricula-do-ano.ts`](../src/features/alunos/domain/matricula-do-ano.ts):

- **`turmaDoAno`** — o registro do ano ganha do cadastro. Usado pelo
  boletim, inclusive para a identificação impressa: a segunda via de 2026
  diz EM2A mesmo com o aluno já na EM3A.
- **`alunosDaTurmaNoAno`** — quem estava naquela turma naquele ano. Usado
  pela **ata de resultado final**, que sem isso sairia, em 2027, com os
  alunos de 2027.

A queda para o cadastro cobre o ano em curso e o aluno criado sem registro
de matrícula. A decisão é por **ano inteiro**: se o ano tem registro, ele
manda em tudo, e uma turma sem ninguém nele é uma turma que ninguém
cursou.

## O seletor

Fica no **menu lateral**, visível em toda tela. Só na página inicial seria
pior que nenhum: a pessoa troca o ano, vai para Boletins e lança nota em
2026 achando que está em 2027, sem nada na tela a contradizer.

Fora do ano corrente ele fica em **destaque de aviso**, com a frase do que
está em jogo. É a diferença entre consultar o histórico e editá-lo sem
perceber.

### Onde a escolha vive

Num **cookie** (`ano-letivo`), lido por `anoLetivoEscolhido()`.

Na URL exigiria carregar `?ano=` em todo link, e uma tela esquecida
devolveria a pessoa ao ano errado em silêncio. No `localStorage` não
serviria: quem monta estas telas é o servidor, e ele não lê o navegador.

O cookie **não é `HttpOnly`** — não guarda segredo, e um valor adulterado
só faz a pessoa ver um ano vazio. Trocar de ano **não é permissão**: quem
alcança 2026 alcança 2027, e o que cada perfil pode continua sendo a
matriz de acesso.

A URL ainda manda quando traz `?ano=` (`anoDaTela`), que é como se manda
um link de 2026 a um colega sem mexer no ano dele.

### Que anos aparecem

Os das **turmas**, mais o corrente. Criar a primeira turma de 2027 é o ato
que abre o ano — assim a lista cresce sozinha, em vez de depender de um
cadastro de anos em outro lugar.

Aceita do corrente **−10 ao +2**: o passado para consulta, e dois à frente
porque o ano seguinte se monta em dezembro.

## O que ainda não segue o ano

O painel da tela inicial acerta o que vem de turma — chamada do dia,
turmas sem grade. **Aluno e financeiro não**: `alunos` é um cadastro só,
sem recorte por ano, e `cobrancas` não tem ano letivo. Num ano ainda não
montado, "boletins não liberados" conta a escola inteira.

Isso se resolve junto com a **abertura do ano** — o passo que cria os
registros de matrícula do ano novo —, que ainda não existe.
