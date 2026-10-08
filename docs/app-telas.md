# Telas do app MyIBPI

Especificação de frontend para a equipe Android. Diz **o que cada tela
mostra, com que palavras, em que estados** — o contrato de dados está em
[`app-mobile.md`](app-mobile.md), e os dois se leem juntos: aqui não se
repete campo de coleção, lá não se discute tela.

A referência é o Portal web, que já está em produção. Onde este documento e
o Portal divergirem, **o Portal está certo** — avise para corrigirmos aqui.

> **Por que copiar as palavras do Portal.** A mesma família usa os dois. Se
> o app disser "Em análise" onde o Portal diz "Em andamento", ela vai achar
> que são coisas diferentes e ligar para a secretaria perguntando qual
> vale. Os rótulos deste documento são os que o Portal mostra, extraídos do
> código.

---

## 1. Quem vê o quê

O app é da **família**. Dois perfis entram:

| Perfil        | Abas                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `responsavel` | Boletim · Frequência · Ocorrências · Financeiro · **Solicitações** · Avisos · Informações úteis |
| `aluno`       | Boletim · Frequência · Avisos · Informações úteis                                               |

O aluno **não** tem Ocorrências, Financeiro nem Solicitações. Não é tela
escondida: as regras negam, e uma consulta dessas falha para ele.

- **Ocorrência** é tratada com o responsável e a equipe.
- **Mensalidade** é assunto de quem paga.
- **Pedido** é ato do adulto por um menor de idade.

Perfis de funcionário (`professor`, `secretaria`, `coordenacao`,
`financeiro`, `admin`) **não usam o app**. Se um deles entrar, mostre uma
tela única dizendo que o acesso dele é pelo Portal, com o endereço — é
melhor que uma tela vazia que parece defeito.

---

## 2. Seletor de aluno

Um responsável pode ter mais de um filho. Toda aba mostra **um por vez**.

- **Com um filho:** nenhum seletor. Mostre o nome do aluno no topo — sem
  ele, a tela parece genérica e a família não tem certeza de quem está
  vendo.
- **Com dois ou mais:** seletor no topo, persistente entre as abas. Trocar
  de aluno em Boletim e voltar em Frequência mostrando outro é o tipo de
  coisa que faz a pessoa desconfiar do número que está lendo.

A seleção guardada **só vale se o vínculo ainda existir**. Filho que saiu da
escola, ou vínculo removido pela secretaria, não pode continuar selecionado
por causa de um valor velho no aparelho — caia no primeiro da lista.

---

## 3. Formatação — cinco regras que já quebraram telas aqui

Valem em todas as abas.

| Dado           | Como mostrar                           | Por quê                                                                                     |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Data**       | `dd/MM/yyyy`, fuso `America/Sao_Paulo` | Datas vêm como `"2026-03-27"`. Convertendo a meia-noite UTC, aparece **26/03** em São Paulo |
| **Dinheiro**   | `R$ 1.234,50`                          | —                                                                                           |
| **Nota**       | **duas** casas, vírgula: `8,48`        | É o que o boletim do colégio mostra                                                         |
| **Percentual** | sem casas: `87%`                       | —                                                                                           |
| **Nada**       | `—` (travessão)                        | Nunca "null", "undefined" nem vazio                                                         |

Para converter data pura, use **meio-dia local**. Essa armadilha já quebrou
boletim e financeiro no Portal.

---

## 4. Cores de situação

Do design system do Portal ([`design-system.md`](design-system.md)).

| Estado                                           | Token     | Hex       |
| ------------------------------------------------ | --------- | --------- |
| Positivo — aprovado, pago, pronto, autorizado    | `success` | `#0E7C3A` |
| Negativo — reprovado, vencido, recusado          | `danger`  | `#B3261E` |
| Atenção — em andamento, a confirmar, recuperação | `warning` | `#8A6100` |
| Neutro — aberto, entregue, cancelado             | cinza     | `#666666` |

