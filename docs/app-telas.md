# Telas do app MyIBPI

Especificação de frontend para a equipe Android. Diz **o que cada tela
mostra, com que palavras, em que estados** — o contrato de dados está em
[`app-mobile.md`](app-mobile.md), e os dois se leem juntos: aqui não se
repete campo de coleção, lá não se discute tela.

A referência é o Portal web, que já está em produção. Onde este documento e
o Portal divergirem, **o Portal está certo** — avise para corrigirmos aqui.

> **Já tem uma cópia?** Antes das telas, um estado novo: **conta
> suspensa**. A secretaria pode suspender o acesso, e aí o login falha com
> `auth/user-disabled` e a sessão aberta cai. Mostre *"Seu acesso foi
> suspenso. Fale com a secretaria."* — não a tela de senha errada, que faz
> a pessoa tentar a senha certa indefinidamente.
>
> Mudaram três telas: **Ocorrências** passou a existir
> para o perfil `aluno` (seção 8), **Frequência** ganhou a quarta marca,
> **Boletim só aparece depois de liberado** (seção 6) —
> `saida-antecipada` entrou na frequência (seção 7), e o **Boletim** ganha o bloco do critério de
> avaliação (seção 6), que também aparece em **Informações úteis** (seção
> 11). A lista completa das mudanças de dados está no topo de
> [`app-mobile.md`](app-mobile.md).

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
| `aluno`       | Boletim · Frequência · **Ocorrências** · Avisos · Informações úteis                            |

O aluno **não** tem Financeiro nem Solicitações. Não é tela escondida: as
regras negam, e uma consulta dessas falha para ele.

**Ocorrências entrou para o aluno**, e com uma ressalva que muda a tela: ele
só enxerga as ocorrências que a escola **marcar** para ele, uma a uma. O
padrão é não marcar, então na maioria das contas a aba abre vazia — e isso é
o comportamento correto, não um erro a investigar. Ver `app-mobile.md`,
seção 2.

Os **acessos às plataformas** (seção 12b) não são aba: ficam no início,
junto do seletor de aluno, e valem para os dois perfis.

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

> **No cabeçalho, a situação da matrícula.** Aluno transferido ou com
> matrícula cancelada precisa ver isso ao abrir o boletim, e não descobrir
> pela ausência de notas novas. Use `situacaoMatricula` — o campo pode
> faltar em cadastro migrado; ver `app-mobile.md`, seção 1.

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

### O boletim só aparece depois de liberado

A secretaria libera **por aluno e por trimestre**, quando o trimestre
fecha. Antes disso a família não recebe aquelas notas — a consulta nem as
traz.

- **Nenhum trimestre liberado:** não mostre a grade com traços, que faria
  parecer que o colégio não lançou nada. Diga **"Boletim ainda não
  liberado"** / "As notas são publicadas quando o trimestre fecha. Assim
  que o colégio liberar, o boletim aparece aqui."
- **Liberado em parte:** mostre o que veio e avise até onde vai —
  *"Liberado até o 2º trimestre. Os demais aparecem quando o colégio
  publicar."* Sem isso, quem abre em novembro com só o 1º liberado acha que
  o colégio parou de lançar nota.
- **Não diga quantos faltam nem quando sai.** O colégio decide o dia, e uma
  promessa na tela vira cobrança na secretaria.

### Como o aluno é avaliado — bloco novo

Abaixo das notas, quando o colégio tiver publicado um critério para aquele
ano. Título: **"Como o aluno é avaliado"**.

Mostre, nesta ordem: quantos períodos e como o colégio os chama, a média
mínima, a frequência mínima, a lista do que compõe a média (nome e quanto
vale, em texto) e, quando houver, "Como se calcula" e "Recuperação".

