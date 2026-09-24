# Relatórios e exportações

Duas saídas, cada uma com o formato que serve ao seu uso:

| Saída                        | Formato | Onde                                     |
| ---------------------------- | ------- | ---------------------------------------- |
| Lista de alunos              | `.xlsx` | `/gestao/alunos`                         |
| Relatório de inadimplência   | `.xlsx` | `/gestao/financeiro`                     |
| Relatório de inadimplência   | PDF     | `/gestao/financeiro/relatorio`           |
| Frequência por turma e período | `.xlsx` | `/gestao/frequencia/relatorio`          |
| Frequência por turma e período | PDF   | `/gestao/frequencia/relatorio`           |
| Boletim individual           | PDF     | `/gestao/boletins/[matricula]` e `/portal/boletim` |

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
