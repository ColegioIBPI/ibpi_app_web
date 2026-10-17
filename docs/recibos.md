# Recibos

O papel que a família leva embora. É isso que decide quase tudo aqui.

---

## 1. A decisão central: recibo não se edita

**Corrigir um recibo já entregue faria o papel na mão da família discordar
do sistema.** A conferência de caixa passaria a depender de qual dos dois
alguém olhou primeiro — e o colégio não teria como saber qual é o certo.

Então o recibo é **imutável depois de emitido**. Errou, cancela e emite
outro. Os dois ficam no histórico.

O cancelamento **exige motivo**: recibo anulado sem explicação vira dúvida
no fechamento, e quem cancelou raramente está por perto quando a dúvida
chega.

**O número cancelado não é reaproveitado.** O buraco na sequência é o que
prova, na conferência, que o recibo existiu e foi anulado. Reemitir o 42
apagaria essa prova.

E o cancelamento é **impresso em cima do documento**, não escondido num
rodapé: a 2ª via de um recibo cancelado circula, e quem a receber precisa
ver na primeira olhada que ela não vale.

---

## 2. A numeração

`seriesDeRecibo/{serie}` é o **talão**: uma série e o próximo número dela.

Documento separado do recibo porque é **contador**, e contador se lê e se
escreve em transação.

### Por que transação

Duas pessoas emitindo ao mesmo tempo leriam o mesmo "próximo número", e o
colégio teria dois recibos nº 42 — descobertos semanas depois, na
conferência. A transação refaz a leitura quando alguém passa na frente.

O **id do documento é determinístico** (`A-000042`), e essa é a segunda
trava: criar um documento que já existe falha. Com id gerado pelo Firestore,
duas gravações simultâneas criariam dois documentos com o mesmo número e
ninguém saberia.

> Conferido contra o banco real: dez emissões simultâneas no mesmo talão
> saíram 848–857, sem repetir e sem buraco.

A série é guardada **em maiúsculas**. Sem isso, `a` e `A` seriam dois
contadores para o mesmo talão, e o segundo começaria do 1 repetindo recibos
que já existem.

### O talão de papel

Ao abrir a série, informa-se o **próximo** número. O colégio que já está no
847 informa 848, e o sistema não emite um recibo que está numa gaveta.

Série não se apaga, se **encerra**: os recibos dela continuam sendo
procurados depois de o talão fechar.

---

## 3. O que fica no recibo

**Cabeçalho:** série, número, status, emissor, e os dados do aluno —
matrícula, nome, curso e série.

O **emissor não é digitado**: vem da sessão. Um campo de texto convidaria a
digitar o nome de outra pessoa, e é a assinatura do recibo que está em jogo.

**Os dados do aluno são cópia, não ponteiro.** Um recibo que buscasse o nome
no cadastro mudaria sozinho quando o aluno trocasse de série no ano
seguinte, e a 2ª via sairia diferente da 1ª — que é justamente a que a
família tem guardada.

**Corpo:** um item por serviço cobrado, cada um com serviço, referência
(`Parcela 5/12`), forma de pagamento, número ou código do pagamento e valor.

A forma de pagamento é **por item**, e não do recibo: a família que paga a
matrícula no PIX e o material no cartão leva um recibo só.

**Rodapé:** observação e total.

### O total não é gravado

É concluído na leitura, somando os itens. Guardar o total criaria duas
verdades sobre o mesmo papel, e nada impediria a soma de envelhecer. O risco
que existe em `cobrancas` não existe aqui, porque recibo não se edita.

**A soma é em centavos.** Somar reais em ponto flutuante acumula erro —
`0.1 + 0.2` não dá `0.3` —, e num recibo o centavo que falta é o centavo que
a família aponta com o dedo. É a mesma conta que o carnê já faz.

A prévia na tela usa **a mesma função** que o servidor, então o total que a
secretaria confere antes de emitir é, por construção, o que sai impresso.

---

## 4. Dois vocabulários próprios

| | Recibo | `cobrancas` |
| --- | --- | --- |
| Serviço | 14 opções | 7 |
| Pagamento | 10, com bandeira | 6, sem bandeira |

**Não são os mesmos enums, de propósito.**

Metade da lista de serviços do recibo não é parcela de carnê: declaração, 2ª
via de histórico, taxa de publicação no D.O., taxa de formatura. Forçar os
dois a compartilhar o vocabulário obrigaria a inventar "taxa de formatura"
como tipo de mensalidade — ou deixaria o recibo sem metade do que o colégio
de fato cobra.

No pagamento, o recibo distingue a **bandeira** (Visa, Master, outro) porque
é ela que aparece no extrato da maquininha: sem isso, conferir o fechamento
do dia obriga a abrir recibo por recibo.

É a mesma razão pela qual `tipo` e `tipoDeContrato` já são vocabulários
diferentes — ver [financeiro.md](financeiro.md), seção 3.

---

## 4b. A quitação da parcela

