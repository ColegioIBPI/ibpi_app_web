# Relatórios e exportações

Duas saídas, cada uma com o formato que serve ao seu uso:

| Saída                          | Formato | Onde                                               |
| ------------------------------ | ------- | -------------------------------------------------- |
| Lista de alunos                | `.xlsx` | `/gestao/alunos`                                   |
| Relatório de inadimplência     | `.xlsx` | `/gestao/financeiro`                               |
| Relatório de inadimplência     | PDF     | `/gestao/financeiro/relatorio`                     |
| Frequência por turma e período | `.xlsx` | `/gestao/frequencia/relatorio`                     |
| Frequência por turma e período | PDF     | `/gestao/frequencia/relatorio`                     |
| Boletim individual             | PDF     | `/gestao/boletins/[matricula]` e `/portal/boletim` |

---

## 1. Por que `.xlsx` de verdade, e não CSV

O Excel **destrói** texto que parece número, e o sistema é cheio deles:

| No sistema | No CSV aberto pelo Excel |
| ---------- | ------------------------ |
| `022027`   | `22027` — o zero some    |
| `00042981` | `42981` — o recibo muda  |
| `3/12`     | uma data                 |

Num arquivo `.xlsx` cada coluna declara o tipo, e o texto é gravado como
texto. Dinheiro vai como número, para a planilha somar; data vai como data,
para ordenar. O preço é uma dependência (`exceljs`), e vale.

Outras decisões da planilha:

- **Cabeçalho congelado e filtro ligado.** A secretaria rola 73 alunos e 847
  parcelas, e sem isso perde de vista qual coluna é qual.
- **Célula vazia é vazia**, não `0` nem `""`: em branco filtra e ordena
  corretamente, e um zero mentiria sobre o valor.
- **Data ao meio-dia local.** Gravada à meia-noite UTC, o Excel mostraria o
  dia anterior em qualquer fuso a oeste de Greenwich.
- **O nome do arquivo leva a data** (`inadimplencia-2026-09-24.xlsx`), senão
  a secretaria acumula três `inadimplencia.xlsx` na pasta de downloads.

---

## 2. Por que PDF pela impressão do navegador

O navegador já sabe salvar como PDF, e o `@media print` do `globals.css`
tira da página o que não é documento (menu, botões, filtros).

Gerar o PDF no servidor exigiria uma biblioteca de layout e uma **segunda
descrição** de cada relatório para manter em sincronia com a tela — e é assim
que as duas versões acabam divergindo. O que a secretaria imprime é
exatamente o que ela vê.

O que sai da impressão é marcado com `data-impressao="ocultar"`.

---

## 3. A planilha é dado pessoal saindo do sistema

Uma lista de alunos exportada tem nome, data de nascimento, CPF, telefone,
e-mail e filiação de **menores de idade**. Por isso as rotas em
`app/api/exportacoes/`:

1. exigem **sessão** (401 sem ela);
2. exigem **permissão** no recurso — quem não tem recebe **404**, e não 403,
   porque "existe, mas você não pode" já é informação;
3. aplicam o **escopo da pessoa**: o professor leva só as turmas que leciona,
   e o filtro por turma sozinho não garante isso;
4. respondem com `Cache-Control: no-store, private`, para o arquivo não
   ficar em cache de proxy nem do navegador;
5. saem como `attachment`, para o arquivo baixar em vez de abrir na aba.

**A planilha nunca contém mais do que a tela conteria para a mesma pessoa.**
Ela também sai com **os mesmos filtros da tela** — exportar algo diferente do
que está à vista é como a secretaria manda a lista errada.

O botão é uma âncora com `download`, e não um botão com JavaScript: o
navegador já sabe baixar arquivo, e assim o link funciona antes de o
JavaScript carregar, o que importa numa secretaria com internet ruim.

---

## 4. Frequência por período

`/gestao/frequencia/relatorio` consolida a turma num intervalo: dias
registrados, presenças, faltas, atrasos e percentual por aluno, com o total
da turma e quantos estão abaixo dos 75%.

- **A turma inteira aparece**, inclusive quem não tem lançamento nenhum.
  Deixar de fora quem nunca faltou esconderia metade da turma, e é a turma
  inteira que a coordenação quer ver.
- **Atraso conta como presença** no percentual, como no resto do sistema.
- Sem dia registrado, o percentual fica **em branco**, não zero: "0% de
  presença" no começo do ano assustaria a família à toa.
