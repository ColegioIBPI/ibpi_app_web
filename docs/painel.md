# Painel da tela inicial

`/gestao` — o que está parado esperando alguém.

Antes esta tela listava os módulos do perfil, que é a mesma informação do
menu lateral, ao lado. Quem abre o sistema de manhã não precisa saber o que
pode fazer: precisa saber **o que está esperando**.

---

## 1. O critério de entrada

Cada indicador passou por uma pergunta só:

> *Esse número faz alguém fazer alguma coisa hoje?*

Se não faz, é vaidade e ficou de fora. "Total de alunos matriculados" não
muda a manhã de ninguém — por isso ele está no rodapé, como contexto, e não
num cartão.

**Pendência zerada não vira cartão.** Painel cheio de zero ensina a ignorar
painel; quem está em dia recebe uma linha dizendo isso, não seis caixas
dizendo "0".

A cor é do que a pendência **custa**, não do tamanho do número: vermelho
para o que tem prazo e não volta atrás — reprovação por falta, dívida
vencida. O resto espera sem piorar.

---

## 2. Os indicadores

| Indicador | Quem vê | Por que importa |
| --- | --- | --- |
| **Pedidos da família esperando** | quem atende a fila | mostra há quantos dias o mais antigo está parado |
| **Chamada de hoje** | quem lança frequência | turmas sem nenhum lançamento |
| **Risco de reprovação por falta** | quem lê notas | abaixo de 75%, com o pior caso nomeado |
| **Boletins não liberados** | quem fecha boletim | enquanto não libera, a família não vê nota nenhuma |
| **Vencido em aberto** | quem lê financeiro | valor, parcelas e quantos alunos |
| **Pagamentos a confirmar** | quem lança financeiro | a família pagou, falta conferir no extrato |
| **Turmas sem grade montada** | quem gerencia cadastro | sem vínculo o professor abre o diário vazio |

### O mais valioso é a frequência

Reprovação por falta **não tem recuperação**. Hoje o colégio só descobre no
fim do ano, quando não há mais o que fazer — então o aviso só serve se
chegar com meses de antecedência. É o único indicador do painel que previne
em vez de lembrar.

### Fim de semana não cobra chamada

Sem essa trava o painel cobraria dez turmas todo sábado, e na segunda-feira
ninguém mais olharia o cartão.

---

## 3. Permissão: o painel não é porta dos fundos

Cada indicador é guardado pela **permissão do recurso a que pertence** — o
professor não vê o vencido do colégio só porque é um número pequeno numa
caixa.

E o escopo vale também nos números de contexto. O professor via
"10 turmas ativas" ao lado dos 35 alunos dele; número de contexto que
contradiz o escopo é pior que número nenhum. O recorte dele vem de
`users/{uid}.turmas`, o mesmo campo que as Security Rules leem — e **não**
de `alocacoes.professorId`, que é o id do cadastro do professor e nunca
seria igual ao uid da conta.

---

## 4. Custo

O painel carrega o colégio e cruza em memória, como os relatórios
financeiros: alunos, turmas, alocações, solicitações, frequência, boletins
e cobranças — cerca de 2.500 documentos.

Medido na base real: **~900 ms** para a secretaria, **~480 ms** para o
professor.

É aceitável para a tela de uma equipe pequena, e cresce com a base. Quando
incomodar, o caminho é um documento de resumo atualizado por gatilho — não
mais consultas.

---

## 5. O que ficou de fora

- **Aniversariantes do dia** — simpático e não pede ação.
- **Notas não lançadas por alocação** — útil, mas hoje seria ruído: o ano
  letivo mal começou a ser preenchido.
- **Ocorrências da semana** — a lista já é curta o bastante para ser lida
  inteira.