**Cancelado é neutro, não vermelho.** Recusa é a escola dizendo não;
cancelamento é a própria família desistindo. A mesma cor faz a segunda
parecer uma reprovação.

O azul da marca é `#0098DA`, mas **não** serve para texto: sobre branco dá
3.2:1 e reprova em acessibilidade. Para texto, link e botão use `#007CB2`.
O amarelo `#FDD900` só como fundo.

---

## 5. Estados de cada tela

Toda aba tem quatro. O terceiro é o mais esquecido e o que mais gera
suporte.

1. **Carregando** — esqueleto, não spinner em tela branca.
2. **Com conteúdo.**
3. **Vazio** — título e uma frase explicando. Textos exatos na seção de cada
   aba. Vazio sem explicação parece defeito.
4. **Erro** — "Não foi possível carregar. Tente de novo." com botão de
   recarregar. **Nunca** mostre a mensagem técnica do Firebase.

> **Consulta negada não é lista vazia.** O app lê o Firestore direto, então
> uma consulta fora do escopo **falha com erro de permissão**. Tratar isso
> como "não há dados" esconde um bug: se aparecer, é o app pedindo algo que
> não devia.

---

## 6. Boletim

Nota por disciplina e trimestre. O colégio trabalha com **três
trimestres**.

Por disciplina: as notas de cada trimestre, a média de cada um, a média
anual, a recuperação quando houver, a média final, as faltas e a situação.

| Situação              | Rótulo              | Cor      |
| --------------------- | ------------------- | -------- |
| `cursando`            | Cursando            | neutro   |
| `aprovado`            | Aprovado            | positivo |
| `recuperacao`         | Em recuperação      | atenção  |
| `reprovado`           | Reprovado           | negativo |
| `reprovado-por-falta` | Reprovado por falta | negativo |

- **Avaliação não lançada é `null`, e `null` não é zero.** Mostre `—`.
  Exibir 0,00 onde o professor ainda não lançou é acusar o aluno de ter
  tirado zero.
- As médias são **calculadas na leitura**, não vêm prontas. A regra está em
  `app-mobile.md`, seção 4.
- Vazio: **"Boletim indisponível"**.

---

## 7. Frequência

Faltas e atrasos do aluno.

| Marca      | Rótulo   |
| ---------- | -------- |
| `presente` | Presente |
| `falta`    | Falta    |
| `atraso`   | Atraso   |

Mostre o **percentual de presença** com destaque — é o número que a família
procura. O mínimo legal, adotado pelo colégio, é **75%** (`FREQUENCIA_MINIMA`
no Portal); abaixo disso, destaque em atenção. Abaixo dele a situação do
boletim vira "Reprovado por falta", então o número precisa aparecer antes de
virar surpresa.

Vazio: **"Nada registrado ainda"** / "As faltas e os atrasos aparecem aqui
conforme o colégio registra."

---

## 8. Ocorrências — só responsável

| Tipo                        | Rótulo                    |
| --------------------------- | ------------------------- |
| `uniforme`                  | Uniforme                  |
| `comportamento-inadequado`  | Comportamento inadequado  |
| `saida-antecipada`          | Saída antecipada          |
| `porte-indevido-de-celular` | Porte indevido de celular |
| `entrada-atrasada`          | Entrada atrasada          |
| `atestado-medico`           | Atestado médico           |
| `falta-justificada`         | Falta justificada         |
| `academica`                 | Ocorrência acadêmica      |
| `outros`                    | Outros                    |

Nem toda ocorrência é disciplinar: `atestado-medico` e `falta-justificada`
são justificativas, e `academica` é pedagógica. **Não pinte a lista inteira
de vermelho** — a família lê a cor antes do texto, e um atestado marcado
como problema é uma conversa desnecessária.

Vazio: **"Nenhuma ocorrência registrada"** / "Nada a relatar até aqui."

---

## 9. Financeiro — só responsável

Totais no topo: **Pago**, **Em aberto**, **Vencido**. Depois a lista de
parcelas.

Por parcela: vencimento, descrição, parcela (`5/12`), valor, data e valor
pagos, forma de pagamento, recibo.

