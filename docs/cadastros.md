# Situação das matrículas

## Cadastrar um aluno novo

Até novembro de 2026 o sistema **só editava**: os 73 alunos vieram da
migração do Access e não havia como criar o 74º.

`Gestão › Alunos › Novo aluno` pede o mínimo para o aluno existir — nome,
nascimento, CPF, turma e data de matrícula, tudo opcional menos o nome — e
manda direto para a ficha. A ficha tem quase cem campos, e pedi-los antes
de o aluno existir é como um cadastro fica pela metade: a secretaria
atende com a família na frente e precisa do número para seguir.

### O número é gerado, nunca digitado

Formato do colégio, confirmado nos cadastros migrados: **dois dígitos do
ano e três do sequencial** — `26007` é o sétimo de 2026. O ano é o **ano
letivo escolhido**, lido no servidor: aceitá-lo do formulário deixaria a
tela decidir em que ano um aluno nasce.

**Número usado não se repete**, nem quando o aluno sai. Reaproveitar faria
o histórico de quem saiu — notas, boletim, cobranças, boleto — colar no
aluno novo, e isso só apareceria no dia da segunda via.

Três travas, nessa ordem:

| | |
| --- | --- |
| **Contador** em `contadores/matricula-{ano}` | não recua quando um aluno é excluído |
| **Piso** na maior matrícula do ano | conserta contador perdido, ano anterior ao contador, aluno criado fora da tela |
| **`transaction.create`** | se o número existir, a gravação falha em vez de escrever por cima |

O piso é o que fez 2026 funcionar: havia 40 alunos migrados e nenhum
contador, e sem ele a primeira criação tentaria `26001`.

> A leitura do piso é a **faixa do ano**, por id — algumas dezenas de
> documentos. Sem `limitToLast`, que pediria um índice descendente por
> `__name__` que o Firestore não cria sozinho.

### Com turma, já nasce a matrícula do ano

Escolher a turma grava também `matriculas/{ano}-{matrícula}`, que é o que
mantém o boletim e a ata daquele ano corretos depois da virada — ver
[`ano-letivo.md`](ano-letivo.md). Sem turma não há o que registrar, e o
vínculo se faz depois na ficha.

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

## 3. A data dos cancelados migrados

Estava no Access o tempo todo, na coluna `DataStatus` que a migração não
leu. Recuperada para **10 dos 11** por
`scripts/migrate-access/reparar-situacao.mts` — ver
[migracao.md](migracao.md).

O 11º foi cancelado no Portal depois da migração e não tem data em lugar
nenhum. É o único caso para a secretaria preencher à mão.
