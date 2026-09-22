<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Portal IBPI

Sistema de gestão escolar do Colégio IBPI. Requisitos em [README.md](README.md),
plano de execução em [TASKS.md](TASKS.md). Documentação por assunto em `docs/`.

## Antes de escrever código

- Leia a task correspondente no `TASKS.md` e a seção do `README.md` que ela cobre.
- Este projeto **compartilha o Firebase `colegioibpi` com o app Android MyIBPI**
  (`C:\pessoal\ibpi\android\ibpi_app_android`). Mudança no modelo de dados aqui
  precisa ser refletida lá. Duplicar a base transforma os dois em sistemas com
  dados divergentes.

## Arquitetura

```
src/app/         rotas (App Router)
src/features/    módulos funcionais — components, hooks, schemas, services, domain
src/core/        firebase, ui (design system), config, lib
scripts/         migração do Access
docs/            documentação por assunto
e2e/             testes Playwright
```

- **Regra de negócio fica em `features/<nome>/domain/`, como função pura** —
  sem React, sem Firebase. Cálculo de média, situação final, percentual de
  frequência e status de cobrança. É a parte que mais muda e a que erra mais
  caro: um bug ali vira boletim errado.
- Server Components por padrão; `"use client"` só onde há interação.
- Validação com Zod, um esquema só, compartilhado entre formulário e servidor.
- `src/core/firebase/admin.ts` é `server-only` e ignora as Security Rules.
  Toda operação privilegiada passa por Server Action ou Route Handler.
- Uma feature não importa de dentro de outra; o compartilhado sobe para `core/`.

## Dados sensíveis

O sistema trata dados pessoais de **menores de idade** e dados financeiros das
famílias. Nunca commite `.accdb`, `google-services.json` ou chave de conta de
serviço. Toda restrição de acesso precisa existir também nas Security Rules —
o cliente é substituível.

## Estilo

- Interface e mensagens de erro em **português do Brasil**.
- Formatação de data, moeda e nota sempre por `src/core/lib/format.ts`.
- Cores só pelos tokens do tema. O azul oficial `#0098DA` (`brand-500`) não
  passa em contraste AA para texto — use `brand-600`. Ver `docs/design-system.md`.
- Toda tela trata os quatro estados: carregando, vazio, erro e sem permissão.

## Definição de pronto

Código + testes + documentação atualizada. Faltando um dos três, a task não
está concluída.

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Commits

Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `style:`, `refactor:`,
`chore:`), em `main`, sem branch de feature.