- Sem período na URL, o padrão é o **mês corrente**. Sem padrão, a consulta
  traria o ano letivo inteiro e o relatório deixaria de responder a pergunta
  que motivou o pedido.
- Período de trás para frente é recusado com explicação.

Abaixo do quadro por dia vem **Faltas por disciplina**, com o que os
professores marcaram nos diários de classe do período — uma coluna por
disciplina, no formato `faltas de aulas`.

As duas contagens ficam **lado a lado, e não somadas**: a de cima conta
**dias** e é a oficial, a que decide reprovação por falta; a de baixo conta
**aulas** e é por matéria. Um aluno pode faltar a uma aula de Física e ter
estado na escola o dia inteiro — somá-las inventaria uma falta que não
houve.

A mesma lista aparece no portal da família, em Frequência, abaixo dos
contadores do aluno.

---

## 4b. Relatórios de cobrança — uma linha por parcela

**Inadimplentes** e **Valores a receber** saem com **uma linha por
parcela**, não um total por aluno.

O relatório antigo somava: "Fulano deve R$ 5.769". Quem vai cobrar precisa
do contrário — qual parcela, de que mês, vencida há quanto tempo. Um total
não diz se são três mensalidades atrasadas ou a taxa de material de março, e
a conversa com a família é sobre a parcela.

| Relatório | O que traz |
| --- | --- |
| Inadimplentes | parcelas **já vencidas** |
| Valores a receber | parcelas em aberto que vencem **até a data informada** |

**Valores a receber inclui as já vencidas**, de propósito: quem pergunta
"quanto entra até o dia 30" quer o que ainda não entrou, e separar o
atrasado numa lista à parte faria somar duas planilhas para responder uma
pergunta. A coluna de dias de atraso distingue.

A rota **recusa sem a data** em vez de assumir hoje ou o fim do ano: o
relatório é "de acordo com data especificada", e uma data chutada sai numa
planilha que ninguém confere antes de levar para a reunião.

### Os responsáveis vão junto

Com **nome, CPF e tipo** (acadêmico, financeiro ou ambos).

O responsável financeiro ganha colunas próprias — nome, CPF, tipo e
telefone — **além** da célula com todos. É o dado que a pessoa procura ao
abrir a planilha, e caçá-lo no meio de uma célula com três nomes é o atrito
que faz alguém ligar para a mãe errada.

**Responsável migrado sem `tipo` conta como "ambos"**, que é o padrão do
schema. O relatório lê o documento cru, e indexar o rótulo com `undefined`
imprimiria vazio justamente na coluna que diz a quem ligar. Sem ninguém
marcado como financeiro, cai no primeiro: célula vazia não diz "não há
responsável financeiro", diz "o relatório falhou".

> Conferido contra a base real: 129 parcelas vencidas de 43 alunos — onde
> antes saíam 43 linhas somadas —, todas com responsável e CPF.

---

## 4c. As atas de alunos

Três documentos de secretaria com a mesma espinha: número sequencial,
matrícula, data de matrícula, nome, nascimento, curso, série e turno.

| Ata | Quem entra | Colunas a mais |
| --- | --- | --- |
| **Matrículas** | todos, em qualquer situação | Status e **Data do status** |
| **Alunos ativos** | só matrícula ativa | — |
| **Alunos cancelados** | só `cancelada` | **Data de cancelamento** |
| **Alunos concluídos** | só `concluida` | **Data de conclusão** |
| **Alunos transferidos** | só `transferida` | **Data de transferência** |

As três últimas saem da mesma fábrica, trocando situação e título da data.
São **documentos distintos** e não um com coluna de motivo: a secretaria os
emite em momentos diferentes e para destinatários diferentes — a de
concluídos acompanha a certificação, a de transferidos vai para a escola
que recebe.

> ⚠️ **Hoje as atas de concluídos e transferidos saem vazias**: a base tem
> 62 ativos e 11 cancelados, e ninguém nessas duas situações. A ata impressa
> do Access mostra concluídos, então a migração não trouxe esse status — a
> secretaria o marca na edição do aluno, junto com a data.

A ata de ativos **não tem coluna de situação**: todos nela têm a mesma, e
repetir "Ativa" em todas as linhas só ocupa largura.

**A data do status fica em branco para quem está ativo**, como o colégio
pediu. A data da matrícula já está na coluna ao lado, e repeti-la aqui faria
parecer que todo aluno teve uma mudança de situação. A regra é
`dataDoStatus()`, com teste — inclusive o caso do cancelado sem data, que
devolve vazio em vez de cair na data de matrícula e inventar um
cancelamento no dia em que o aluno entrou.

