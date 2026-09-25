# Financeiro

**Controle interno.** Nenhum dinheiro passa pelo sistema, nenhum gateway está
integrado. O Portal registra o que já aconteceu no banco ou no caixa do
colégio — é o mesmo papel que a `Tabela_pagamento` do Access tinha.

---

## 1. As coleções

| Coleção              | O que é                            | Origem                   |
| -------------------- | ---------------------------------- | ------------------------ |
| `cobrancas`          | as **parcelas**                    | `Tabela_pagamento` (847) |
| `contratos`          | os **itens contratados** do ano    | `Fatos` (274)            |
| `planosDePagamento`  | o **acordado na matrícula**, em texto | criada no Portal      |

`contratos` é histórico do Access, mostrado no extrato com o texto original
preservado. Quem gera parcela hoje é o plano de pagamento.

---

## 2. A decisão central: situação não se guarda

**"Vencida" é uma conclusão sobre hoje, não um dado.**

Uma parcela gravada como "em aberto" em abril continuaria gravada assim em
dezembro, muito depois de vencer — e o relatório de inadimplência sairia
errado sem ninguém perceber. O que o banco guarda são os **fatos**:

```
vencimento · valor · dataPagamento · valorPago · confirmado
```

E `situacaoDaCobranca()` conclui a partir deles, em toda leitura:

| Situação         | Quando                                           |
| ---------------- | ------------------------------------------------ |
| **Paga**         | existe data de pagamento, e o pagamento foi conferido |
| **A confirmar**  | existe data de pagamento e `confirmado` é `false` |
| **Vencida**      | sem pagamento e o vencimento já passou           |
| **Em aberto**    | sem pagamento e o vencimento ainda não chegou    |

Parcela paga com atraso continua **paga**: atraso quitado não é
inadimplência. O **dia do vencimento é do pagador** — quem paga nele está em
dia.

Pagamento parcial existe e aparece como **saldo** mesmo na parcela quitada.
Ele não vira uma situação própria: o saldo já responde a pergunta que
interessa ("quanto ainda falta?").

### A conferência do pagamento

`confirmado` é a caixa que quem cuida do caixa marca quando o dinheiro
aparece de verdade — o PIX que a família avisou hoje e o extrato só mostra
amanhã.

Três decisões:

- **Ausente conta como confirmado.** As 847 parcelas migradas já vieram
  quitadas do Access e não têm o campo. Tratar a ausência como "não
  conferida" inventaria 800 pendências que nunca existiram. Só o `false`
  **explícito** segura a parcela em "a confirmar".
- **A baixa entra marcada.** Quem lança quase sempre está com o comprovante
  na mão; desmarcar é o caso raro, e por isso é a ação deliberada.
- **"A confirmar" não é dívida.** O total `aConfirmar` é um recorte de
  `pago`, e não entra em `emAberto`: a família pagou, o que falta é a
  conferência interna. Somá-lo ao em aberto faria o extrato cobrar de novo
  quem já pagou.

> A migração chegou a gravar `situacao`. O campo foi apagado dos 847
> documentos — ver a seção 5.

---

## 3. O que fica em cada parcela

A parcela guarda os dois lados do carnê que a secretaria já usava no papel:

| O que se cobra                              | O que se pagou                    |
| ------------------------------------------- | --------------------------------- |
| `vencimento`                                | `dataPagamento`                   |
| `tipo` — a descrição do pagamento           | `valorPago`                       |
| `parcela` / `totalDeParcelas` — `5/12`      | `formaDePagamento`                |
| `valor`                                     | `recibo`                          |
| `observacoes`                               | `confirmado`                      |

**Descrição do pagamento** (`tipo`): taxa de matrícula, taxa de material,
mensalidade, reclassificação, dependências, extras, outros.

**Forma de pagamento**: PIX, dinheiro, boleto, link de pagamento, cartão de
débito, cartão de crédito.

Nas 847 parcelas migradas o `tipo` é **ausente**, e de propósito: o Access
guardava só valor e vencimento, e preencher "mensalidade" por padrão
inventaria um dado que ninguém conferiu. A tela mostra `—`. As parcelas
antigas também não têm forma de pagamento, mas algumas têm `banco` (o
`No Banco` do Access) — a coluna mostra o banco quando é o que existe.

`tipo` e `formaDePagamento` são **vocabulários diferentes** de
`tipoDeContrato`, que descreve o que foi contratado no ano: a anuidade é um
contrato e vira doze mensalidades; "extras" é cobrança que não nasce de
contrato nenhum.

Cada parcela pode ser **cadastrada isolada** — taxa de material lançada em
março, uma dependência, um extra. O id dela é gerado pelo Firestore, e não
montado a partir de matrícula e vencimento como no carnê: duas cobranças
avulsas podem cair legitimamente no mesmo dia, e um id determinístico faria a
segunda sobrescrever a primeira em silêncio.

---

## 3b. O plano acordado na matrícula

Um **texto livre por aluno**, em `planosDePagamento/{matricula}`: "anuidade
de R$ 23.076,00 em 12x de R$ 1.923,00 vencendo todo dia 5; desconto de 10%
para pagamento até o vencimento".

É texto de propósito. Negociação de matrícula tem condição, desconto, exceção
e combinado verbal, e todo campo estruturado que se tentasse criar para isso
ou não caberia no caso seguinte ou viraria um "observações" com outro nome. O
carnê — que é o que o sistema precisa calcular — vive em `cobrancas`; aqui
fica o que a escola prometeu, para quem atender a família depois saber.

