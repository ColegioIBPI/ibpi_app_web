# Contrato de dados para o app MyIBPI

O que o aplicativo Android precisa saber para as abas **Frequência,
Boletim, Ocorrências, Avisos, Informações úteis, Financeiro e
Solicitações**.

O Portal e o app falam com o **mesmo projeto Firebase** (`colegioibpi`) e as
**mesmas coleções**. Quem define a forma dos dados é o Portal — este
documento é o retrato dela, e é atualizado junto do código. Quando os dois
discordarem, o código do Portal é que está certo; avise para corrigirmos
aqui.

> **Procurando telas?** Este documento é o contrato de **dados**. O que cada
> tela mostra, com que palavras e em que estados está em
> [`app-telas.md`](app-telas.md). Os dois se leem juntos: aqui não se
> discute tela, lá não se repete campo de coleção.

**Duas formas de acesso, e a distinção organiza o documento inteiro:**

|              | Como                      | Onde está    |
| ------------ | ------------------------- | ------------ |
| **Ler**      | SDK do Firestore, direto  | seções 1 a 9 |
| **Escrever** | HTTP no Portal, com token | seção 9.3    |

O app lê o Firestore direto, então as `firestore.rules` valem para ele: não
há servidor intermediário aplicando escopo, e uma consulta fora do que a
pessoa pode ver **falha**, não devolve vazio. Já escrever é sempre por rota
HTTP — a regra nega toda escrita de cliente, em todas as coleções, e hoje a
única escrita que existe é a abertura de solicitações.

---

## 0. Para começar

**Projeto Firebase:** `colegioibpi`, região `southamerica-east1`.

**`google-services.json`:** peça ao Jorge. Ele **não** está no repositório e
não deve entrar em nenhum — é a configuração do app no projeto.

**Login:** e-mail e senha pelo SDK, `signInWithEmailAndPassword`. Não há
cadastro pelo app: as contas são criadas pela secretaria no Portal. Quem
tentar entrar sem conta recebe erro de credencial, e é o comportamento
correto.

```kotlin
FirebaseAuth.getInstance()
  .signInWithEmailAndPassword(email, senha)
```

**Perfil e vínculos** vêm de `users/{uid}` — leia logo após o login:

```
users/{uid} = {
  role: "responsavel" | "aluno" | ...,
  nome: string,
  email: string,
  ativo: boolean,                  // false = conta desativada
  matricula: string | null,        // quando role = aluno
  alunosVinculados: string[],      // quando role = responsavel
  chavesDeAlcance: string[]        // usado por avisos e informações úteis
}
```

Quase tudo no app parte de `alunosVinculados`: é por ele que se monta o
seletor de filhos e se filtram boletim, frequência, financeiro e
solicitações.

> ⚠️ Alguns documentos ainda têm um campo **`chavesDeAviso`**, nome antigo
> do mesmo dado. Ele está congelado: o servidor só atualiza
> `chavesDeAlcance`. Usar o antigo funciona hoje e para de funcionar no dia
> em que um aluno mudar de turma — **use `chavesDeAlcance`**.

**Base das rotas HTTP:** `https://ibpi-app-web.vercel.app`

**Arquivo nunca vem do bucket.** Foto, anexo e comprovante saem por rota do
Portal, com o mesmo cabeçalho `Authorization` — o SDK do Storage falaria
direto com o bucket, que nega.

**Fuso:** o colégio é São Paulo. Ver a seção 5 antes de converter qualquer
data — a armadilha de meia-noite UTC já quebrou boletim e financeiro aqui.

---

## 1. `alunos` — o seletor de aluno

**O id do documento é a matrícula.** Confirmado nos 73 documentos: nenhum
tem id diferente do campo `matricula`.

```
alunos/26007
```

Então a leitura correta é **uma só**:

```kotlin
db.collection("alunos").document(matricula).get()
```

Não é preciso o caminho alternativo por `where("matricula", ==, …)`.

Campos que o app usa:

| Campo         | Tipo    | Observação                                 |
| ------------- | ------- | ------------------------------------------ |
| `matricula`   | string  | Igual ao id do documento                   |
| `nome`        | string  | Nome completo, como a escola escreve       |
| `turmaId`     | string  | `2026-EM1A` — **o ano faz parte da chave** |
| `turmaCodigo` | string  | `EM1A`, `E.J.A. EF` — o que se mostra      |
| `segmento`    | string  | Ver seção 5                                |
| `serie`       | string  | `"1"`, `"2"` — número, não por extenso     |
| `turno`       | string  | `manha` · `tarde` · `flex`                 |
| `ativo`       | boolean | `false` é ex-aluno; some das listagens     |

