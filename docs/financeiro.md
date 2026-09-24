# Financeiro

**Controle interno.** Nenhum dinheiro passa pelo sistema, nenhum gateway está
integrado. O Portal registra o que já aconteceu no banco ou no caixa do
colégio — é o mesmo papel que a `Tabela_pagamento` do Access tinha.

---

## 1. Duas coleções

| Coleção     | O que é                     | Origem            |
| ----------- | --------------------------- | ----------------- |
| `cobrancas` | as **parcelas** do carnê    | `Tabela_pagamento` (847) |
| `contratos` | os **itens contratados** do ano | `Fatos` (274) |

`contratos` é histórico do Access, mostrado no extrato com o texto original
preservado. Quem gera parcela hoje é o plano de pagamento.

---

## 2. A decisão central: situação não se guarda

**"Vencida" é uma conclusão sobre hoje, não um dado.**

Uma parcela gravada como "em aberto" em abril continuaria gravada assim em
dezembro, muito depois de vencer — e o relatório de inadimplência sairia
errado sem ninguém perceber. O que o banco guarda são os **fatos**:

```
vencimento · valor · dataPagamento · valorPago
```

E `situacaoDaCobranca()` conclui a partir deles, em toda leitura:

| Situação      | Quando                                      |
| ------------- | ------------------------------------------- |
| **Paga**      | existe data de pagamento                    |
| **Vencida**   | sem pagamento e o vencimento já passou      |
| **Em aberto** | sem pagamento e o vencimento ainda não chegou |

Parcela paga com atraso continua **paga**: atraso quitado não é
inadimplência. O **dia do vencimento é do pagador** — quem paga nele está em
dia.

Pagamento parcial existe e aparece como **saldo** mesmo na parcela quitada.
Ele não vira uma quarta situação: o colégio trabalha com três, e o saldo
responde a pergunta que interessa ("quanto ainda falta?").

> A migração chegou a gravar `situacao`. O campo foi apagado dos 847
> documentos — ver a seção 5.

---

## 3. Plano de pagamento

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

| Ação                                   | Perfil                    |
| -------------------------------------- | ------------------------- |
| Ver a lista e o extrato                | Financeiro, secretaria, coordenação |
| Gerar carnê, dar baixa, editar, apagar | **Financeiro**            |
| Ver o extrato dos filhos               | Responsável (somente leitura) |
| —                                      | O **aluno não vê financeiro**: mensalidade é assunto de quem paga |

Secretaria e coordenação têm `ler` no recurso, e a tela não lhes mostra botão
nenhum de lançamento. O guarda de rota confere de novo no servidor: esconder
o botão é conveniência, não segurança.

Regras de escrita que existem por um motivo:

- **Parcela paga não pode ser apagada.** Sumir com ela sumiria com o registro
  de um pagamento que a família fez — e é esse registro que o colégio precisa
  quando a família contesta. Primeiro desfaz-se a baixa.
- **Desfazer baixa existe** porque baixa na parcela errada acontece, e sem
  isso a correção seria apagar e recriar, levando o histórico junto.

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
