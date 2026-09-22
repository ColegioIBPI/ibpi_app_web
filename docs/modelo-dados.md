# Modelo de dados

Todas as coleções do Firestore, os campos de cada uma e de onde vieram.

A declaração está em [`src/core/modelo/`](../src/core/modelo), em **Zod**: os
tipos TypeScript saem por inferência do mesmo esquema que valida o
formulário e a Server Action. Uma declaração só — duas seriam a forma mais
rápida de a tela passar a aceitar o que o banco recusa.

```ts
import { alunoSchema, COLECOES, type Aluno } from "@/core/modelo";
```

## Situação das coleções

| Coleção              | Registros | Origem                             |
| -------------------- | --------- | ---------------------------------- |
| `users`              | 1         | Criada pelo sistema                |
| `alunos`             | 73        | `Tabela_Aluno`                     |
| `responsaveis`       | 118       | Colunas de responsável do aluno    |
| `turmas`             | 10        | Derivada do cadastro + planilha    |
| `matriculas`         | 73        | Derivada do cadastro               |
| `disciplinas`        | 43        | `Disciplina`                       |
| `salas`              | 10        | `Salas`                            |
| `cobrancas`          | 847       | `Tabela_pagamento`                 |
| `contratos`          | 274       | `Fatos`                            |
| `professores`        | —         | `Professores` (vazia no Access)    |
| `alocacoes`          | —         | Não existia; só no diário impresso |
| `diasDeAula`         | —         | `Dias de Aulas` (vazia)            |
| `frequenciaDiaria`   | —         | `CONTROLE DE FALTAS.xlsx`          |
| `diarioClasse`       | —         | `PAUTA DE CONTEÚDO` (PDF)          |
| `ocorrencias`        | —         | `CONTROLE DE FALTAS.xlsx`          |
| `notas` · `boletins` | —         | `MODELO DE BOLETIM.xlsx`           |
| `auditoria`          | —         | `log` do Access (vazia)            |

As coleções sem registro **já estão modeladas**, com os campos espelhando a
tabela ou planilha de origem. Firestore não tem esquema no servidor: a
coleção passa a existir na primeira gravação, e é o Zod que garante a forma.

---

## Coleções com dado migrado

### `alunos/{matricula}`

Os ~100 campos da `Tabela_Aluno` reorganizados em blocos. A matrícula é o id
do documento — é a chave do histórico escolar inteiro e não muda.

| Bloco         | Campos                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identificação | `matricula` · `nome` · `nomeParaBusca` · `dataNascimento` · `cpf` · `ativo`                                                                                                                                        |
| Matrícula     | `turmaId` · `turmaCodigo` · `segmento` · `serie` · `turno` · `dataMatricula`                                                                                                                                       |
| `contato`     | `emails[]` · `telefones[]` (E.164) · `endereco{ logradouro, complemento, bairro, cidade, uf, cep }`                                                                                                                |
| `filiacao`    | `mae` · `pai`                                                                                                                                                                                                      |
| `documentos`  | `identidade` · `orgaoEmissor` · `ufEmissor` · `dataEmissao` · `certidaoTermo` · `certidaoFolha` · `certidaoLivro` · `cartorio` · `ufCartorio` · `codigoINEP` · `nacionalidade` · `naturalidade` · `ufNaturalidade` |
| Outros        | `fotoUrl` · `observacoes` · `origem` · `migradoEm`                                                                                                                                                                 |

`nomeParaBusca` guarda o nome sem acento e em maiúsculas. O Firestore não tem
busca textual, e é esse campo que permite achar "Cauã" digitando "caua".

`ativo: false` é o ex-aluno: sai das listagens, mas o histórico permanece —
documento escolar não se apaga.

### `responsaveis/{id}`

No Access o responsável vivia em colunas do aluno, o que duplicava a mesma
pessoa entre irmãos. Aqui é entidade própria, com `alunosVinculados[]` —
relação muitos-para-muitos.