O **sequencial** não é dado do aluno: é a posição na ata, e existe porque é
por ele que as linhas são citadas na conferência ("o nº 14 está com a data
errada").

Filtra pela situação **`cancelada`**, e não por "tudo que não está ativo": o
colégio tem cinco situações, e juntar transferido e concluído numa ata
chamada "cancelados" faria o documento afirmar o que não é.

> ⚠️ **Os 11 cancelados migrados não têm data de cancelamento.** O Access
> guardava o status, não a data, então não houve o que migrar — a coluna sai
> vazia para eles. Ela é preenchida sozinha nos cancelamentos feitos pelo
> Portal, e a secretaria pode completar os antigos pelo campo "data da
> situação" na edição do aluno.

---

## 4d. Ata de resultado final

As notas finais de **uma turma**, uma linha por aluno: sequencial,
matrícula, nome, **uma coluna por disciplina**, frequência e situação.

**É por turma, e não poderia ser de outro jeito**: as colunas são as
disciplinas, e turmas diferentes têm grades diferentes. Uma planilha só com
todas as turmas teria uma coluna por disciplina do colégio inteiro e um mar
de células vazias. Por isso o botão fica na tela da turma, e não na lista
geral de exportações.

A coluna mostra a **média final** — a que decide — e cai na **anual** quando
não houve recuperação. Mostrar vazio esconderia a nota do aluno aprovado
direto, que é a maioria.

A turma inteira é carregada **de uma vez**: `boletimDoAluno` faz cinco
consultas por aluno, e chamá-lo trinta vezes numa exportação seriam cento e
cinquenta idas ao banco. Cada coleção é lida uma vez e cruzada em memória,
como no relatório financeiro.

> ⚠️ **A ata depende dos vínculos e das notas.** As colunas vêm das
> **alocações** da turma (Configurações › Vínculos) e os valores, das notas
> lançadas. Hoje a turma com mais alunos tem **2 disciplinas alocadas** e 12
> notas no ano — a ata sai com duas colunas e quase tudo em branco. Não é
> defeito do relatório: é o ano letivo ainda não montado.

---

## 4e. Pauta

A chamada de uma turma numa disciplina, aula a aula — o diário de classe
em planilha, que é o documento que o colégio chama de "pauta de conteúdo".

**Duas abas, porque são duas folhas no papel:**

| Aba | O quê |
| --- | --- |
| **Chamada** | alunos nas linhas, **uma coluna por aula**, faltas e frequência |
| **Conteúdo** | o que foi dado em cada aula, e se ela foi letiva |

O título da coluna de aula traz **número e data** (`7 · 12/03`). Só a data
não bastaria: a pauta é citada por número ("faltou na 7"), e só o número
não diria quando foi.

**Uma pauta é sempre de uma turma e uma disciplina** — é o que a alocação
define. "Por curso", no documento do colégio, é o filtro que leva até a
alocação, não uma terceira dimensão da planilha. Por isso o botão fica na
tela do diário.

### O que fica em branco, e por quê

- **Dia sem aula** não vira `F`: férias e feriado não são ausência do
  aluno, e marcá-los como falta inflaria a contagem que decide reprovação.
  Na aba de conteúdo ele aparece com o motivo ("Feriado"), porque uma linha
  vazia no meio da sequência parece aula que o professor esqueceu.
- **Aula letiva sem marcação** também fica em branco: é chamada que ainda
  não foi feita, e um `P` presumido afirmaria uma presença que ninguém
  conferiu.

> ⚠️ **A pauta reflete o diário.** Hoje há 3 diários na base, o maior com
> **1 aula e nenhuma chamada feita** — a planilha sai com uma coluna e
> vazia. Não é defeito: é o diário ainda não preenchido.

### A planilha passou a aceitar várias abas

`montarPlanilha` montava um arquivo de uma aba só. A pauta precisa de
duas, com **linhas de tipos diferentes** — guardá-las numa lista apagaria o
tipo das duas. Então a aba virou uma função (`aba()`), e `montarLivro()`
recebe quantas forem. `montarPlanilha` continua existindo para o caso de
uma aba, que é o de quase todos os relatórios.

---

## 4f. Os documentos impressos

Três relatórios **não são planilha**: são folha para imprimir, pelo
navegador, como o boletim. Gerar PDF no servidor exigiria manter uma
segunda descrição de cada um em sincronia com a tela.

### Relatório diário de inadimplentes

`/gestao/financeiro/relatorio` — **agrupado por aluno, uma linha por
parcela, total por família**, no formato da folha que o colégio já imprime.

Substituiu a versão que somava o aluno numa linha. O cabeçalho traz
`Ref.: {ano}` e **`Posição até: {data}`** — parcelas não pagas vencidas até
aquele dia, que é o que "posição" quer dizer. Sem parâmetro, hoje, no fuso
do colégio.

Os **responsáveis vão embaixo do nome**, com CPF e tipo, e não em colunas:
são quem a escola liga, e caberiam mal numa coluna estreita numa folha já
cheia. A descrição traz a parcela (`Mensalidade 2/12`), como foi pedido.

Cada aluno é um `<tbody>` com `break-inside: avoid`: um bloco partido ao
meio faria o total aparecer sozinho no alto da folha seguinte.

> A planilha e a folha leem **o mesmo serviço**
> (`financeiro/services/abertas.server.ts`). Duas leituras separadas é como
> elas passam a discordar — e a conversa com a família seria sobre qual das
> duas vale.

> Conferido: 43 alunos, 129 parcelas, R$ 414.893 em aberto na posição de
> hoje.

### Ficha cadastral

`/gestao/alunos/{matricula}/ficha` — reproduz a folha que o colégio usa, nos
mesmos blocos e na mesma ordem, porque é assim que a secretaria lê e
confere.

**Campo vazio vira linha em branco, e não some.** A ficha é impressa para
ser completada à mão no que falta; esconder o vazio tiraria justamente o
espaço onde se escreve. Pelo mesmo motivo, há **duas linhas de responsável**
mesmo quando só existe um.

Exige `cadastros: gerenciar`: ela reúne filiação, documentos e endereço num
documento só, e isso é mais do que o professor precisa para dar aula.

### Ficha financeira

`/gestao/financeiro/{matricula}/ficha` — **todas** as parcelas do aluno,
pagas e não pagas, com data, valor, forma e recibo de cada pagamento.

Não é o extrato nem o relatório de inadimplentes. Aqui a pergunta é "o que
esta família pagou e quando?", e mostrar só o que falta responderia outra
coisa. Inclui o plano acordado; **a anotação interna não entra** — ela é da
equipe, e a ficha vai para a família.

Usa o mesmo `extratoDoAluno` da tela: dois caminhos para o mesmo dado é como
a ficha entregue à família passa a discordar do extrato que a secretaria
olha.

### A orientação do papel

O `@page` do sistema é **A4 paisagem**, escolhido pelo boletim: três
trimestres × quatro colunas não cabem em retrato sem encolher o texto a um
tamanho ilegível.

A **ficha cadastral é a exceção** — é um formulário vertical, e em paisagem
sobraria meia folha em branco à direita. Ela imprime em **retrato**.

`@page` **não aceita seletor**: não existe "retrato dentro desta div", a
regra é do documento inteiro. A única forma de trocá-la por rota é a rota
declarar a sua, que vence a do `globals.css` por vir depois — é o que
`PaginaEmRetrato` faz, e o `<style>` sai do DOM quando a rota sai, senão
navegar da ficha para o boletim levaria o retrato junto.

> Conferido no navegador: as duas regras convivem no documento, a da rota
> fica por último e é a que vale.

---

## 5. Índices do Firestore

A consulta de frequência filtra por **turma e intervalo de datas ao mesmo
tempo**, e isso exige índice composto. Sem ele o Firestore responde
`FAILED_PRECONDITION` e a página quebra — em desenvolvimento e em produção.

Os índices vivem em [`firestore.indexes.json`](../firestore.indexes.json),
versionados junto do código, e são publicados com:

```bash
npx firebase deploy --only firestore:indexes --project colegioibpi
```

> Um índice recém-criado leva alguns minutos **construindo**, e durante esse
> tempo a consulta continua falhando — com uma mensagem diferente, dizendo
> que o índice existe mas ainda não está pronto. Ao publicar, confira antes
> de testar.

Ao escrever uma consulta nova com mais de um campo, acrescente o índice
correspondente a esse arquivo no mesmo commit.

---

## 6. Pendências

- Exportação de **responsáveis** e de **notas por turma**.
- Boletim de **uma turma inteira** num PDF só, para a reunião de pais.
- Painel inicial com os indicadores do dia (FASE 3.11).