De quais alunos o responsável dispõe: `users/{uid}.alunosVinculados`, uma
lista de matrículas.

```
users/{uid} = {
  role: "responsavel",
  nome: string,
  email: string,
  ativo: boolean,
  alunosVinculados: ["26007", "25022"]
}
```

`role` também vem nas **custom claims** do token
(`request.auth.token.role`), e é o que as Security Rules leem.

> **Persistir a escolha do aluno vale a pena.** Perder a seleção ao fechar o
> app obriga a família com dois filhos a trocar toda vez que abre — e a
> segunda criança some da vista no uso diário.

---

## 2. Ocorrências — disciplinar × acadêmica

**Não há um campo separando as duas.** Existe um único `tipo`, e a
distinção está no valor: `academica` é a acadêmica, todo o resto é
disciplinar ou administrativo.

Os nove valores, exatamente como gravados, com o rótulo que o Portal
mostra:

| Valor no banco              | Rótulo                    | Natureza       |
| --------------------------- | ------------------------- | -------------- |
| `uniforme`                  | Uniforme                  | disciplinar    |
| `comportamento-inadequado`  | Comportamento inadequado  | disciplinar    |
| `saida-antecipada`          | Saída antecipada          | administrativa |
| `porte-indevido-de-celular` | Porte indevido de celular | disciplinar    |
| `entrada-atrasada`          | Entrada atrasada          | administrativa |
| `atestado-medico`           | Atestado médico           | justificativa  |
| `falta-justificada`         | Falta justificada         | justificativa  |
| `academica`                 | Ocorrência acadêmica      | **acadêmica**  |
| `outros`                    | Outros                    | —              |