| Situação      | Rótulo      | Cor      |
| ------------- | ----------- | -------- |
| `aberta`      | Em aberto   | neutro   |
| `a-confirmar` | A confirmar | atenção  |
| `paga`        | Paga        | positivo |
| `vencida`     | Vencida     | negativo |

**Descrição do pagamento:** Taxa de matrícula · Taxa de material ·
Mensalidade · Reclassificação · Dependências · Extras · Outros.

**Forma de pagamento:** PIX · Dinheiro · Boleto · Link de pagamento · Cartão
de débito · Cartão de crédito.

Três coisas que a tela precisa acertar:

- **A situação não vem gravada.** O app conclui na leitura; a regra está em
  `app-mobile.md`, seção 8. Parcela paga com atraso continua **paga**.
- **"A confirmar" não é dívida.** Não some ao "em aberto" — seria cobrar de
  novo quem já pagou. Se a distinção confundir, mostre simplesmente "Paga".
- **Parcelas antigas vêm sem descrição e sem forma.** Mostre `—`, não um
  padrão inventado.

Mostre também o **plano de pagamento acordado**, quando existir: texto
livre, com as quebras de linha preservadas.

Vazio: **"Nada registrado"** / "Nenhuma parcela foi lançada para os seus
filhos."

Para o perfil `aluno` a aba não existe. Se por algum caminho ele chegar
nela: **"Financeiro indisponível"** / "O acompanhamento de mensalidade é do
responsável financeiro. Fale com a secretaria."

---

## 10. Avisos

Lista por data, mais recente primeiro. Título, corpo e quando foi publicado.

Marque o **não lido** — é o que faz a aba valer a pena abrir. Note que isso
é **estado local do aparelho**: não existe campo de "lido" no servidor, e o
app não pode criar um (nenhuma escrita é permitida fora das solicitações).
Guarde no dispositivo a data do aviso mais recente já visto.

Vazio: **"Nenhum aviso por enquanto"** / "Os comunicados do colégio aparecem
aqui."

> Anexo de aviso ainda **não tem caminho de leitura** para o app. Se houver
> anexo, diga que ele está disponível no Portal, em vez de mostrar um botão
> que não funciona.

---

## 11. Informações úteis

Cards com ícone. Tocar abre o **texto dentro do app** — não é link externo.

| Tipo                      | Rótulo                         |
| ------------------------- | ------------------------------ |
| `horario-de-aulas`        | Horário das aulas              |
| `calendario-de-avaliacao` | Calendário de avaliação        |
| `calendario-escolar`      | Calendário escolar             |
| `criterios-de-avaliacao`  | Critérios de avaliação         |
| `proposta-pedagogica`     | Proposta Pedagógica            |
| `dependencias`            | Informações sobre Dependências |
| `eletivas`                | Informações sobre Eletivas     |
| `tutoria`                 | Informações sobre Tutoria      |
| `outros`                  | Outros                         |

- **Respeite as quebras de linha** do conteúdo. Um horário de aulas
  colapsado num parágrafo fica ilegível.
- `url` é **opcional e complementar**. Quando vier, ofereça "abrir o
  material completo" no navegador — nunca como único caminho.
- Tipo desconhecido: ícone genérico, **não esconda o card**.

Vazio: **"Nada publicado por enquanto"** / "O calendário, os horários e os
documentos do colégio aparecem aqui."

---

## 12. Solicitações — só responsável

A aba onde a família **escreve**. Três telas.

### 12.1 Lista

Por pedido: tipo, o que foi pedido, aluno, data de abertura e situação.

| Situação       | Rótulo               | Cor        |
| -------------- | -------------------- | ---------- |
| `aberta`       | Aberta               | neutro     |
| `em-andamento` | Em andamento         | atenção    |
| `pronta`       | Pronta para retirada | positivo   |
| `entregue`     | Entregue             | neutro     |
| `autorizada`   | Autorizada           | positivo   |
| `recusada`     | Recusada             | negativo   |
| `cancelada`    | Cancelada            | **neutro** |

