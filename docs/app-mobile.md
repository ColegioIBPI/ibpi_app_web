# Contrato de dados para o app MyIBPI

O que o aplicativo Android precisa saber do Firestore para as abas
**Frequência, Boletim, Avisos e Financeiro**.

O Portal e o app falam com o **mesmo projeto Firebase** (`colegioibpi`) e as
**mesmas coleções**. Quem define a forma dos dados é o Portal — este
documento é o retrato dela, e é atualizado junto do código.

> O app lê o Firestore **direto**, com o SDK cliente. Isso significa que as
> `firestore.rules` valem para ele — não há servidor intermediário
> aplicando escopo. Ver a seção 6, que tem uma pendência bloqueante para a
> aba Avisos.

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

| Campo         | Tipo     | Observação                                |
| ------------- | -------- | ----------------------------------------- |
| `matricula`   | string   | Igual ao id do documento                  |
| `nome`        | string   | Nome completo, como a escola escreve      |
| `turmaId`     | string   | `2026-EM1A` — **o ano faz parte da chave** |
| `turmaCodigo` | string   | `EM1A`, `E.J.A. EF` — o que se mostra     |
| `segmento`    | string   | Ver seção 5                               |
| `serie`       | string   | `"1"`, `"2"` — número, não por extenso    |
| `turno`       | string   | `manha` · `tarde` · `flex`                |
| `ativo`       | boolean  | `false` é ex-aluno; some das listagens    |

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

| Valor no banco              | Rótulo                     | Natureza       |
| --------------------------- | -------------------------- | -------------- |
| `uniforme`                  | Uniforme                   | disciplinar    |
| `comportamento-inadequado`  | Comportamento inadequado   | disciplinar    |
| `saida-antecipada`          | Saída antecipada           | administrativa |
| `porte-indevido-de-celular` | Porte indevido de celular  | disciplinar    |
| `entrada-atrasada`          | Entrada atrasada           | administrativa |
| `atestado-medico`           | Atestado médico            | justificativa  |
| `falta-justificada`         | Falta justificada          | justificativa  |
| `academica`                 | Ocorrência acadêmica       | **acadêmica**  |
| `outros`                    | Outros                     | —              |

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

| Coleção          | Conta   | Papel                                             |
| ---------------- | ------- | ------------------------------------------------- |
| `frequenciaDiaria` | **dias** | Oficial: decide reprovação por falta (25%)      |
| `diarioClasse`     | **aulas** | Por disciplina; alimenta as faltas do boletim  |

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

