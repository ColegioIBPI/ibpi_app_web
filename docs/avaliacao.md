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
| Escala                   | 0 a 10, com uma casa decimal                    |
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

Todas as médias são arredondadas para **uma casa decimal**, que é como o
boletim imprime, e a comparação com a média mínima usa o número já
arredondado.

Um boletim que estampa "5,0" e diz "reprovado" — porque internamente era
4,96 — é indefensável diante da família. O número que decide precisa ser o
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

## 6. Impressão

O boletim é impresso pelo **navegador** (`window.print()`), que já oferece
"Salvar como PDF" em todos eles. As regras de `@media print` no
`globals.css` tiram da página o que não é documento.

Gerar o PDF no servidor exigiria uma biblioteca de layout e uma segunda
descrição do boletim para manter em sincronia com a tela — e é assim que as
duas versões acabam divergindo.

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
- **Confirmar com a coordenação** a regra de arredondamento descrita na
  seção 3. Ela está implementada do jeito mais favorável ao aluno e mais
  fácil de defender, mas não foi explicitamente confirmada.
