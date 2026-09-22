# Migração do sistema Access

Scripts de carga única que leem o sistema atual do colégio
(`SISIBPIDADOS2026.accdb` e `SISIBPI_2026.accdb`) e escrevem no Firestore.

Implementação na **FASE 3.1** do [TASKS.md](../../TASKS.md).

## Regras

- **Idempotente.** Rodar duas vezes não pode duplicar registro — na prática o
  script roda várias vezes até os dados saírem certos.
- **Nunca versionar os arquivos `.accdb`.** Eles contêm dado pessoal de menor
  de idade e já estão no `.gitignore`.
- Toda carga gera um **relatório de validação** com contagens de origem e
  destino, e a lista de registros recusados com o motivo.

## Armadilhas já mapeadas na base real

| Problema                    | Onde                                                                   | Tratamento                                                   |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Encoding UTF-16 inválido    | Tabela `Professores`                                                   | Ler com tratamento próprio; o driver ODBC falha              |
| Disciplinas duplicadas      | `PORTUGUES/LITERATURA` × `PORTUGUÊS/LITERATURA`                        | Tabela de consolidação manual antes da carga                 |
| Curso misturado com período | `Cursos` (126 linhas, ex.: `APOIO ESCOLAR - 1A SERIE EM - BIMESTRE 1`) | Separar em curso + período letivo                            |
| Vínculo aluno↔turma ausente | `Alunos_Turma` está vazia                                              | Reconstruir a partir das planilhas de frequência             |
| Bimestre × trimestre        | Access é bimestral, boletim é trimestral                               | ⚠️ Pendência: regra de conversão a definir com a coordenação |

## Volume esperado

73 alunos · 68 turmas · 44 disciplinas · 847 lançamentos de pagamento ·
274 ocorrências · 10 salas.
