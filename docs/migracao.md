# Migração do sistema Access

Como os dados do sistema atual do colégio (`SISIBPIDADOS2026.accdb`) viram
documentos no Firestore.

## Como rodar

```bash
python scripts/migrate-access/extrair.py "caminho/SISIBPIDADOS2026.accdb" "caminho/CONTROLE DE FALTAS.xlsx"
npm run migrar -- --dry-run
npm run migrar
npm run migrar:validar
```

O `--dry-run` monta tudo, imprime as contagens e as divergências, e **não
escreve nada**. Rode sempre ele antes.

Requisitos da extração: `pip install pyodbc openpyxl` e o driver ODBC do
Access (Windows).

## Por que duas etapas, em duas linguagens

O driver do Access é ODBC e só existe no Windows; as opções equivalentes no
Node exigem compilação nativa ou o provedor OLEDB, que nem sempre está
instalado. O `pyodbc` simplesmente funciona, e a extração roda uma vez.

A **transformação** continua em TypeScript, importando as mesmas funções que
a aplicação usa (`src/features/migracao/domain/`), cobertas por teste. É o
que impede a migração de interpretar os dados de um jeito e o sistema de
outro — que é como base migrada começa a divergir da aplicação.

Os scripts de carga rodam com `tsx`, que resolve os caminhos do `tsconfig`.

## Onde os dados ficam

A extração grava em `scripts/migrate-access/data/`, que está no
`.gitignore`. **São dados pessoais de menores de idade**: não versione, não
copie para fora da máquina, apague quando terminar.

## O que cada tabela virou

| Access                                  | Firestore               | Registros |
| --------------------------------------- | ----------------------- | --------- |
| `Tabela_Aluno`                          | `alunos`                | 73        |
| `Tabela_Aluno` (colunas de responsável) | `responsaveis`          | 118       |
| `Tabela_Aluno` + planilha de frequência | `turmas` · `matriculas` | 10 · 73   |
| `Disciplina`                            | `disciplinas`           | 43        |
| `Salas`                                 | `salas`                 | 10        |
| `Tabela_pagamento`                      | `cobrancas`             | 847       |
| `Fatos`                                 | `contratos`             | 274       |

**Não migrados:** `Cursos` (126 linhas que misturam curso e período; a oferta
será recadastrada no modelo novo) e as 24 tabelas vazias, entre elas
`Professores`, `Alunos_Turma`, `dados_vida_escolar`, `Dias de Aulas`,
`Movimento de Pagamento` e `log`.

## As decisões que a migração tomou

### A turma do aluno não existia

`Alunos_Turma` está vazia — o vínculo nunca foi gravado. Ele vive em dois
lugares indiretos: os campos `Curso1`/`Etapa1`/`Turno1` do cadastro, e o
`CONTROLE DE FALTAS.xlsx`, onde a secretaria escreve a turma todo dia.

A regra (`derivarTurma`) reconstrói a turma pelo cadastro, o que cobre os 73
alunos:

| Origem                                                  | Turma                      |
| ------------------------------------------------------- | -------------------------- |
| `EM` + série 1/2/3                                      | `EM1A`, `EM2A`, `EM3A`     |
| `EF` + ano 6…9                                          | `EF6A`…`EF9A`              |
| Curso com "EJA", ou série combinada (`6/7`, `89`, `23`) | `E.J.A. EF` ou `E.J.A. EM` |

A planilha entra como conferência. Onde as duas discordam, **vence a
planilha** — é o registro do dia a dia, enquanto o cadastro pode estar
desatualizado. As 4 divergências ficaram no relatório:

| Matrícula | Cadastro                                       | Planilha    |
| --------- | ---------------------------------------------- | ----------- |
| 24044     | `EM3A`                                         | `EM2A`      |
| 25009     | `EM9A` (curso e série incompatíveis na origem) | `E.J.A. EF` |
| 26008     | `EF6A`                                         | `6/7ºEF`    |
| 26024     | `EF8A`                                         | `E.J.A. EF` |

> Vale a secretaria revisar esses quatro cadastros no sistema novo.

### Irmãos duplicavam o responsável