| Decisão | Por quê |
| --- | --- |
| Fica **no boletim**, não numa tela à parte | a pergunta "como essa média foi calculada?" nasce com o boletim na mão |
| **Sai na impressão / PDF**, se vocês tiverem | resposta em outra tela não chega a quem imprimiu o papel |
| Sem critério publicado, **não mostre bloco nenhum** | nem um vazio dizendo que falta algo |
| **Não recalcule nada com isto** | `peso` é texto ("1/3 da média"), não número; a conta é a da seção 4 de `app-mobile.md` |

Qual critério mostrar e a ordem de preferência estão em `app-mobile.md`,
seção 4b. Em resumo: o do curso do aluno ganha do geral do colégio.

---

## 7. Frequência

Faltas, atrasos e saídas antecipadas do aluno.

| Marca              | Rótulo           | Conta como   |
| ------------------ | ---------------- | ------------ |
| `presente`         | Presente         | presença     |
| `falta`            | Falta            | falta        |
| `atraso`           | Atraso           | **presença** |
| `saida-antecipada` | Saída antecipada | **presença** |

Atraso e saída antecipada **não são falta**: o aluno esteve na aula. Somá-los
às faltas mostraria à família uma reprovação que não existe.

Mostre o **percentual de presença** com destaque — é o número que a família
procura. O mínimo legal, adotado pelo colégio, é **75%** (`FREQUENCIA_MINIMA`
no Portal); abaixo disso, destaque em atenção. Abaixo dele a situação do
boletim vira "Reprovado por falta", então o número precisa aparecer antes de
virar surpresa.

Vazio: **"Nada registrado ainda"** / "As faltas e os atrasos aparecem aqui
conforme o colégio registra."

---

## 8. Ocorrências — responsável sempre, aluno quando liberado

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

**Quem vê o quê.** Cada ocorrência traz dois campos de publicação, e a
escola decide caso a caso: o responsável lê a menos que o registro tenha
sido retido; o aluno lê só o que for marcado para ele. A regra está em
`app-mobile.md`, seção 2 — aqui o que importa para a tela é o resto deste
bloco.

**Nunca diga que há algo retido.** Nada de "1 ocorrência oculta": isso
entrega o fato sem o contexto, que é justamente o que a retenção quis
evitar. Para o app, a ocorrência retida simplesmente não existe.

**A lista muda sozinha.** A coordenação altera a publicação depois do
registro, então um item pode sumir entre uma abertura e outra. Não avise, não
trate como erro de sincronização, e **não guarde em cache que sobreviva à
sessão** — um registro retido depois de baixado continuaria na tela do
aparelho.

Vazio: **"Nenhuma ocorrência registrada"** / "Nada a relatar até aqui."

Para o aluno, o vazio é o caso comum. Use o mesmo texto: "Nada a relatar até
aqui" serve, e não insinua que existe algo guardado.

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

**E o boleto**, quando houver: um botão de baixar, com o recado da
secretaria acima. Sem boleto enviado, **não mostre o botão** — melhor
nenhum botão que um que falha. Ver `app-mobile.md`, seção 8.

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

Anexo de aviso **já pode ser aberto pelo app**: `GET
/api/avisos/{id}/anexo/{indice}`, com o cabeçalho `Authorization`. Mostre
nome e tamanho antes de baixar — parte das famílias está no 4G.

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

### O critério de avaliação também entra aqui

Além dos cards acima, mostre o critério publicado — é onde a família o
procura fora da época de boletim. Mesmo conteúdo do bloco do boletim, num
card com o título **"Como o aluno é avaliado"**.

> ⚠️ **Não confunda com o card `criterios-de-avaliacao` da tabela acima.**
> Aquele é um texto livre que a secretaria publica na coleção
> `informacoes`. Este vem de `criteriosDeAvaliacao`, é estruturado e tem
> ano e curso. Os dois podem existir ao mesmo tempo.

Aqui **não há aluno selecionado**, e é o curso do aluno que decide qual
critério vale. Então:

- irmãos sob a mesma regra viram **um card só** — repetir o mesmo texto por
  filho enche a tela;
- critérios diferentes aparecem **os dois**, cada um dizendo a que curso se
  aplica;
- com um critério só, **não escreva o curso**: não informa nada e vira
  ruído.