Um item do recibo pode apontar para a **parcela que ele quita**
(`cobrancaId`). Quando aponta, **emitir o recibo dá baixa na parcela** — no
mesmo commit.

**Emitir recibo de mensalidade é dar baixa nela.** Separar os dois atos
obrigaria a lançar a mesma informação duas vezes, e bastaria esquecer a
segunda para o extrato cobrar de novo quem já pagou, com o recibo na mão
para provar.

A maior parte dos itens **não** aponta para parcela nenhuma: declaração, 2ª
via e taxa de formatura não nascem de carnê.

### Quem pode ligar

**Quem emite o recibo.** Quem recebe o dinheiro no balcão é quem dá o
papel, e na secretaria do IBPI isso inclui mensalidade — então `recibos:
lancar` é a permissão que vale, e cancelar segue a mesma regra: o engano é
de quem estava no balcão.

Isso faz da emissão **o único caminho pelo qual a secretaria escreve em
`cobrancas`**, tendo apenas `financeiro: ler`. O caminho é estreito de
propósito: o pagamento entra preso ao que o recibo diz. Gerar carnê, mudar
valor de parcela e apagar parcela continuam exigindo `financeiro: lancar`,
e nada disso tem porta aqui.

A coordenação não emite (`recibos: ler`), então também não quita.

### As travas

- **A parcela é relida dentro da transação.** Entre a secretaria ver a lista
  e clicar em emitir, o financeiro pode ter dado baixa na mesma parcela; sem
  reler, o segundo recibo passaria por cima do primeiro pagamento. Parcela
  paga, de outro aluno ou inexistente **aborta a emissão inteira** — não
  existe recibo meio emitido.
- **Duas linhas não apontam para a mesma parcela.** Uma pagaria e a outra
  sobrescreveria, deixando o total do recibo maior que a baixa.
- **Trocar o aluno no formulário desliga as parcelas já lançadas**, senão o
  recibo de um sairia com a baixa do carnê do outro.

### Cancelar devolve a parcela — com uma condição

O cancelamento desfaz a baixa **só se a parcela ainda aponta para aquele
recibo**. Se ela já foi paga de novo por um recibo mais recente, cancelar o
antigo apagaria o pagamento válido — e a família passaria a dever uma
mensalidade que pagou duas vezes.

> Conferido contra o banco real: emitir quita; reemitir é recusado;
> cancelar devolve a parcela; e cancelar o recibo antigo **depois** da
> reemissão não encosta no pagamento novo.

### A bandeira não desce para a parcela

`cobrancas.formaDePagamento` para em "cartão de crédito". A conversão é uma
função testada e não um `as` no meio da transação: gravar `credito-visa` num
campo que não conhece esse valor deixaria a coluna vazia no extrato.

### Os dois lados do vínculo

| Onde | Campo | Para quê |
| --- | --- | --- |
| Recibo | `itens[].cobrancaId` | o que o documento quitou |
| Parcela | `reciboId` | ir do extrato ao recibo |

Guardar dos dois lados é deliberado: o Firestore **não consulta campo dentro
de array de mapas**, então sem `reciboId` montar o extrato exigiria varrer
todos os recibos do colégio. Os dois são escritos na mesma transação, então
não divergem.

A data da baixa é calculada **no fuso do colégio**. A Vercel roda em UTC: um
recibo emitido às 22h de 10/03 em São Paulo é 01h de 11/03 em UTC, e a baixa
sairia com a data do dia seguinte.

---

## 5. Quem faz o quê

| Ação | Perfil |
| --- | --- |
| Emitir e cancelar | **Secretaria**, **financeiro**, administração |
| Abrir e encerrar talão | **Secretaria**, **financeiro**, administração |
| Ver e reimprimir | + coordenação |
| — | Professor e família **não acessam** |

**Recibo é recurso próprio, não um nível a mais em `financeiro`.** Metade da
lista de serviços é cobrada no balcão da secretaria, que tem `financeiro:
ler`. Subir esse nível para `lancar` resolveria o recibo e daria de brinde a
baixa de parcela, que não é dela.

A família **não lê** por ora: ela recebe o papel na mão. Mostrar os recibos
no aplicativo é desejável e não foi pedido; quando for, é a leitura por
`ehFilho(resource.data.aluno.matricula)` que entra na regra.

Nada é escrito pelo cliente — e aqui com um motivo a mais: o número sai de
um contador em transação, e cliente nenhum pode encostar nele.

---

## 6. Impressão

A mesma marcação na tela e no papel; o `@media print` do `globals.css` só
esconde a navegação. Gerar um PDF no servidor exigiria uma segunda descrição
do documento para manter em sincronia com esta — e é assim que o papel e a
tela passam a discordar.

---

## 7. Pendências

- **Baixa parcial não é oferecida na tela.** O valor do item vem do valor
  da parcela e pode ser editado, mas a tela não explica que pagar menos
  deixa saldo em aberto.
- **Recibo no aplicativo**, para a família baixar a 2ª via.
- **Relatório de caixa por dia e por forma de pagamento** — hoje a lista é
  por recibo.
