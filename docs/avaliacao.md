# Avaliação: notas, médias e boletim

As regras abaixo foram confirmadas com a direção do colégio e estão
implementadas em `src/features/notas/domain/calculo.ts`, como funções puras.
É a conta que aprova ou reprova um aluno — por isso ela não mora na tela nem
no banco, e tem teste para cada caso.

---

## 1. Estrutura

| Item                     | Regra                                           |
| ------------------------ | ----------------------------------------------- |
| Períodos                 | **3 trimestres**                                |
| Avaliações por trimestre | **Projeto**, **Tarefas**, **AV**                |
| Escala                   | 0 a 10, com **duas** casas decimais             |
| Média mínima             | **5,0**                                         |
| Frequência mínima        | **75%** (mais de 25% de faltas reprova)         |
| Recuperação              | apenas **final**, no fim do ano                 |
| Abrangência              | mesma regra para EF, EM, EJA e Cursos Livres    |

---

## 2. As contas

```
média do trimestre = (Projeto + Tarefas + AV) ÷ 3
média anual        = (média do 1º + média do 2º + média do 3º) ÷ 3
média final        = (média anual + recuperação) ÷ 2
```

Para dependência e reclassificação o boletim usa cálculo próprio:

```
TOTAL = P1 + P2
MÉDIA = TOTAL ÷ 2
```

---

## 3. Decisões que parecem detalhe e não são

### Nota ausente não é zero

A média do trimestre fica **em branco** enquanto faltar qualquer uma das três
avaliações, e a média anual fica em branco enquanto um trimestre não fechar.

Dividir por 3 com a AV ainda não lançada trataria o que não existe como zero:
um aluno com Projeto 10 e Tarefas 10 apareceria com média 6,7 antes da prova.
É um número que assusta a família e não significa nada.

Zero lançado, por outro lado, **é nota** e entra na conta. A diferença entre
"não lançado" e "tirou zero" é preservada em todo o caminho — no banco, a
avaliação ausente é `null`.

### O arredondamento acontece antes da comparação

Todas as médias são arredondadas para **duas casas decimais**, que é como o
boletim do colégio imprime, e a comparação com a média mínima usa o número
já arredondado.

Duas casas, e não uma: no `boletim_resultado.pdf`, Projeto 7,83 + Tarefas
10,00 + AV 7,60 fecham em **8,48**. A regra estava implementada com uma casa
até o documento real chegar.

Um boletim que estampa "5,00" e diz "reprovado" — porque internamente era
4,996 — é indefensável diante da família. O número que decide precisa ser o
número que aparece.

O arredondamento é aplicado **a cada etapa**, não só no fim: a média anual é
calculada sobre as médias trimestrais já arredondadas, e a média final sobre
a média anual já arredondada. É a mesma sequência que a secretaria faz na
planilha hoje.

### A frequência que reprova é a do ano, não a da disciplina

O limite de 25% é da **carga horária total**, então quem passa dele reprova em
todas as disciplinas. É o que a lei determina e o que o colégio aplica.

Por isso a situação de cada linha do boletim usa a frequência geral do aluno,
vinda do **registro diário da secretaria** (`frequenciaDiaria`, que conta
dias). A falta por disciplina, contada no **diário do professor**
(`diarioClasse`, que conta aulas), aparece no boletim como informação para a
família e para o professor — não decide sozinha.

Sem nenhum dia de frequência registrado, a nota decide sozinha: no começo do
ano não há o que calcular, e reprovar por falta ali inventaria uma reprovação.

### Média parcial e média anual são números diferentes

A coluna **TOTAL** do boletim mostra a média dos trimestres **já fechados**:
com só o 1º trimestre lançado, lá aparece a média dele. É o que a família
acompanha durante o ano.

A **média anual** — a que decide aprovação — só existe com os três
trimestres fechados. São duas funções separadas (`mediaParcial` e
`mediaAnual`) de propósito: confundi-las marcaria um aluno como reprovado em
março.

Por isso a coluna SITUAÇÃO fica **em branco** enquanto o ano corre, como no
boletim do colégio.

### "Em recuperação" não é "reprovado"

Média anual abaixo de 5,0 **sem recuperação lançada** devolve `recuperacao`, e
não `reprovado`. A diferença importa: é a lista que a secretaria usa para
convocar as provas finais.

Só depois de lançada a nota da recuperação é que a situação vira `aprovado`
ou `reprovado`.

### Situação do ano

| Se alguma disciplina está… | O ano fica…             |
| -------------------------- | ----------------------- |
| reprovado por falta        | reprovado por falta     |
| cursando                   | cursando                |
| em recuperação             | em recuperação          |
| reprovado                  | reprovado               |
| _todas aprovadas_          | aprovado                |

A **dependência** é de um ano anterior e aparece no boletim como pendência —
ela não entra no cálculo da situação do ano corrente.

---

## 4. Onde cada coisa fica

| Dado                                    | Onde                                    |
| --------------------------------------- | --------------------------------------- |
| Projeto, Tarefas, AV e faltas           | `notas/{ano}-t{trimestre}-{matrícula}-{disciplina}` |
| Recuperação final, eletivas, dependências, Projeto Bilíngue, observações | `boletins/{ano}-{matrícula}` |
| Médias, média anual, média final, situação | **calculadas na leitura**            |

