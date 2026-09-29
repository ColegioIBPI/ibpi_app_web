# Deploy e ambiente

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # e preencher com as chaves do Firebase
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

## Variáveis de ambiente

Todas são validadas na inicialização por `src/core/config/env.ts` — se faltar
alguma, o sistema falha com a lista do que está ausente em vez de quebrar
depois, numa tela qualquer.

| Variável                                   | Onde é usada       | Origem                                                  |
| ------------------------------------------ | ------------------ | ------------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Cliente            | Console Firebase → App da Web                           |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Cliente            | `colegioibpi.firebaseapp.com`                           |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Cliente            | `colegioibpi`                                           |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Cliente e servidor | `colegioibpi.firebasestorage.app`                       |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Cliente            | `438848489534`                                          |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Cliente            | Console Firebase → App da Web                           |
| `FIREBASE_SERVICE_ACCOUNT`                 | **Só servidor**    | Console Firebase → Contas de serviço → Gerar nova chave |

As variáveis `NEXT_PUBLIC_*` vão para o navegador — isso é esperado e não é
falha de segurança. Quem protege os dados são as _Security Rules_ do
Firestore, não o sigilo dessas chaves.

Já a `FIREBASE_SERVICE_ACCOUNT` **ignora as Security Rules** e tem acesso
total ao projeto. Ela só pode ser lida no servidor; `src/core/firebase/admin.ts`
começa com `import "server-only"` justamente para transformar um import
acidental no cliente em erro de build.

> Na Vercel, prefira colar a chave em **base64** — o painel não lida bem com
> as quebras de linha do JSON. O código aceita os dois formatos.

## Deploy na Vercel

1. Importar o repositório `ColegioIBPI/ibpi_app_web` na Vercel.
2. Framework detectado automaticamente: Next.js. Nenhum ajuste de build —
   o `vercel.json` do repositório já fixa a região `gru1` (São Paulo), a
   mesma do Firestore, e silencia o comentário automático da Vercel nos pull
   requests, que publicava a URL de preview no GitHub.
3. Cadastrar as variáveis acima em **Settings → Environment Variables**.
4. Fazer a lista de segurança abaixo. **Antes** do primeiro deploy público.
5. Cada push em `main` publica em produção.

Sem domínio próprio por enquanto: o sistema roda no domínio `.vercel.app`.
Plugar `portal.ibpi.com.br` depois não exige mudança de código — mas exige
repetir o passo 3 da lista de segurança, que é por domínio.

---

## Segurança de acesso

O sistema trata **dado de menor de idade**: cadastro, filiação, nota, falta,
ocorrência disciplinar e financeiro de 73 alunos. A lista abaixo é o que
separa isso de estar na internet aberta.

### 1. Preview não pode atender — duas barreiras

A Vercel publica **toda branch e todo pull request** numa URL pública. Como
existe um projeto Firebase só, uma preview serve o **dado real** numa URL que
ninguém controla e que sai em comentário de PR, log de build e histórico de
navegador.

**No código**, o `proxy.ts` responde 404 em tudo quando `VERCEL_ENV` é
`preview` — inclusive nas rotas de `/api/exportacoes`, que devolvem planilha
de aluno. Para abrir uma preview de propósito, defina `PERMITIR_PREVIEW=1`
naquele deploy.

**No painel**, ligar **Settings → Deployment Protection → Vercel
Authentication**, com escopo **Standard Protection** (todos os deploys menos
produção). Ela barra antes de a requisição chegar ao proxy e cobre também os
arquivos estáticos, que o proxy nem enxerga.

> São duas porque uma configuração de painel se perde num reimport do
> projeto, e o código sozinho não protege o que não passa por ele.

A solução de raiz é um segundo projeto Firebase (`colegioibpi-dev`), gratuito
no plano Spark, para a preview apontar para dado de mentira. Até lá, valem as
duas barreiras.

### 2. A chave de serviço

`FIREBASE_SERVICE_ACCOUNT` **ignora as Security Rules** e dá acesso total ao
projeto. Ao cadastrá-la na Vercel:

- marcar como **Sensitive** — assim ninguém a lê de volta pelo painel nem
  pela CLI, só sobrescreve;
- cadastrar **só em Production** e, se precisar, em Development. Deixá-la em
  Preview dá à URL pública do item 1 acesso irrestrito à base;
- em **base64**, que o painel não quebra linha.

Se a chave vazar, revogue em Console Firebase → Contas de serviço → a chave →
excluir, e gere outra. Trocar a variável não basta: a chave antiga continua
válida até ser revogada.

### 3. Domínios autorizados no Firebase Auth

Console Firebase → **Authentication → Settings → Authorized domains**.