O Access guarda o responsável em colunas do próprio aluno, sem tabela
própria. Dois irmãos geram dois registros da mesma mãe — na base real há
"Sharisy Colavitti Antunes" e "Sarisy Colavitti Antunes", mesma pessoa, com
o mesmo e-mail.

A identidade é resolvida em ordem de confiabilidade: **e-mail** (que vai
virar login, então dois cadastros com o mesmo e-mail são a mesma pessoa),
depois **CPF**, e por último **nome** sem acento. Onde há duplicata, o
registro mais completo prevalece e os campos que faltavam num são preenchidos
pelo outro.

Resultado: 146 registros brutos → **118 responsáveis**, 8 deles com mais de
um filho vinculado.

### Cobranças do mesmo dia se sobrescreviam

O id da cobrança começou como matrícula + vencimento + parcela. Não basta: na
base, taxa de matrícula e taxa de material do mesmo aluno são quitadas no
mesmo dia e ambas ficam como parcela "1/1". **37 pares** assim — a primeira
versão perdia 52 das 847 linhas silenciosamente.

O id passou a incluir um hash curto do valor e da observação. As 847 linhas
são preservadas.

### Campos preenchidos à mão

A base carrega os vícios de anos de digitação, e cada um virou uma função
testada em `src/features/migracao/domain/texto.ts`:

| Vício na base                             | Tratamento                |
| ----------------------------------------- | ------------------------- |
| `"////////////////"` para dizer "não tem" | vira `null`               |
| `"regobato@gmail.com ( Mãe"`              | extrai só o e-mail        |
| `"(61)99976-0810"`                        | vira `+5561999760810`     |
| CPF numérico, sem o zero à esquerda       | recompõe 11 dígitos       |
| `"MARIA DA SILVA"` e `"Maria da Silva"`   | normaliza a capitalização |

### Datas

Data sem hora é convertida ao **meio-dia local** (`src/core/lib/datas.ts`).
O construtor do JavaScript lê `"2026-03-27"` como meia-noite UTC, que no fuso
de São Paulo ainda é dia 26 — o que faria parcela paga no dia do vencimento
aparecer vencida.

## Idempotência

Todo documento tem id determinístico, e a gravação usa `merge`. Isso significa
que rodar a migração de novo:

- **sobrescreve** o registro em vez de criar um segundo;
- **preserva** campos que a secretaria já tiver editado no sistema e que a
  migração não conhece.

Na prática a migração roda várias vezes até os dados saírem certos, então isso
não é detalhe.

## Validação

`npm run migrar:validar` compara as contagens do relatório com o que está no
Firestore, procura documento órfão (aluno sem turma, cobrança sem aluno) e
mostra a amostragem de preenchimento. Resultado da carga de 22/09/2026:

```
  ok   alunos            73 ×    73
  ok   responsaveis     118 ×   118
  ok   turmas            10 ×    10
  ok   disciplinas       43 ×    43
  ok   salas             10 ×    10
  ok   matriculas        73 ×    73
  ok   cobrancas        847 ×   847
  ok   contratos        274 ×   274

  ok   alunos sem turma válida: 0
  ok   cobranças sem aluno correspondente: 0
```

## O que ainda não foi migrado

| Item                         | Por quê                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| **Notas e boletim**          | Depende da regra de conversão bimestre → trimestre, que a coordenação precisa definir |
| **Frequência e ocorrências** | Estão nas planilhas, não no Access; entram junto com o módulo de frequência           |
| **Professores e alocações**  | A tabela do Access está vazia; serão cadastrados no sistema novo                      |
| **Contas de acesso**         | Criadas pela secretaria a partir dos responsáveis migrados (ver `docs/permissoes.md`) |

## Pendências para a secretaria confirmar

1. As **4 divergências de turma** listadas acima.
2. O significado do **turno "E"** (3 alunos). A hipótese é EJA Flex, que
   aparece na tabela de cursos como "ENS MÉDIO - EJA FLEX".
3. Os **10 alunos com status "Cancelado"** foram migrados como inativos —
   confirmar se devem aparecer em alguma listagem.