**O responsável lê o do próprio filho**, no Portal e no aplicativo. É a
condição que ele negociou, e não saber o que foi combinado é justamente o que
gera a ligação para a secretaria.

Duas consequências disso:

- **O aluno não lê**, pela mesma razão que não vê o resto do financeiro:
  mensalidade é assunto de quem paga.
- **Não é lugar de recado interno.** O campo é a condição acordada, não
  anotação sobre a família. O formulário avisa isso a quem escreve, porque a
  pessoa que digita precisa saber quem vai ler.

Um documento por aluno, com a matrícula como id: o plano é do aluno, não um
registro que se acumula. O histórico de quem mudou a condição fica na
auditoria.

---

## 3c. Carnê a partir de um plano

A secretaria informa **valor total**, **número de parcelas** e **primeiro
vencimento**; o sistema gera o carnê. A prévia é calculada na tela com a
mesma função pura que o servidor usa para gravar, e a secretaria confere
antes de abrir — corrigir doze parcelas depois dá muito mais trabalho que
olhar a lista uma vez.

Duas regras que parecem detalhe:

- **A sobra da divisão vai na última parcela.** R$ 1.000 em 3 não fecha em
  três de R$ 333,33; a diferença de um centavo seria descoberta só no fim do
  ano, conferindo o total. A conta é feita em **centavos**, porque somar
  reais em ponto flutuante acumula erro.
- **Dia 31 não transborda.** O vencimento cai no último dia do mês curto (31
  de janeiro + 1 mês = 28 de fevereiro), e não no dia 1º do mês seguinte, que
  mudaria o mês de competência da parcela.

Refazer um carnê que já existe é **recusado**, não sobrescrito: passar por
cima apagaria baixas já lançadas.

---

## 4. Quem faz o quê

| Ação                                                     | Perfil                              |
| -------------------------------------------------------- | ----------------------------------- |
| Ver a lista e o extrato                                  | Financeiro, secretaria, coordenação |
| Ler o plano acordado                                     | Financeiro, secretaria, coordenação |
| Cadastrar parcela, gerar carnê, dar baixa, confirmar, editar, apagar | **Financeiro**          |
| Escrever o plano acordado                                | **Financeiro**                      |
| Ver o extrato dos filhos                                 | Responsável (somente leitura)       |
| —                                                        | O **aluno não vê financeiro**: mensalidade é assunto de quem paga |

Secretaria e coordenação têm `ler` no recurso, e a tela não lhes mostra botão
nenhum de lançamento. O guarda de rota confere de novo no servidor: esconder
o botão é conveniência, não segurança.

Regras de escrita que existem por um motivo:

- **Parcela paga não pode ser apagada.** Sumir com ela sumiria com o registro
  de um pagamento que a família fez — e é esse registro que o colégio precisa
  quando a família contesta. Primeiro desfaz-se a baixa.
- **Desfazer baixa existe** porque baixa na parcela errada acontece, e sem
  isso a correção seria apagar e recriar, levando o histórico junto. Desfazer
  limpa também a forma de pagamento, o recibo e a conferência: é tudo fato do
  pagamento que deixou de existir.
- **Editar mexe no que foi cobrado; a baixa, no que foi pago.** São dois
  fatos distintos, e um formulário que alterasse os dois juntos deixaria a
  auditoria sem dizer qual deles a pessoa quis corrigir.
- **Confirmar é ação à parte da baixa** porque a conferência costuma
  acontecer depois: o pagamento entra no dia em que a família avisa, e o
  extrato bancário chega no dia seguinte.

Toda gravação passa por `gravarComAuditoria`: financeiro é um dos três dados
com trilha obrigatória (README, seção 6.3).

---

## 5. Reparos feitos nos dados migrados

Dois problemas apareceram quando a tela financeira mostrou os números pela
primeira vez. Ambos foram corrigidos no conversor **e** nos 847 documentos,
por `scripts/migrate-access/reparar-cobrancas.mts`.

### Valores com centavos multiplicados por 100

O Access exporta `Valor` e `Valor Pago` como **float**. O conversor os tratava
como texto brasileiro, onde o ponto separa milhar — e apagava o ponto
decimal:

```
3270.12  →  "3270.12"  →  "327012"  →  R$ 327.012,00
```

Uma parcela de R$ 3.270,12 aparecia como R$ 327.012,00. **56 documentos**
afetados. `parsearValor` agora devolve número que já é número sem passar pela
leitura de texto.

### Campos de emissão nunca gravados

`No Banco` e `No IBPI` existiam na origem e não eram escritos. Os 847
documentos foram preenchidos.

### O script não sobrescreve o que o Portal lançou

Rodar o reparo por cima de uma baixa feita na secretaria apagaria um
pagamento real. Ele pula qualquer parcela com `baixadoPor` preenchido ou
`origem` diferente de `access`.

---

## 6. Pendências

- **Relatório de inadimplência exportável** (Excel/PDF) — hoje a lista é só
  de tela.
- **Vínculo entre contrato e carnê**: o plano gerado não aponta para o item
  contratado que o originou.
- **Juros e multa** não são calculados. O valor pago é digitado como
  aconteceu, e a diferença aparece como saldo.
- Integração de boleto/PIX continua **fora do escopo**. O modelo comporta
  uma, sem migração, mas nada disso está previsto.
