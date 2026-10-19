# Situação das matrículas

A situação é o que separa o aluno que estuda do que saiu, e é ela que
alimenta as **atas** e a ficha do aluno.

| Situação | Quando |
| --- | --- |
| `ativa` | estudando |
| `concluida` | terminou o curso |
| `transferida` | foi para outra escola |
| `cancelada` | matrícula encerrada |
| `abandono` | parou de frequentar |

`ativo` é **derivado**, nunca editado à mão: só `ativa` é ativo. Guardar os
dois em separado deixaria um aluno "ativo: true, situação: cancelada", e aí
metade do sistema o trataria de um jeito e metade de outro.

---

## 1. Mudar em lote — `/gestao/alunos/situacao`

No fim do ano a turma inteira conclui no mesmo dia. Marcar trinta alunos um
a um pela ficha é como três ficam para trás sem ninguém notar — e aí a ata
de concluídos sai incompleta, que é justamente o documento que acompanha a
certificação.

A tela filtra por **situação atual** e por turma, e aplica a nova situação
aos selecionados.

### Nada vem pré-selecionado

E **não existe "aplicar à lista filtrada"**. Encerrar matrícula é um ato
sobre uma pessoa; um botão que agisse sobre o que estivesse na tela
encerraria a escola inteira no dia em que alguém esquecesse de filtrar — e
o desfazer seria aluno por aluno.

O "selecionar todos" existe, mas marca caixas que continuam à vista: quem
confirma vê os trinta nomes.

### A data é obrigatória

Quando a matrícula deixa de ser ativa, a data do fato é exigida — é ela que
aparece na ata como data de conclusão, de transferência ou de cancelamento.
O rótulo muda junto com a situação escolhida.

Sem essa exigência o buraco se repetiria: os **11 cancelados migrados não
têm data**, porque o Access guardava o status e não a data, e a coluna da
ata sai vazia para eles.

Voltar alguém para `ativa` é correção de engano e **não pede data**: a data
que vale volta a ser a da matrícula.

### Cada aluno tem a própria trilha

A gravação é aluno a aluno, com auditoria individual. Um lote anônimo não
responderia "quem encerrou a minha matrícula, e quando" — que é a pergunta
que chega meses depois.

Aluno que já estava na situação escolhida **não conta como alterado**: a
tela diz quantos de fato mudaram, e não quantos foram selecionados.

> Conferido contra o banco: marcar concluída grava a situação, a data e
> derruba `ativo`; a ata de concluídos passa a enxergar o aluno; e voltar
> para ativa devolve `ativo` e deixa a coluna da ata em branco de novo.

---

## 2. Tela própria, não um modo da lista

A lista de alunos é usada o dia inteiro para consultar telefone e turma.
Caixas de seleção que encerram matrícula convivendo com essa busca é
convite ao clique errado.

O caso avulso continua na **ficha do aluno**: quem se transfere em maio não
espera o fim do ano.

---

## 3. Pendência

- **Os 11 cancelados migrados seguem sem data.** Dá para completá-los por
  esta tela, filtrando por "Cancelada" e reaplicando a situação com a data
  certa — mas a data real de cada um está no papel, não no sistema.