Vazio: **"Nada publicado por enquanto"** / "O calendário, os horários e os
documentos do colégio aparecem aqui."

Se não houver card nenhum **mas houver critério**, não mostre o vazio: ele
desmentiria o que está logo abaixo.

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
- **Na 2ª chamada, link para o comprovante** — `GET
/api/solicitacoes/{id}/comprovante`, com o mesmo cabeçalho de
  autorização. Abra no visualizador do aparelho; não tente o bucket, que
  nega.
- **"Cancelar"** só quando `situacao == "aberta"`. Fora disso o servidor
  recusa; esconda o botão.

Vazio: **"Nenhum pedido ainda"** / "Peça aqui uma declaração à secretaria e
acompanhe o andamento."

### 12.2 Novo pedido

Primeiro o **tipo**: Documentação, Saída antecipada ou 2ª chamada. Depois o aluno
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

**2ª chamada** — disciplina, data da prova perdida e o comprovante.

| Campo             | Tipo               | Regra                                     |
| ----------------- | ------------------ | ----------------------------------------- |
| Disciplina        | seletor            | obrigatório, da coleção `disciplinas`     |
| Data da avaliação | seletor de data    | opcional — "se você souber"               |
| Comprovante       | seletor de arquivo | **obrigatório**; PDF ou imagem, até 10 MB |

Diga por que o comprovante é pedido: "A secretaria confere antes de liberar
a prova." Valide tipo e tamanho **antes de enviar** — subir 10 MB no 4G para
receber uma recusa é a pior forma de descobrir que o arquivo era `.docx`.

Mostre o nome do arquivo escolhido e deixe trocar. E **avise do progresso**:
num upload de celular, um botão que não responde por quinze segundos parece
travado, e a pessoa toca de novo.

Observações é opcional nos três tipos.

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

## 12b. Acessos às plataformas

Tela nova. O colégio cria as contas do aluno no **IBPI Online** (Classroom)
e no **Plural** (material didático); a família esquece e liga para a
secretaria. Aqui ela consulta sozinha.

Fica no **início do app**, junto do seletor de aluno — não enterrada numa
aba. É consulta rápida, feita em pé na porta da escola.

Um bloco por plataforma:

```
┌──────────────────────────────────────┐
│ Meu IBPI                             │
│ Este aplicativo                      │
│ E-mail: maria@gmail.com      [copiar]│
│                                      │
│ Esqueceu a senha? Toque em           │
│ "Esqueci minha senha" na entrada.    │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ IBPI Online                          │
│ Plataforma de aula                   │
│ Usuário: aluno.maria         [copiar]│
│ Senha:   ••••••••     [olho][copiar] │
└──────────────────────────────────────┘
```

Regras da tela:

- **Senha escondida por padrão**, com botão de revelar. A família abre isto
  com o celular na mão, muitas vezes perto de outras pessoas.
- **Botão de copiar em usuário e senha.** O uso real é colar na outra
  plataforma. Confirme visualmente que copiou e volte ao normal em uns dois
  segundos — um "copiado" permanente deixa de informar.
- **Só mostre a plataforma que tem algo cadastrado.** Bloco vazio com dois
  travessões não ajuda ninguém.
- **Nada cadastrado:** "A secretaria ainda não cadastrou os acessos às
  plataformas. Fale com ela."
- `observacoes` é texto da secretaria **para a família ler** — mostre.

**A senha do Meu IBPI não existe para ser mostrada.** É a do Firebase Auth,
guardada como hash: nem o colégio consegue lê-la. Esse bloco mostra o
e-mail de acesso e aponta para a redefinição.

> **Não guarde essas senhas em cache no aparelho** e não as registre em
> log. Leia quando a tela abrir.

---

## 13. O que não construir agora

- **Push.** Não existe canal. A família descobre abrindo o app.
- **Prazo para pedir 2ª chamada.** O sistema não recusa pedido feito tarde
  demais; a secretaria decide caso a caso.
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