`nome` · `parentesco` · `email` · `telefone` · `cpf` · `alunosVinculados[]` ·
`uid` · `ativo`

O `uid` só é preenchido quando a secretaria cria a conta de acesso. E é o
`alunosVinculados` que define o escopo do responsável nas Security Rules.

### `turmas/{ano-codigo}`

`codigo` (`EM1A`, `E.J.A. EM`) · `anoLetivo` · `segmento` · `turno` ·
`salaId` · `ativa`

O id inclui o ano (`2026-EM1A`) porque a turma é de um ano letivo.

### `matriculas/{ano-matricula}`

Vínculo aluno × turma × ano, separado do cadastro porque o aluno muda de
turma todo ano e o histórico precisa sobreviver.

`matricula` · `nome` · `anoLetivo` · `turmaId` · `turmaCodigo` · `segmento` ·
`serie` · `turno` · `situacao` (`ativa` · `cancelada` · `transferida` ·
`concluida`)

### `disciplinas/{slug}` · `salas/{slug}`

`nome` · `sigla` · `ativa`. As disciplinas guardam ainda
`grafiasOriginais[]`, com as formas que existiam antes da consolidação
(`PORTUGUES/LITERATURA` × `PORTUGUÊS/LITERATURA`).

### `cobrancas/{id}` e `contratos/{id}`

Espelham `Tabela_pagamento` e `Fatos`. Ver [`docs/migracao.md`](migracao.md)
para a composição do id, que precisou de um distintivo.

**Cobrança** — a parcela: `matricula` · `vencimento` · `parcela` ·
`totalDeParcelas` · `valor` · `valorPago` · `dataPagamento` · `situacao` ·
`emitidaPeloBanco` · `emitidaPeloColegio` · `observacoes` · `baixadoPor`

**Contrato** — o item contratado do ano: `matricula` · `data` · `tipo`
(anuidade · matrícula · taxa-material · dependência · reclassificação) ·
`valor` · `parcelas` · `plano` · `descricao`

`descricao` mantém o texto original do Access (`12XR$1.923,00 Plano Cartão`).
Nenhuma interpretação de campo livre é confiável o bastante para apagar a
origem.

---

## Coleções modeladas e ainda vazias

### `professores/{id}`

Campos espelhando a tabela `Professores` do Access, que nunca foi preenchida:

`nome` · `codigoInterno` (`CodigoInstrutor`) · `cpf` · `identidade` ·
`email` · `telefones[]` (`tel1..3`) · `endereco` · `horario`
(`HorárioInstrutor`) · `observacoes` (`Obs`) · `uid` · `turmas[]` · `ativo`

`turmas[]` fica desnormalizado aqui **e** em `users/{uid}` porque as Security
Rules precisam dele em toda consulta do professor, e regra não consegue
cruzar coleções sem custo.

### `alocacoes/{id}`