As linhas de disciplina do boletim **não são gravadas**. Guardar o boletim
pronto significaria que corrigir uma nota deixa o consolidado velho no banco
até alguém lembrar de recalcular — e o boletim errado é justamente o que
chega à família.

O campo `boletins.disciplinas[]` existe para o **fechamento** do ano, como
retrato do que foi entregue. Enquanto o fechamento não estiver implementado,
ele fica vazio, e a gravação dos blocos o deixa intacto de propósito.

---

## 5. Quem faz o quê

| Ação                                      | Perfil                          |
| ----------------------------------------- | ------------------------------- |
| Lançar Projeto, Tarefas, AV e faltas      | Professor, nas disciplinas em que está alocado |
| Corrigir nota de qualquer disciplina      | Secretaria e coordenação        |
| Lançar recuperação, eletiva, dependência, observação | Secretaria e coordenação |
| Ver o boletim                             | O aluno (o dele), o responsável (dos filhos), a equipe |

O escopo do professor vem da **alocação** (professor × turma × disciplina ×
ano), verificado no servidor em `core/escola/alocacoes.server.ts`. Disciplina
de outro professor responde **404**, e não 403: dizer "existe, mas não é sua"
já entregaria que aquela turma tem aquela disciplina.

Toda gravação de nota passa por `gravarComAuditoria` — nota é um dos três
dados que o colégio precisa saber quem mudou e quando (README, seção 6.3).

---

## 6. O documento

O boletim reproduz o `boletim_resultado.pdf` que o colégio emite hoje:
**A4 deitado**, cabeçalho oficial, faixa de identificação, a grade com os
três trimestres, os blocos de Projeto Bilíngue, eletivas e
dependência/reclassificação, o campo de observações e o gráfico de médias.

Decisões de layout que têm razão de ser:

- **A4 deitado é o `@page` padrão**, não uma página nomeada. O navegador
  dimensiona o layout pelo padrão; uma página nomeada só gira o papel, e o
  conteúdo continuaria montado na largura do retrato, sobrando margem. Vale
  para todos os documentos do sistema, que são todos tabelas largas.
- **A grade mostra a turma inteira**, inclusive a disciplina sem nota
  nenhuma — ela vem das **alocações** da turma, não das notas. Educação
  Física aparece no boletim do colégio com as células em branco.
- **Célula sem nota fica vazia**, sem travessão: um travessão na grade
  inteira de um aluno do 1º trimestre polui o documento.
- **O Projeto Bilíngue aparece duas vezes**: como bloco próprio, com STEAM,
  ENGLISH e PROJECT, e como uma linha da grade cuja nota é a média dos três
  (8,25 + 9,50 + 9,50 dão os 9,08 do documento).
- **Eletivas e dependências mantêm linhas em branco**, como o formulário
  impresso, que é preenchido à mão quando preciso.
- **O gráfico é SVG**, e não uma biblioteca: são onze barras numa escala
  fixa de 0 a 10, e biblioteca que desenha em canvas costuma sair branca no
  papel.
- `print-color-adjust: exact` no boletim, porque o fundo das células é
  informação: sem ele o navegador imprime a grade toda em branco.

O PDF sai pela impressão do **navegador** (`window.print()`), que já oferece
"Salvar como PDF". Gerar no servidor exigiria uma biblioteca de layout e uma
segunda descrição do boletim para manter em sincronia com a tela — e é assim
que as duas versões acabam divergindo.

### META

A coluna META mostra a meta de média da escola (**6**), que é diferente da
média mínima de aprovação (**5,0**). São coisas distintas: a meta é o alvo
pedagógico, o mínimo é o que reprova. Hoje o valor é uma constante do
componente — **falta confirmar com a coordenação** se ele varia por
segmento ou por disciplina.

---

## 7. Pendências

- **Fechamento do ano**: gravar o retrato em `boletins.disciplinas[]`, com
  `fechadoEm` e `fechadoPor`, e travar o lançamento depois disso.
- **Notas do Access**: nenhuma nota foi migrada. O sistema antigo está
  organizado em **bimestres** e o boletim atual é **trimestral**; a regra de
  conversão depende da coordenação (ver `docs/migracao.md`).
- **Avaliações de trabalho (PL)** no diário de classe: o campo
  `diarioClasse.avaliacoesDeTrabalho` existe e é preservado, mas a tela ainda
  não foi feita.
- **Confirmar com a coordenação** o arredondamento *antes* da comparação
  (seção 3). O número de casas já está confirmado pelo documento real; o
  momento do arredondamento, não.
- **Ordem das disciplinas no boletim.** O documento do colégio usa uma ordem
  pedagógica (Português, Oficina de Textos, Geografia, História…); o sistema
  ordena por nome, porque não há nada nos dados que diga a ordem certa.
  Resolver isso pede um campo de ordenação em `disciplinas`.
- **Confirmar o valor da META** e se ele varia por segmento.