- **Mostre desde quando.** "Em andamento" sem data é a informação que faz a
  família ligar para perguntar. Use o último passo do `historico`.
- **O motivo da recusa em destaque.** É a única coisa que explica o "não".
  Sem ele, a resposta vira um enigma que volta como telefonema.
- **"Cancelar"** só quando `situacao == "aberta"`. Fora disso o servidor
  recusa; esconda o botão.

Vazio: **"Nenhum pedido ainda"** / "Peça aqui uma declaração à secretaria e
acompanhe o andamento."

### 12.2 Novo pedido

Primeiro o **tipo**: Documentação ou Saída antecipada. Depois o aluno
(seletor só com dois ou mais filhos). Os campos mudam com o tipo.

**Documentação** — escolha do catálogo (`documentosSolicitaveis`, ativos).

Ao escolher, mostre **antes de enviar**: descrição, prazo e valor.

- Prazo `null` → "Prazo a combinar com a secretaria"
- Prazo `0` → "Pronto no mesmo dia"
- Prazo `n` → "Prazo de _n_ dias úteis" (singular com 1)
- Valor `null` → "Gratuito"; senão `R$ x,xx`
- `exigeComprovante` → aviso em atenção: "Este documento exige comprovante
  de pagamento. Leve-o à secretaria na retirada."

Isso é o que faz a família decidir se pede. Deixar para a confirmação só
gera pedido que será cancelado.

**Saída antecipada** — data, horário, motivo, e se alguém vem buscar.

| Campo              | Tipo                 | Regra                                                      |
| ------------------ | -------------------- | ---------------------------------------------------------- |
| Data               | seletor de data      | obrigatório                                                |
| Horário            | seletor de hora, 24h | obrigatório, enviado como `HH:MM`                          |
| Motivo             | texto                | obrigatório, mín. 3 — "A coordenação decide com base nele" |
| Alguém vem buscar  | checkbox             | desmarcado = sai sozinho                                   |
| Nome de quem busca | texto                | obrigatório **se** marcado                                 |
| CPF                | texto numérico       | obrigatório **se** marcado                                 |

**O CPF vai sem máscara** — onze dígitos. Pode mascarar na tela, mas tire
antes de enviar. Explique por que é pedido: "Quem recebe na portaria não
conhece a família de vista."

Observações é opcional nos dois tipos.

### 12.3 Enviar

`POST /api/solicitacoes` — ver `app-mobile.md`, seção 9.3.

| Resposta | O que fazer                                                              |
| -------- | ------------------------------------------------------------------------ |
| `201`    | Voltar para a lista, com o pedido no topo                                |
| `422`    | **Mostrar o campo `erro`** — é texto em português escrito para a família |
| `401`    | Renovar o token; persistindo, mandar para o login                        |
| `400`    | Erro de programação. Mensagem genérica, e registre no log                |

Desabilite o botão enquanto envia. Dois toques = dois pedidos iguais na
fila da secretaria.

---

## 13. O que não construir agora

- **2ª chamada.** O tipo existe no modelo, mas o pedido ainda não pode ser
  aberto: leva comprovante de pagamento, e não há rota de upload.
- **Push.** Não existe canal. A família descobre abrindo o app.
- **Qualquer escrita fora das solicitações.** Confirmar leitura de aviso,
  editar cadastro, anexar documento — nada disso tem rota. As regras negam
  escrita de cliente em todas as coleções.

---

## 14. Acessibilidade

O Portal segue **WCAG AA** e o app deveria seguir também — parte das
famílias usa o celular com fonte aumentada.

- Contraste mínimo **4.5:1** para texto. Os tokens da seção 4 já passam;
  o azul `#0098DA` **não** passa como texto.
- **Nunca só cor.** "Vencida" em vermelho precisa dizer "Vencida".
- Alvo de toque mínimo **48dp**.
- Respeite a fonte do sistema; não trave tamanho em `sp` fixo pequeno.
