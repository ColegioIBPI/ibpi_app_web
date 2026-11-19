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
- **`alunosDoAno`** — a lista de alunos do ano, cada um já com a turma, a
  série e o turno **daquele ano**. Usada pela tela `Alunos`.

A queda para o cadastro cobre o ano em curso e o aluno criado sem registro
de matrícula. A decisão é por **ano inteiro**: se o ano tem registro, ele
manda em tudo, e uma turma sem ninguém nele é uma turma que ninguém
cursou.

### A lista de alunos do ano

Pertence ao ano quem tem registro nele. Mais uma exceção estreita: o aluno
**recém-cadastrado sem turma**, que não tem registro em ano nenhum, aparece
no ano em que entrou — lido dos dois primeiros dígitos da matrícula
(`anoDeEntrada`, em `domain/nova-matricula.ts`). Sem ela, a secretaria
cadastraria um aluno sem turma e ele sumiria da lista no mesmo instante, e
o jeito de "resolver" seria cadastrá-lo de novo, com outra matrícula.

Quem sobra entra em `foraDoAno`, e a tela diz quantos são. **Lista que
encolhe calada é a que faz a secretaria duvidar do sistema.**

### Quem mantém o registro do ano

Três ações gravam `matriculas/{ano}-{matrícula}`:

| Ação | Quando grava |
| --- | --- |
| `criarAluno` | no cadastro novo, se uma turma foi escolhida |
| `salvarAluno` | quando a ficha **muda a turma** do aluno |
| `passarAlunosDeTurma` | na abertura do ano seguinte |

`salvarAluno` escolhe a turma **do ano selecionado** quando o mesmo código
existe em mais de um ano: pegar a mais recente colocaria em 2027 o aluno de
quem só se corrigiu o nome em 2026.

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

## Abrir o ano seguinte

`Configurações › Abrir o ano seguinte`, a partir do ano selecionado no
menu. Em **duas fases**, porque os riscos são diferentes.

### 1. Estrutura — segura e repetível

Copia as **turmas** e os **vínculos** do ano base. Compara turma por
**código**: `EM1A` de 2026 e de 2027 são a mesma turma do colégio em dois
anos. Turma encerrada não atravessa — se fechou, reabri-la no ano
seguinte seria ressuscitá-la sem ninguém pedir.

É **idempotente**: rodar de novo não duplica nada, e nada do ano anterior
muda. É o que permite abrir o ano em etapas, que é como a secretaria
trabalha — as turmas em novembro, os vínculos em janeiro, os alunos no
dia da virada.

Os vínculos vêm como **sugestão**: o quadro do ano seguinte quase sempre
muda, e corrigir cento e dez vínculos é muito menos trabalho que montá-los
do zero.

### 2. Alunos — move gente de verdade

Turma a turma, com o destino escolhido à mão. **Promover não é conta**:
aprovação é conclusão do boletim, mas quem passa é decisão da escola, e um
botão "passar todo mundo" tiraria dela a única parte que precisa pensar.

Só entra quem está com matrícula **ativa** naquela turma: concluído,
transferido e cancelado não voltam no ano que vem. Quem já passou é
pulado, não duplicado.

A passagem grava **duas coisas**: o registro de matrícula do ano novo, e o
cadastro do aluno apontando para a turma nova. O cadastro é o que a
chamada, o diário e o lançamento de nota enxergam — por isso a tela avisa
que a partir dali o aluno está no ano novo. O boletim, as notas e a ata do
ano anterior continuam de lá, pelo registro daquele ano.

> A **série** nasce vazia no registro novo, em vez de repetir a do ano
> anterior: repetida, ela estaria errada em todo aluno promovido.

## As listas seguem o ano

`Alunos` e `Turmas` mostram **o ano selecionado**, e dizem qual no
subtítulo.

Em `Turmas`, a tela mostrava todos os anos de uma vez, com `EM1A` repetida
uma vez por ano: dava para clicar na de 2026 achando que era a de 2027 e
lançar nota no ano errado. A coluna `ALUNOS` conta pelo **registro de
matrícula daquele ano** quando ele existe, cruzado com o `ativo` do
cadastro — o mesmo critério da lista de alunos, para que o número da turma
bata com a lista que ela abre.

Ano aberto e ainda sem ninguém é o estado normal de quem acabou de copiar
a estrutura: as duas telas dizem qual é o próximo passo, em vez de deixar a
secretaria concluir que perdeu os alunos.

## O que ainda não segue o ano

- **O painel da tela inicial** acerta o que vem de turma — chamada do dia,
  turmas sem grade. **Aluno e financeiro não**: `cobrancas` não tem ano
  letivo, e os indicadores de aluno ainda leem o cadastro inteiro.
- **A situação da matrícula** só é gravada no cadastro. A tela de situação
  em lote e a ficha não propagam para o registro do ano, então um aluno
  cancelado hoje continua `ativa` no registro de 2026. Por isso as listas e
  a contagem das turmas tiram o `ativo` do **cadastro**, e não do registro:
  enquanto for assim, "situação" é a de hoje, não a do ano.
