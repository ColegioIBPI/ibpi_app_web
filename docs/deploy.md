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
2. Framework detectado automaticamente: Next.js. Nenhum ajuste de build.
3. Cadastrar as variáveis acima em **Settings → Environment Variables**.
4. Cada push em `main` publica em produção.

Sem domínio próprio por enquanto: o sistema roda no domínio `.vercel.app`.
Plugar `portal.ibpi.com.br` depois não exige mudança de código.

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
