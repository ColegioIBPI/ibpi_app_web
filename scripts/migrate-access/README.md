# Migração do sistema Access

A documentação completa — o que cada tabela virou, as decisões tomadas e as
pendências — está em **[`docs/migracao.md`](../../docs/migracao.md)**.

```bash
python scripts/migrate-access/extrair.py "caminho/SISIBPIDADOS2026.accdb" "caminho/CONTROLE DE FALTAS.xlsx"
npm run migrar -- --dry-run
npm run migrar
npm run migrar:validar
```

| Arquivo        | Papel                                                     |
| -------------- | --------------------------------------------------------- |
| `extrair.py`   | Lê o `.accdb` via ODBC e grava JSON em `data/`            |
| `carregar.mts` | Transforma e grava no Firestore, de forma idempotente     |
| `validar.mts`  | Compara o Firestore com o extraído e reporta divergências |

> **`data/` contém dados pessoais de menores de idade.** Está no `.gitignore`;
> não versione, não copie para fora da máquina, apague quando terminar.