| Item                     | Regra                                         |
| ------------------------ | --------------------------------------------- |
| Períodos                 | **3 trimestres**                              |
| Avaliações por trimestre | **Projeto**, **Tarefas**, **AV**              |
| Escala                   | 0 a 10, **duas casas decimais**               |
| Média do trimestre       | `(Projeto + Tarefas + AV) ÷ 3`                |
| Média anual              | média dos três trimestres                     |
| Aprovação                | média ≥ **5,0** **e** frequência ≥ **75%**    |
| Recuperação              | apenas **final**, no fim do ano               |
| Média final              | `(média anual + recuperação) ÷ 2`             |
| **EF, EM, EJA e Cursos Livres** | **mesma regra, sem diferença**         |

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
situacao (cobrança):  calculada, não gravada — ver seção 7
role:      aluno | responsavel | professor | secretaria | coordenacao | financeiro
```

Datas puras são **string `AAAA-MM-DD`**, nunca `Timestamp`. Ao converter
para `Date`, use **meio-dia local** — à meia-noite UTC o dia anterior
aparece no fuso de São Paulo, e isso já quebrou boletim e financeiro aqui.

---

## 6. ⚠️ Avisos — há uma pendência bloqueante

A aba Avisos **não está pronta para o app**, ao contrário do que parece.

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

**Mas a Security Rule atual só libera `chave == "todos"` para a família.**
Aviso de turma, de segmento e individual **não serão lidos** pelo app.

O motivo: a regra precisaria cruzar a chave do aviso com a turma e o
segmento da pessoa, e o Firestore não faz isso sem **desnormalizar turma e
segmento dentro de `users`**. O Portal contorna lendo pelo servidor, que
aplica o alcance — o app não tem esse servidor.

**O que falta fazer no Portal** (uma tarefa, já registrada):

1. gravar `turmaId` e `segmento` em `users/{uid}` para aluno e responsável,
   e mantê-los em dia quando o aluno troca de turma;
2. reescrever a regra de `avisos` para aceitar as chaves da pessoa.

Até isso acontecer, a aba Avisos do app mostra só o aviso geral. **Me peça
essa tarefa antes de o app entrar em teste com famílias** — senão o
comunicado de turma simplesmente não chega, sem erro nenhum na tela.

### Anexos

`anexos[].path` é caminho no **Cloud Storage**, não URL. As regras do
Storage **negam todo acesso do cliente** — foto de aluno e anexo de aviso
são servidos por rota autenticada no Portal. O app precisará de um caminho
equivalente; hoje não existe.

---

## 7. Financeiro — pronto, sem pendência

```
cobrancas/{id} = {
  matricula: string,
  vencimento: "2026-03-05",
  parcela: number | null,
  totalDeParcelas: number | null,
  valor: number | null,          // em reais, não centavos
  valorPago: number | null,
  dataPagamento: string | null,
  banco: string | null,
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

| Situação      | Quando                                          |
| ------------- | ----------------------------------------------- |
| **Paga**      | existe `dataPagamento`                          |
| **Vencida**   | sem pagamento e `vencimento` já passou          |
| **Em aberto** | sem pagamento e `vencimento` ainda não chegou   |

"Vencida" é uma conclusão sobre hoje. Uma parcela gravada como "em aberto"
em abril continuaria assim em dezembro. **O app conclui na leitura**, com a
mesma regra.

Duas finezas: parcela paga com atraso continua **paga** — atraso quitado não
é inadimplência; e o **dia do vencimento é do pagador**, quem paga nele está
em dia.

Pagamento parcial existe: `valorPago < valor` com `dataPagamento`
preenchido. Mostre o saldo, não uma quarta situação.

> O **aluno não vê financeiro** — mensalidade é assunto de quem paga. As
> regras barram; a aba não deve aparecer para esse perfil.

---

## 8. Recuperação de senha

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

## 9. O que o app não deve fazer

**Nenhuma escrita.** As regras negam escrita de cliente em **todas** as
coleções (`allow write: if false`). Todo lançamento passa por Server Action
ou Route Handler do Portal, que valida escopo e grava a trilha de auditoria.

Se o app precisar escrever alguma coisa — confirmar leitura de aviso, por
exemplo —, isso precisa de um endpoint no Portal. Não adianta afrouxar a
regra: a auditoria é obrigatória em nota, frequência e financeiro.

---

## 10. Sobre mandar "print" de coleção

A coleção `alunos` tem nome, data de nascimento, CPF, telefone, e-mail e
filiação de **menores de idade**. O que este documento traz é a **forma**
dos campos, que é o que o app precisa — não o conteúdo.

Copiar registros reais para outra conversa é espalhar dado pessoal de menor
sem necessidade. Para testar o app, use uma conta de teste e dados de
teste.

---

## Resumo do que está livre e do que trava

| Aba         | Situação                                                      |
| ----------- | ------------------------------------------------------------- |
| Frequência  | ✅ livre                                                      |
| Financeiro  | ✅ livre                                                      |
| Boletim     | ✅ livre — regras definidas nesta página, seção 4              |
| Ocorrências | ✅ livre — sem campo de natureza; ver seção 2                  |
| Avisos      | ⚠️ **só o aviso geral chega** até a regra ser reescrita        |
| Anexos      | ⚠️ sem caminho de leitura para o app                          |
| Senha       | ✅ livre — SDK do Firebase, sem endpoint nosso                 |