A lista saiu da própria planilha do colégio (aba RD, "Tipos de
ocorrência"). A coluna "Natureza" acima é leitura minha para a aba do app —
**não está no banco**. Se o app precisar do agrupamento como dado, ele
precisa ser confirmado com a coordenação e gravado.

### Onde a ocorrência vive

Em **duas** coleções, de propósito:

- `frequenciaDiaria/{data}-{matricula}` — campo `ocorrencia`, opcional.
  É o lançamento junto da chamada.
- `ocorrencias/{data}-{matricula}-{tipo}` — o registro próprio, criado
  automaticamente quando a chamada traz uma ocorrência.

A aba **Ocorrências** do app deve ler `ocorrencias`:

```
ocorrencias/{id} = {
  data: "2026-09-24",      // AAAA-MM-DD, string
  matricula: string,
  nome: string,
  turmaId: string,
  turmaCodigo: string,
  tipo: <um dos nove acima>,
  descricao: string,
  registradoPor: string    // uid de quem lançou
}
```

> ⚠️ **O perfil `aluno` não pode ver a própria ocorrência disciplinar.** É
> decisão do colégio: a ocorrência é tratada com o responsável. As Security
> Rules já barram — o app não precisa reimplementar, mas precisa não
> prometer a aba ao aluno.

---

## 3. Frequência

São **duas contagens diferentes**, e elas não se somam:

| Coleção            | Conta     | Papel                                         |
| ------------------ | --------- | --------------------------------------------- |
| `frequenciaDiaria` | **dias**  | Oficial: decide reprovação por falta (25%)    |
| `diarioClasse`     | **aulas** | Por disciplina; alimenta as faltas do boletim |

Um aluno pode faltar à aula de Física do terceiro tempo e ter estado na
escola o dia inteiro. Somar as duas inventaria uma falta.

```
frequenciaDiaria/{data}-{matricula} = {
  data: "2026-09-24",
  matricula: string,
  nome: string,
  turmaId: string,
  turmaCodigo: string,
  situacao: "presente" | "falta" | "atraso",
  aula: number | null,        // preenchido só em marcação por aula
  ocorrencia: string | null,
  observacao: string | null
}
```

**Atraso conta como presença** no percentual. O atraso é registrado à parte
porque interessa à coordenação, mas transformá-lo em falta inventaria uma
reprovação que o colégio não aplica.

Percentual = `(presenças + atrasos) / dias registrados`. Com zero dias
registrados, o resultado é **indefinido** — mostrar "0% de presença" no
começo do ano assusta a família à toa.

### Faltas por disciplina

```
diarioClasse/{alocacaoId}-t{trimestre} = {
  anoLetivo: number,
  trimestre: 1 | 2 | 3,
  turmaId: string,
  disciplinaId: string,
  disciplinaNome: string,
  professorNome: string,
  aulas: [{
    numero: number,
    data: "2026-09-22",
    conteudo: string | null,
    semAula: "ferias" | "recesso" | "ponte" | "feriado" | null,
    presencas: { "26007": false }     // só quem faltou
  }]
}
```

Duas regras que o app precisa respeitar para chegar no mesmo número:

- **Em `presencas` só entra quem faltou.** Aluno ausente do mapa esteve
  presente. Gravar `true` para os presentes encheria o documento com a
  turma inteira a cada aula.
- **Aula com `semAula` preenchido não entra na conta.** Contá-la
  transformaria o recesso escolar em falta de todo mundo.

---

## 4. Boletim — as regras estão definidas

**O sistema é trimestral**, não bimestral. Confirmado com a direção.

| Item                            | Regra                                      |
| ------------------------------- | ------------------------------------------ |
| Períodos                        | **3 trimestres**                           |
| Avaliações por trimestre        | **Projeto**, **Tarefas**, **AV**           |
| Escala                          | 0 a 10, **duas casas decimais**            |
| Média do trimestre              | `(Projeto + Tarefas + AV) ÷ 3`             |
| Média anual                     | média dos três trimestres                  |
| Aprovação                       | média ≥ **5,0** **e** frequência ≥ **75%** |
| Recuperação                     | apenas **final**, no fim do ano            |
| Média final                     | `(média anual + recuperação) ÷ 2`          |
| **EF, EM, EJA e Cursos Livres** | **mesma regra, sem diferença**             |

Quatro decisões que mudam o número na tela:

1. **Nota ausente não é zero.** A média fica em branco enquanto faltar
   qualquer uma das três avaliações. Dividir por 3 com a AV não lançada
   mostraria 6,7 para um aluno com 10 e 10.
2. **Duas casas, arredondando antes de comparar.** `7,83 + 10,00 + 7,60`
   fecham em **8,48**. Um boletim que estampa "5,00" e diz "reprovado"
   porque internamente era 4,996 é indefensável diante da família.
3. **Média parcial ≠ média anual.** A coluna TOTAL mostra a média dos
   trimestres **já fechados** — com só o 1º lançado, mostra a média dele. A
   média anual, que decide aprovação, só existe com os três. Confundi-las
   reprova um aluno em março.
4. **A frequência que reprova é a geral do ano**, não a da disciplina: o
   limite de 25% é da carga horária total, então quem passa dele reprova em
   tudo.

### De onde ler

```
notas/{ano}-t{trimestre}-{matricula}-{disciplina} = {
  anoLetivo, trimestre, matricula, turmaId,
  disciplinaId, disciplinaNome,
  avaliacoes: { projeto: number|null, tarefas: number|null, av: number|null },
  faltas: number
}

boletins/{ano}-{matricula} = {
  recuperacoes: { "fisica": 6.5 },
  eletivas: [{ nome, periodo, situacao }],
  dependencias: [{ disciplinaNome, tipo, p1, p2, recuperacao, ... }],
  projetoBilingue: { nivel: "N2", componentes: [{ nome, trimestres, recuperacao }] },
  observacoes: string | null
}
```

**As médias não estão gravadas** — são calculadas na leitura, a partir de
`notas`. Guardar o boletim pronto significaria que corrigir uma nota deixa
o consolidado velho no banco, e o boletim errado é o que chega à família.
**O app precisa fazer a mesma conta**, com as quatro regras acima.

O documento `boletins` guarda só o que não é derivável.

> `boletins.disciplinas[]` está vazio hoje. Ele é o retrato do fechamento
> do ano, que ainda não foi implementado.

Detalhe completo, com exemplos: [`avaliacao.md`](avaliacao.md).

---

## 5. Valores fechados

```
segmento:  fundamental | medio | eja-fundamental | eja-medio
turno:     manha | tarde | flex
situacao (presença):  presente | falta | atraso
situacao (cobrança):  calculada, não gravada — ver seção 8
role:      aluno | responsavel | professor | secretaria | coordenacao
           | financeiro | admin        // admin = administração do sistema,
                                       // enxerga tudo; o app não precisa
                                       // tratar, não é perfil de família
```

Datas puras são **string `AAAA-MM-DD`**, nunca `Timestamp`. Ao converter
para `Date`, use **meio-dia local** — à meia-noite UTC o dia anterior
aparece no fuso de São Paulo, e isso já quebrou boletim e financeiro aqui.

---

## 6. Avisos

```
avisos/{id} = {
  titulo, corpo,
  destino: { tipo: "todos" | "segmento" | "turma" | "aluno" | "responsavel", ... },
  chave: "todos" | "segmento:medio" | "turma:2026-EM1A" | "aluno:26007" | "responsavel:cpf-…",
  anexos: [{ path, nome, tipo, tamanho }],
  publicadoEm, publicadoPorNome, ativo, notificadoEm
}
```

O campo `chave` existe justamente para o app consultar
`where("chave", "in", [minhas chaves])` sem índice composto.

A regra usa esse campo. Ela **não recalcula o alcance** — lê a lista pronta
de `users/{uid}.chavesDeAlcance`, gravada pelo Portal a partir da mesma função
que o servidor usa (`features/avisos/domain/destinatarios.ts`).

```kotlin
val chaves = usuario.get("chavesDeAlcance") as List<String>

db.collection("avisos")
  .whereEqualTo("ativo", true)
  .whereIn("chave", chaves)   // o Firestore aceita até 30 por consulta
  .get()
```

Refazer a conta do alcance dentro da regra seria manter duas versões da
mesma decisão, e divergir ali significa aviso de uma família aparecendo para
outra. Regra do Firestore também não percorre lista: a partir de
`alunosVinculados` não daria para montar a chave da turma de cada filho.

O Portal mantém `chavesDeAlcance` em dia sozinho — na criação da conta, na
troca de vínculo e quando o aluno muda de turma.

**Duas coisas para o app respeitar:**

- **Filtre `ativo == true`.** Aviso despublicado some para a família e
  continua para a equipe: o que foi comunicado fica registrado.
- **Se `chavesDeAlcance` faltar**, a pessoa ainda lê o aviso geral. A regra
  tem esse caminho para uma conta antiga não perder até o comunicado da
  escola inteira — mas o app não deve contar com ele.

Verificado com o SDK cliente, entrando como responsável de teste: lê o geral,
o da turma do filho e o individual do filho; não lê o de outra turma, o de
outro aluno, nem o despublicado. O acesso direto ao documento de outra
família é negado.

### Anexos

`anexos[].path` é caminho no **Cloud Storage**, não URL, e as regras do
Storage **negam todo acesso do cliente**. Nenhum arquivo do sistema tem
endereço público: foto de aluno, anexo de aviso e comprovante de 2ª chamada
saem por rota autenticada no Portal.

**Essas rotas aceitam o token do app**, com o mesmo cabeçalho das demais:

```
GET /api/avisos/{id}/anexo/{indice}
GET /api/alunos/{matricula}/foto
Authorization: Bearer <idToken>
```

Cada uma aplica o **mesmo escopo** do dado que protege — o anexo confere o
alcance do aviso, a foto confere o escopo do cadastro. Quem não tem direito
recebe `404`, nunca `403`: "existe, mas você não pode ver" já confirma que
a pessoa estuda aqui.

Baixe com `okhttp` em vez do SDK do Storage — o SDK falaria direto com o
bucket, que nega.

---

## 7. Informações úteis — os cards da aba

A aba de cards: horário das aulas, calendário de avaliação, calendário
escolar, critérios de avaliação, proposta pedagógica, dependências, eletivas,
tutoria.

**O conteúdo é texto, dentro do documento** — não um link para um arquivo
fora. O colégio escreve a informação no Portal e o app mostra na tela: a
informação chega sem depender de o arquivo continuar no ar, sem tirar a
família do aplicativo e sem exigir leitor de PDF no celular.

```
informacoes/{id} = {
  tipo: "horario-de-aulas" | "calendario-de-avaliacao" | "calendario-escolar"
      | "criterios-de-avaliacao" | "proposta-pedagogica" | "dependencias"
      | "eletivas" | "tutoria" | "outros",
  titulo: string,
  descricao: string | null,      // uma linha, sob o título no card
  conteudo: string,              // o texto da tela; pode ter várias linhas
  url: string | null,            // link complementar, opcional; http/https
  destino: { ... },              // o mesmo do aviso
  chave: string,                 // derivada do destino
  ordem: number,                 // menor aparece primeiro
  ativo: boolean,
  publicadoPorNome: string,
  publicadoEm: string
}
```

**O alcance é o mesmo dos avisos** — `destino` + `chave`, e a mesma
`chavesDeAlcance`. A consulta é a mesma, só muda a coleção:

```kotlin
val chaves = usuario.get("chavesDeAlcance") as List<String>

db.collection("informacoes")
  .whereEqualTo("ativo", true)
  .whereIn("chave", chaves.take(30))
```

O colégio publica cada tipo com um alcance: horário por turma, calendário de
avaliação e critérios por segmento, calendário escolar e proposta pedagógica
para todos, tutoria por aluno. Isso é **o que a secretaria costuma fazer**,
não uma garantia do modelo — o app deve tratar qualquer tipo com qualquer
alcance, porque o formulário permite.

**Para o app:**

- **A lista mostra `titulo` + `descricao`; o card aberto mostra `conteudo`.**
  Não é preciso buscar nada a mais: o texto já vem no mesmo documento.
- **Respeite as quebras de linha de `conteudo`.** A secretaria digita em
  linhas, e um horário de aulas colapsado num parágrafo só fica ilegível. No
  Portal é `whitespace-pre-wrap`; no Android, nada de `singleLine`.
- **Ordene por `ordem`, e por `titulo` no empate.** O Firestore não promete
  ordem estável, e sem o desempate os cards trocariam de lugar entre uma
  abertura e outra.
- **`url` é opcional e complementar.** Quando vier preenchido, ofereça um
  botão "abrir o material completo" no navegador — nunca como o único
  caminho, porque o texto é o conteúdo e o link pode não existir.
- **`tipo` escolhe o ícone.** Trate um tipo desconhecido com um ícone
  genérico em vez de esconder o card — a lista pode crescer.

Verificado com o SDK cliente, entrando como responsável de teste: lê o card
para todos e o da turma do filho, com o texto completo; não lê a tutoria de
outro aluno nem o card fora do ar.

---

## 8. Financeiro — pronto, sem pendência

```
cobrancas/{id} = {
  matricula: string,
  vencimento: "2026-03-05",
  tipo: string | null,           // descrição do pagamento; ver abaixo
  parcela: number | null,
  totalDeParcelas: number | null,
  valor: number | null,          // em reais, não centavos
  valorPago: number | null,
  dataPagamento: string | null,
  formaDePagamento: string | null,
  confirmado: boolean | null,    // ausente conta como confirmado
  banco: string | null,          // legado do Access
  recibo: string | null,
  observacoes: string | null
}

contratos/{id} = {
  matricula, data, tipo, valor, parcelas, plano, descricao
}
```

`tipo` do contrato: `anuidade` · `matricula` · `taxa-material` ·
`dependencia` · `reclassificacao` · `outros`.

**A situação da parcela não está gravada** — e isso é de propósito:

| Situação        | Quando                                          |
| --------------- | ----------------------------------------------- |
| **Paga**        | existe `dataPagamento` e `confirmado !== false` |
| **A confirmar** | existe `dataPagamento` e `confirmado === false` |
| **Vencida**     | sem pagamento e `vencimento` já passou          |
| **Em aberto**   | sem pagamento e `vencimento` ainda não chegou   |

"Vencida" é uma conclusão sobre hoje. Uma parcela gravada como "em aberto"
em abril continuaria assim em dezembro. **O app conclui na leitura**, com a
mesma regra.

Duas finezas: parcela paga com atraso continua **paga** — atraso quitado não
é inadimplência; e o **dia do vencimento é do pagador**, quem paga nele está
em dia.

Pagamento parcial existe: `valorPago < valor` com `dataPagamento`
preenchido. Mostre o saldo, não uma situação própria.

**Para o app, sobre os campos novos:**

- **`confirmado` ausente conta como confirmado.** É o estado das 847
  parcelas migradas, que já vieram quitadas do Access; tratar a ausência como
  pendência mostraria 800 pendências que não existem. Só o `false` explícito
  é "a confirmar".
- **"A confirmar" não é dívida.** A família pagou; o que falta é a
  conferência interna do colégio. Não some esse valor ao que está em aberto —
  seria cobrar de novo quem já pagou. Se a distinção não ajudar a família,
  mostre simplesmente "paga".
- **`tipo` e `formaDePagamento` vêm vazios nas parcelas antigas.** Mostre
  `—`, não um padrão inventado. Algumas antigas têm `banco` — é o `No Banco`
  do Access, e serve de forma de pagamento quando é o que existe.
- **`tipo`**: `taxa-de-matricula` · `taxa-de-material` · `mensalidade` ·
  `reclassificacao` · `dependencia` · `extras` · `outros`.
- **`formaDePagamento`**: `pix` · `dinheiro` · `boleto` ·
  `link-de-pagamento` · `cartao-de-debito` · `cartao-de-credito`.

> O **aluno não vê financeiro** — mensalidade é assunto de quem paga. As
> regras barram; a aba não deve aparecer para esse perfil.

### O plano acordado

```
planosDePagamento/{matricula} = {
  matricula: string,
  texto: string,                 // várias linhas; respeite as quebras
  atualizadoPorNome: string,
  atualizadoEm: string
}
```

O que foi combinado no ato da matrícula, em texto livre: "anuidade de
R$ 23.076,00 em 12x de R$ 1.923,00 vencendo todo dia 5; desconto de 10% para
pagamento até o vencimento".

**O responsável lê o do próprio filho**, e o id do documento é a matrícula —
uma leitura direta, sem consulta:

```kotlin
db.collection("planosDePagamento").document(matricula).get()
```

- **O aluno não lê**, como no resto do financeiro. A regra nega.
- **Pode não existir.** Aluno sem plano escrito ainda não tem o documento;
  trate a ausência como "nada registrado", não como erro.
- **Respeite as quebras de linha**, como nas informações úteis.

> Existe também `anotacoesFinanceiras/{matricula}`, com a anotação interna da
> equipe sobre o aluno. **O app não lê** — a regra nega para a família. É uma
> coleção à parte justamente para o responsável poder ler o plano sem ler o
> recado interno.

---

## 9. Solicitações — a aba de pedidos

A família pede à escola: declaração, saída antecipada e, em breve, 2ª
chamada. **Quem abre é o responsável** — o aluno não participa, porque é
menor de idade e o pedido é um ato do adulto por ele. As regras negam para
o perfil `aluno`.

Esta é a única parte do sistema em que o app **escreve**. E escreve por uma
rota HTTP, não pelo Firestore.

### 9.1 Ler o catálogo

```
documentosSolicitaveis/{id} = {
  nome: string,                  // "Declaração de matrícula"
  descricao: string | null,
  prazoEmDiasUteis: number | null,
  valor: number | null,          // em reais; null = gratuito
  exigeComprovante: boolean,
  ordem: number,
  ativo: boolean
}
```

```kotlin
db.collection("documentosSolicitaveis")
  .whereEqualTo("ativo", true)
  .get()
```

- **Ordene por `ordem`, e por `nome` no empate.** O Firestore não promete
  ordem estável.
- **`prazoEmDiasUteis` nulo ≠ zero.** Nulo é "prazo a combinar"; zero é
  "pronto no mesmo dia". São promessas diferentes e a tela deve dizer
  coisas diferentes.
- **Mostre prazo e valor antes de o pedido ser enviado.** É a informação que
  faz a família decidir se pede; deixá-la para depois só gera pedido que
  será cancelado.
- Leia também os `ativo: false` quando precisar — um pedido antigo aponta
  para um item que pode ter saído do catálogo, e sem lê-lo o pedido aparece
  sem nome. A regra permite.

### 9.2 Ler os pedidos da família

```
solicitacoes/{id} = {
  tipo: "documentacao" | "saida-antecipada" | "segunda-chamada",
  matricula: string,
  alunoNome: string,
  turmaCodigo: string | null,
  solicitanteUid: string,
  solicitanteNome: string,
  situacao: "aberta" | "em-andamento" | "pronta" | "entregue"
          | "autorizada" | "recusada" | "cancelada",
  historico: [
    { situacao, em, porUid, porNome, motivo: string | null }
  ],
  observacoes: string | null,
  abertaEm: string,              // ISO
  origem: "portal" | "app",

  // tipo = documentacao
  documentoId: string,
  documentoNome: string,         // nome no momento do pedido

  // tipo = saida-antecipada
  data: "2026-10-20",
  horario: "14:00",
  motivo: string,
  acompanhada: boolean,
  acompanhante: { nome: string, cpf: string } | null
}
```

```kotlin
// alunosVinculados vem de users/{uid}
db.collection("solicitacoes")
  .whereIn("matricula", alunosVinculados.take(30))
  .get()
```

**A consulta é por `matricula`, não por `solicitanteUid`.** Dois
responsáveis acompanham o mesmo aluno e os dois precisam ver o pedido que
qualquer um deles fez — senão um liga para a secretaria perguntando por um
documento que o outro já pediu.

`documentoNome` é cópia do catálogo no momento do pedido: **mostre esse
campo**, não vá buscar o nome atual em `documentosSolicitaveis`. Renomear um
item não pode reescrever o que a família pediu no mês passado.

O `motivo` do último passo do `historico` é o que explica uma recusa. Mostre
em destaque: recusa sem explicação vira telefonema para a secretaria.

### 9.3 Abrir um pedido — `POST /api/solicitacoes`

**O app não grava em `solicitacoes`.** A Security Rule nega, e é o que
impede alguém de abrir um pedido em nome de outra família trocando a
matrícula no corpo da requisição. O servidor confere o vínculo antes de
gravar.

```
POST https://ibpi-app-web.vercel.app/api/solicitacoes
Authorization: Bearer <idToken>
Content-Type: application/json
```

O `idToken` é o do próprio SDK — `FirebaseAuth.getInstance().currentUser
?.getIdToken(false)`. Ele dura uma hora; o SDK renova sozinho, então
**peça um novo a cada chamada** em vez de guardar.

Documentação:

```json
{
  "tipo": "documentacao",
  "matricula": "26029",
  "documentoId": "aBc123",
  "observacoes": "Para o estágio"
}
```

Saída antecipada:

```json
{
  "tipo": "saida-antecipada",
  "matricula": "26029",
  "data": "2026-10-20",
  "horario": "14:00",
  "motivo": "Consulta médica",
  "acompanhada": true,
  "acompanhante": { "nome": "Ana Souza", "cpf": "01719425078" },
  "observacoes": null
}
```

2ª chamada — **leva arquivo**, então vai em `multipart/form-data` no mesmo
endereço: um campo `comprovante` com o arquivo e um campo `dados` com o
mesmo JSON de sempre.

```
POST https://ibpi-app-web.vercel.app/api/solicitacoes
Authorization: Bearer <idToken>
Content-Type: multipart/form-data

dados        = {"matricula":"26029","disciplinaId":"matematica",
                "dataDaAvaliacao":"2026-10-01","observacoes":null}
comprovante  = <arquivo>
```

- `disciplinaId` vem da coleção `disciplinas`.
- `dataDaAvaliacao` é opcional — mande `null` quando a família não souber.
- `comprovante` é **obrigatório**: PDF, JPEG, PNG ou WebP, até **10 MB**.
  Outro tipo responde `422` com a mensagem pronta.

O que o app manda muda; **para onde manda, não**. Misturar as duas formas no
mesmo endereço evita descobrir um segundo endpoint.

- `horario` é `HH:MM` em 24 horas.
- `cpf` são **onze dígitos, sem ponto nem traço** — tire a máscara antes de
  enviar.
- `acompanhada: true` **exige** `acompanhante`. Dizer que alguém vem buscar
  sem dizer quem deixa a portaria sem saber a quem entregar o aluno, e o
  servidor recusa.
- `acompanhada: false` ⇒ mande `acompanhante: null`.

Respostas:

| Código | Significa                                 | O que o app faz                                        |
| ------ | ----------------------------------------- | ------------------------------------------------------ |
| `201`  | Criado. Corpo: `{ "id": "..." }`          | Volta para a lista                                     |
| `400`  | JSON malformado ou campo fora do formato  | Erro de programação; não mostre à família              |
| `401`  | Token ausente, expirado ou conta revogada | Renove o token; se persistir, mande para o login       |
| `422`  | Regra de negócio recusou                  | **Mostre `erro` à família** — é texto escrito para ela |

O `422` cobre: aluno sem vínculo, documento fora do catálogo, acompanhante
faltando. A mensagem vem pronta em português.

### 9.4 Ver o comprovante

```
GET https://ibpi-app-web.vercel.app/api/solicitacoes/{id}/comprovante
Authorization: Bearer <idToken>
```

Devolve o arquivo com o `Content-Type` original. A família vê o do próprio
filho; a escola, o que atende. `404` para quem não tem direito e para pedido
que não é de 2ª chamada.

Um comprovante traz nome, valor e muitas vezes a conta de quem pagou — por
isso não existe URL de bucket para ele.

### 9.5 Cancelar — `PATCH /api/solicitacoes/{id}`

```
PATCH https://ibpi-app-web.vercel.app/api/solicitacoes/{id}
Authorization: Bearer <idToken>

{ "situacao": "cancelada" }
```

**A família só cancela, e só enquanto `situacao == "aberta"`.** Depois que a
escola pegou o pedido, alguém já gastou trabalho e sumir com ele faria esse
trabalho desaparecer da fila sem explicação. Esconda o botão fora desse
estado; o servidor recusa com `422` de qualquer forma.

`404` para pedido inexistente **e** para pedido de outra família — a
negativa não revela que ele existe.

### 9.6 A fila, do lado da família

Quem move o pedido é a escola. O app mostra, e só oferece "cancelar".

```
documentação:     aberta → em-andamento → pronta → entregue
saída antecipada: aberta → autorizada | recusada
ambos:            aberta → cancelada  (pela família)
                  → recusada          (pela escola, sempre com motivo)
```

Sugestão de cor, a mesma do Portal: `pronta` e `autorizada` em verde,
`em-andamento` em âmbar, `recusada` em vermelho, e **`cancelada` em
neutro** — recusa é a escola dizendo não, cancelamento é a própria família
desistindo, e a mesma cor faria a segunda parecer uma reprovação.

Saída antecipada pode sair de `autorizada` e voltar para `recusada`: é
permissão para um momento que ainda não chegou, e a coordenação pode mudar
de ideia enquanto o aluno não saiu. **Não trate `autorizada` como final** —
releia antes de mostrar na portaria.

### 9.7 O que ainda não existe

- **Aviso de pedido pronto.** Não há push. Hoje a família descobre abrindo
  a aba.
- **Prazo para pedir 2ª chamada.** O sistema não recusa um pedido feito
  tarde demais depois da falta; a secretaria decide caso a caso.

---

## 10. Recuperação de senha

O Portal usa o fluxo do próprio Firebase Auth, sem nada por cima:

```kotlin
FirebaseAuth.getInstance().sendPasswordResetEmail(email)
```

O app pode chamar o mesmo método — o e-mail, o link e a tela de troca são do
Firebase. Não há endpoint nosso envolvido.

Duas coisas aprendidas na prática aqui:

- **O envio falha em silêncio com frequência** — spam, endereço errado. Por
  isso o Portal tem "Reenviar link de senha" e mostra o link para a
  secretaria mandar por outro canal. O app deve dizer "se não chegar, fale
  com a secretaria", em vez de afirmar que o e-mail foi enviado.
- **Um e-mail = uma conta = um perfil.** O Firebase identifica a conta pelo
  e-mail; cadastrar o mesmo endereço em dois perfis atualiza a mesma conta e
  o segundo perfil substitui o primeiro.

---

## 11. O que o app não deve fazer

**Nenhuma escrita.** As regras negam escrita de cliente em **todas** as
coleções (`allow write: if false`). Todo lançamento passa por Server Action
ou Route Handler do Portal, que valida escopo e grava a trilha de auditoria.

Se o app precisar escrever alguma coisa — confirmar leitura de aviso, por
exemplo —, isso precisa de um endpoint no Portal. Não adianta afrouxar a
regra: a auditoria é obrigatória em nota, frequência e financeiro.

**A exceção que confirma a forma:** as solicitações (seção 9) são a única
coisa que a família grava, e mesmo assim a regra do Firestore continua
negando. O app chama `/api/solicitacoes` com o token de ID, e é o servidor
que confere o vínculo com o aluno antes de gravar. Sem essa conferência,
bastaria trocar a matrícula no corpo da requisição para pedir o histórico
de outro aluno — e é exatamente isso que a rota existe para impedir.

---

## 12. Sobre mandar "print" de coleção

A coleção `alunos` tem nome, data de nascimento, CPF, telefone, e-mail e
filiação de **menores de idade**. O que este documento traz é a **forma**
dos campos, que é o que o app precisa — não o conteúdo.

Copiar registros reais para outra conversa é espalhar dado pessoal de menor
sem necessidade. Para testar o app, use uma conta de teste e dados de
teste.

---

## Resumo do que está livre e do que trava

| Aba               | Situação                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| Frequência        | ✅ livre                                                                      |
| Financeiro        | ✅ livre — inclui o plano acordado; ver seção 8                               |
| Boletim           | ✅ livre — regras definidas nesta página, seção 4                             |
| Ocorrências       | ✅ livre — sem campo de natureza; ver seção 2                                 |
| Avisos            | ✅ livre — a regra lê `users/{uid}.chavesDeAlcance`                           |
| Informações úteis | ✅ livre — texto no documento; ver seção 7                                    |
| Anexos            | ✅ livre — rota autenticada aceita o token; ver seção 6                       |
| Senha             | ✅ livre — SDK do Firebase, sem endpoint nosso                                |
| Solicitações      | ✅ livre — leitura no Firestore, escrita por `/api/solicitacoes`; ver seção 9 |
| 2ª chamada        | ✅ livre — `multipart/form-data`; ver seção 9.3                               |
