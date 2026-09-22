# Features

Cada módulo funcional do sistema vive em uma pasta própria aqui, com a mesma
estrutura interna:

```
features/<nome>/
  components/   UI específica da feature
  hooks/        estado de tela (client)
  schemas/      validação Zod, compartilhada entre formulário e servidor
  services/     acesso a dados (Firestore, Storage, rotas do Admin SDK)
  domain/       regra de negócio em função pura — sem React, sem Firebase
```

Regra que sustenta a organização: **o que é regra de negócio fica em
`domain/`**. Cálculo de média, situação final, percentual de frequência e
status de cobrança são funções puras, testadas isoladamente. É a parte do
sistema que mais muda e a que erra mais caro — um bug ali vira boletim errado.

Uma feature não importa de dentro de outra. O que for compartilhado sobe para
`src/core/`.

Features previstas (ver `TASKS.md`): `alunos`, `responsaveis`, `turmas`,
`frequencia`, `diario`, `ocorrencias`, `notas`, `boletim`, `financeiro`,
`auditoria`.