Professor × turma × disciplina × ano letivo. Não existia no Access: o vínculo
só aparecia no cabeçalho do diário impresso ("PROFESSOR: JUAREZ / DISCIPLINA:
FÍSICA / TURMA: EM1A").

É o registro que define o **escopo de acesso do professor**.

`anoLetivo` · `professorId` · `turmaId` · `disciplinaId` · `ativa`
(+ nomes desnormalizados para exibição)

### `diasDeAula/{id}`

Espelha `Dias de Aulas` (`codigo Turma`, `dia de aula`, `HoraInicio`,
`HoraFim`), vazia:

`turmaId` · `diaDaSemana` (0 = domingo) · `horaInicio` · `horaFim` ·
`disciplinaId` · `salaId`

### `frequenciaDiaria/{id}`

Espelha a aba BASE do `CONTROLE DE FALTAS.xlsx` — DATA · TURMA · NOME ·
F/P/A · AULA · OCORRÊNCIA · OBSERVAÇÃO:

`data` · `matricula` · `turmaId` · `situacao` (`presente` · `falta` ·
`atraso`) · `aula` · `ocorrencia` · `observacao`

Os tipos de ocorrência são os que a planilha já usa: uniforme, comportamento
inadequado, saída antecipada, porte indevido de celular, entrada atrasada,
atestado médico, falta justificada, acadêmica, outros.

### `diarioClasse/{id}`

Espelha a `PAUTA DE CONTEÚDO` do professor, por alocação e trimestre:

`anoLetivo` · `trimestre` · `alocacaoId` · `professorId` · `turmaId` ·
`disciplinaId` · `aulas[]` · `avaliacoesDeTrabalho[]`

Cada **aula** tem `numero`, `data`, `conteudo`, `presencas{matrícula: bool}` e
`semAula` (`ferias` · `recesso` · `ponte` · `feriado`). Dia sem aula não entra
no cálculo de frequência — na pauta impressa aparece escrito "férias" ou
"recesso" no lugar do p/f.

### `ocorrencias/{id}`

`data` · `matricula` · `turmaId` · `tipo` · `descricao` · `registradoPor`

Oculta para o perfil aluno: a ocorrência é tratada com o responsável e a
equipe.

### `notas/{id}` e `boletins/{id}`

Espelham o `MODELO DE BOLETIM.xlsx`, com os quatro blocos que ele tem.

**Nota** — um aluno, uma disciplina, um trimestre:
`anoLetivo` · `trimestre` · `matricula` · `turmaId` · `disciplinaId` ·
`avaliacoes{ projeto, tarefas, av }` · `faltas` · `lancadoPor`

**Boletim** — consolidado do ano:

| Bloco             | Campos                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `disciplinas[]`   | por disciplina: `trimestres`, `mediasPorTrimestre`, `mediaAnual`, `recuperacao`, `mediaFinal`, `faltas`, `situacao` |
| `projetoBilingue` | `nivel` (ex.: N2) e componentes STEAM · ENGLISH · PROJECT                                                           |
| `eletivas[]`      | `nome`, `periodo` (`2026.02`), `situacao`                                                                           |
| `dependencias[]`  | cálculo próprio: `p1`, `p2`, `total`, `recuperacao`, `media`, `situacao`                                            |
| Fechamento        | `faltasPorTrimestre`, `percentualDeFrequencia`, `situacao`, `observacoes`                                           |

As regras de cálculo estão no README, seção 5.6. Elas viram funções puras em
`src/features/notas/domain/` quando a tela for construída.

> ⚠️ Nenhuma nota foi migrada: depende da conversão bimestre → trimestre.

### `auditoria/{id}`

`colecao` · `documentoId` · `acao` · `alteracoes{campo: {de, para}}` ·
`autorUid` · `autorNome` · `autorPerfil` · `em`

Guarda só os campos que mudaram, com valor antes e depois. Obrigatória em
nota, frequência e financeiro.

---

## Convenções

- **Datas sem hora** são texto `AAAA-MM-DD`, convertidas para meio-dia local
  ao virar `Date` (`src/core/lib/datas.ts`). O construtor do JavaScript lê
  `"2026-03-27"` como meia-noite UTC, que em São Paulo ainda é dia 26.
- **Telefones** em E.164 (`+5521999998888`).
- **CPF** só com dígitos, 11 posições.
- **Campo vazio é `null`**, nunca string vazia — o esquema converte.
- **Nomes desnormalizados** (`turmaCodigo`, `disciplinaNome`) acompanham os
  ids para a listagem não precisar de uma consulta por linha. Quando o nome
  muda, a atualização precisa propagar; é o preço, e vale pelo número de
  leituras que economiza.
- **`origem`** distingue `access` (migrado, não revisado por humano) de
  `portal`.

## Ao mudar o modelo

1. `src/core/modelo/*.ts` — o esquema
2. `firestore.rules` — se a coleção for nova, ela nasce **fechada** pelo
   fallback e precisa de regra explícita
3. `tests/rules/firestore.test.ts`
4. Este documento

E lembre que o app MyIBPI lê as mesmas coleções: mudança de modelo aqui
precisa ser refletida lá.