Incluir **só** o domínio de produção (`<projeto>.vercel.app` e, depois,
`portal.ibpi.com.br`). **Não** incluir `*.vercel.app` nem domínio de preview:
é o que permitiria a uma URL de preview completar um login de verdade.

`localhost` já vem na lista e serve ao desenvolvimento.

### 4. O que já está no código

| Proteção                                   | Onde                            |
| ------------------------------------------ | ------------------------------- |
| Nenhuma escrita pelo cliente no Firestore  | `firestore.rules`               |
| Storage nega todo acesso do cliente        | `storage.rules`                 |
| Sessão em cookie `httpOnly` + `Secure`     | `core/auth/session.ts`          |
| Sessão de 5 dias, não 14                   | `core/auth/cookie.ts`           |
| `frame-ancestors 'none'` e `X-Frame-Options` | `next.config.ts`              |
| HSTS de um ano                             | `next.config.ts`                |
| `form-action 'self'` e `base-uri 'self'`   | `next.config.ts`                |
| `Referrer-Policy` — a matrícula não vaza na URL | `next.config.ts`           |
| `nosniff`, `Permissions-Policy`            | `next.config.ts`                |
| Sem `X-Powered-By`                         | `next.config.ts`                |
| `noindex` na meta e no `robots.txt`        | `app/layout.tsx`, `app/robots.ts` |
| Fora de escopo responde 404, nunca 403     | serviços e rotas                |

Os cabeçalhos têm teste de ponta a ponta em `e2e/acesso.spec.ts`: eles valem
para toda resposta, inclusive a das exportações.

### 5. O que ainda não está

- **Limite de tentativas de login.** Hoje só existe o do próprio Firebase
  Auth, que é por IP e generoso. Um limite por conta exigiria um contador
  compartilhado (Upstash, Vercel KV).
- **CSP para script.** O `Content-Security-Policy` atual cobre enquadramento,
  destino de formulário e `<base>` — as partes que protegem a sessão. Um
  `script-src` restrito exige `nonce` gerado no proxy e propagado, e é a
  próxima camada, não esta.
- **Projeto Firebase separado para desenvolvimento.** Ver item 1.

### 6. Contas

As contas de teste (`professor.teste@`, `responsavel.teste@`,
`financeiro.teste@`) existem no **banco de produção** e têm senha sorteada a
cada execução do script. Antes de entregar o sistema ao colégio:

```bash
npm run conta:teste -- --perfil professor --apagar
npm run conta:teste -- --perfil responsavel --apagar
npm run conta:teste -- --perfil financeiro --apagar
```

O perfil `admin` enxerga e lança em tudo. Deve ficar em **poucas contas** —
cada pessoa do colégio usa o perfil de trabalho dela, para que o acesso
normal seja o restrito.

## Verificações antes de publicar

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

> `npm run typecheck` depende dos tipos de rota que o Next gera em `.next/types`.
> Num clone novo, rode `npm run build` (ou `npm run dev`) pelo menos uma vez
> antes, senão o TypeScript não encontra `LayoutProps` e afins.

## Diagnóstico do Firebase

```bash
npm run check:firebase
```

Confere, com as credenciais do `.env.local`, se Authentication (com o provedor
e-mail/senha), Firestore e Storage estão ativos no projeto — e aponta o
caminho no console quando algum não está. Não imprime nenhuma credencial.

Serve para separar "o código está errado" de "o serviço não foi ligado", que
é a confusão mais comum no começo.

### Serviços que precisam estar ligados no console

| Serviço         | Onde                                       | Observação                                                               |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| Authentication  | Console → Authentication → Sign-in method  | Habilitar **E-mail/senha**. Não habilitar link por e-mail                |
| Cloud Firestore | Console → Firestore Database → Criar banco | Região `southamerica-east1`, **modo de produção**. A região é permanente |
| Cloud Storage   | Console → Storage → Começar                | Mesma região                                                             |

> O modo de teste do Firestore deixa a base aberta a qualquer leitura por 30
> dias. Com dado de menor de idade isso não é aceitável nem temporariamente —
> comece em modo de produção; as regras reais entram na FASE 2.

## Ambientes

Hoje existe **um único projeto Firebase** (`colegioibpi`), compartilhado entre
desenvolvimento, produção e o app Android MyIBPI.

> ⚠️ Enquanto o sistema estiver em construção, qualquer teste manipula a mesma
> base que as famílias vão usar. Criar um `colegioibpi-dev` é gratuito no plano
> Spark e elimina a classe inteira de acidentes de "apaguei a coleção errada".
> Decisão registrada como risco aceito na seção 6.5 do README.
