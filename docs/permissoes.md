# Autenticação e permissões

Como uma pessoa entra no Portal, o que ela pode ver e onde cada decisão é
tomada.

## 1. Os seis perfis

Os mesmos do app MyIBPI, gravados no campo `role` do documento `users/{uid}`
e replicados nas _custom claims_ do Firebase Auth:

`aluno` · `responsavel` · `professor` · `secretaria` · `coordenacao` · `financeiro`

A matriz de acesso completa está no [README, seção 3.1](../README.md).
A implementação é [`src/core/auth/roles.ts`](../src/core/auth/roles.ts).

### Níveis cumulativos

Cada perfil tem um **nível** por recurso, não uma lista de ações:

| Nível       | Significa                           |
| ----------- | ----------------------------------- |
| `nenhum`    | O recurso nem aparece no menu       |
| `ler`       | Consulta                            |
| `lancar`    | Consulta e registra                 |
| `gerenciar` | Consulta, registra e corrige/exclui |

Quem gerencia também lança; quem lança também lê. Guardar um nível em vez de
uma lista impede a matriz ficar incoerente — alguém com "gerenciar" mas sem
"ler".

### Escopo

Permissão diz **o quê**; escopo diz **de quem**:

| Perfil                              | Enxerga os alunos      |
| ----------------------------------- | ---------------------- |
| Secretaria, coordenação, financeiro | todos                  |
| Professor                           | das turmas que leciona |
| Responsável                         | dos filhos vinculados  |
| Aluno                               | apenas ele mesmo       |

Sem o escopo, "professor lê frequência" viraria acesso à escola inteira.

### De onde vem o escopo do professor

Das **alocações** (professor × turma × disciplina × ano letivo). A cada
mudança, o sistema recalcula as turmas distintas e grava em dois lugares:

| Onde                      | Para quê                          |
| ------------------------- | --------------------------------- |
| `professores/{id}.turmas` | O que a tela mostra               |
| `users/{uid}.turmas`      | O que as Security Rules consultam |

Atualizar só um dos dois produz o pior tipo de bug: a tela diz uma coisa e o
banco faz outra. Remover a alocação tira o acesso junto — senão o professor
continuaria enxergando a turma depois de deixar de dar aula nela.

### Escopo no diário de classe

O diário é mais estreito que a turma: o professor abre a alocação dele, não
todas as disciplinas daquela turma. A verificação compara
`alocacao.professorId` com o cadastro de professor ligado ao `uid` da sessão
(`idDoProfessor`), e vale tanto na leitura (`diario.server.ts`) quanto na
escrita (`actions/diario.ts`) — o Admin SDK ignora as Security Rules, então
cada caminho verifica por conta própria.

Diário de outro professor responde **404**, e não 403: dizer "existe, mas não
é seu" já entregaria que aquela turma tem aquela disciplina. Sem cadastro de
professor correspondente ao `uid`, o filtro usa um id sentinela que não casa
com nada — o resultado correto é "nenhuma alocação", não "todas".

### Escopo nas exportações

Uma planilha exportada é **dado pessoal saindo do sistema**: nome, data de
nascimento, CPF, telefone e filiação de menores de idade. As rotas em
`app/api/exportacoes/` exigem sessão (401), verificam a permissão do recurso
(404 para quem não tem) e aplicam o mesmo escopo de aluno da tela — o
professor leva só as turmas que leciona. Filtrar por turma na consulta **não
basta**: é o escopo que garante o recorte.

Ver [`exportacoes.md`](exportacoes.md), seção 3.

## 2. Onde cada decisão acontece

São **três camadas**, e só as duas últimas são segurança de verdade:

| Camada          | Arquivo                      | O que faz                               | Vale como segurança?                  |
| --------------- | ---------------------------- | --------------------------------------- | ------------------------------------- |
| Menu            | `src/core/auth/navegacao.ts` | Esconde o que o perfil não acessa       | ❌ Conveniência                       |
| Proxy           | `src/proxy.ts`               | Redireciona quem não tem cookie         | ❌ Primeira barreira, sem verificação |
| Rota (servidor) | `src/core/auth/guards.ts`    | Verifica assinatura, revogação e perfil | ✅                                    |
| Banco           | `firestore.rules`            | Decide o acesso ao dado                 | ✅                                    |

### Por que o proxy não basta

O `proxy.ts` roda antes da renderização, **fora do runtime Node**, e por isso
não consegue verificar a assinatura do cookie — ele só checa se o cookie
existe. Serve para não carregar uma página inteira para quem nem sessão tem.

Nenhuma decisão de segurança depende dele. A verificação real está nos
layouts, via `exigirSessao` / `exigirArea` / `exigirPermissao`.

### Por que as regras do Firestore são obrigatórias

O cliente é substituível: qualquer pessoa com o token pode falar direto com o
Firestore, sem passar pela nossa interface. Se a restrição vivesse só no
React, bastaria abrir o console do navegador para ler o boletim da escola
inteira. É por isso que a matriz é repetida em `firestore.rules` e testada
contra o emulador.

## 3. Regras do Firestore

Duas decisões estruturais:

**Nenhuma escrita pelo cliente.** Todo lançamento passa por Server Action ou
Route Handler com o Admin SDK, que valida escopo e grava a auditoria. Escrita
direta do navegador contornaria as duas coisas.

**Coleção nova nasce fechada.** A regra final (`match /{document=**}`) nega
tudo que não foi explicitamente liberado — criar uma coleção na FASE 3 e
esquecer a regra não deixa os dados abertos.

```bash
npm run test:rules
```

Sobe o emulador do Firestore e roda 19 cenários, incluindo os que mais
importam: aluno não lê a própria ocorrência disciplinar, professor não lê
aluno de outra turma, financeiro não enxerga nota, e ninguém escreve.

> O `firebase-tools` está fixado na versão 13 porque a 14+ exige Java 21, e a
> máquina de desenvolvimento tem JDK 17. Ao migrar para o Java 21, dá para
> soltar a versão.

### Publicar as regras

```bash
npx firebase deploy --only firestore:rules --project colegioibpi
```

Rodar os testes **não** coloca as regras em vigor: elas precisam ser
publicadas no projeto. Toda mudança em `firestore.rules` só vale depois disso.

Exige que a sua conta Google tenha papel de **Proprietário** (ou Firebase
Rules Admin) no projeto `colegioibpi`. Sem isso, o CLI responde 403 no
dry-run que ele faz antes de publicar.

#### Alternativa sem conta com permissão

```bash
npm run deploy:rules
```

Publica usando a **conta de serviço do Admin SDK**, falando direto com a API
de regras. Existe porque o CLI sempre roda um dry-run em
`projects/{id}:test`, que exige `firebaserules.rulesets.test` — permissão que
a conta de serviço não tem, embora tenha as que importam (criar ruleset e
atualizar release).

Útil em CI, ou em uma máquina onde ninguém fez `firebase login`. A compilação
não é pulada: regra com erro de sintaxe é recusada na criação do ruleset.

Cada publicação cria um ruleset novo e o anterior continua no projeto — dá
para voltar pelo console, em Firestore → Regras → histórico.

## 4. Sessão

```
Navegador                    Servidor                    Firebase
    │                           │                           │
    │ e-mail + senha ───────────┼──────────────────────────▶│
    │◀────────────────────── token de ID (1 hora) ──────────│
    │                           │                           │
    │ POST /api/auth/session ──▶│                           │
    │                           │ verifyIdToken ───────────▶│
    │                           │ createSessionCookie ─────▶│
    │◀── cookie HttpOnly, 5 dias┤                           │
```

- O token de ID dura uma hora e é acessível ao JavaScript da página. O
  **cookie de sessão** dura cinco dias, é `HttpOnly`, `SameSite=Lax`, e
  `Secure` em produção.
- Cinco dias, e não os 14 que o Firebase permite: o sistema trata dado de
  menor de idade e costuma ser aberto em computador compartilhado da
  secretaria.
- O logout **revoga os tokens de atualização**. Sem isso, um cookie copiado
  antes do logout continuaria valendo até expirar.
- A verificação usa `verifySessionCookie(cookie, true)` — o `true` checa
  revogação, o que faz o logout valer em outras abas e dispositivos.
- Conta com `ativo: false` perde o acesso na hora, sem esperar o cookie
  expirar.

## 5. Contas e senhas

**Não existe autocadastro.** A secretaria cria a conta e o sistema dispara o
e-mail de definição de senha do próprio Firebase. A pessoa escolhe a senha
dela; ninguém da escola chega a conhecê-la.

### Criar a conta de um responsável

Pela tela: **Gestão → Responsáveis → (abrir a ficha) → Criar acesso**.

O botão só habilita quando o responsável tem **e-mail** (é o login) e **ao
menos um aluno vinculado** — sem vínculo a pessoa entraria num portal vazio,
e as Security Rules recusariam qualquer consulta que ela tentasse. Quando
falta algo, a tela diz o quê, em vez de só desabilitar o botão.

Ao criar, o sistema dispara o e-mail de definição de senha. O Admin SDK gera
o link mas **não envia**; quem envia é o SDK cliente, pelo serviço do próprio
Firebase — enviar do servidor exigiria um serviço de e-mail que o projeto não
tem.

> ⚠️ O vínculo aluno↔responsável vive em **dois lugares**: no cadastro em
> `responsaveis` e em `users/{uid}`, que é o que as Security Rules consultam.
> Toda alteração de vínculo atualiza os dois (`sincronizarVinculosDaConta`).
> Mexer só no cadastro deixaria a família vendo a tela e recebendo "sem
> permissão" do banco.

### Criar qualquer conta por linha de comando

Para os outros perfis, e para o primeiro acesso — quando ainda não há
ninguém para usar a tela:

```bash
npm run criar:usuario -- --email alguem@ibpi.com.br --nome "Fulano de Tal" --perfil secretaria
```

Ele faz as três coisas que uma conta precisa para funcionar:

1. cria o usuário no Firebase Authentication;
2. aplica a **custom claim** `role` — sem ela a pessoa entra e não lê nada,
   porque é a claim que as Security Rules enxergam;
3. grava o documento em `users/{uid}` com nome, perfil, vínculos e `ativo`.

Por perfil, os vínculos que importam:

| Perfil                                    | Parâmetro            |
| ----------------------------------------- | -------------------- |
| `aluno`                                   | `--matricula 1001`   |
| `responsavel`                             | `--alunos 1001,1002` |
| `professor`                               | `--turmas EM1A,EF7A` |
| `secretaria`, `coordenacao`, `financeiro` | nenhum               |

Sem `--senha`, o script imprime um link para a pessoa criar a própria senha —
o mesmo mecanismo do primeiro acesso de verdade. O parâmetro `--senha` existe
para conta descartável de teste; não use em conta de pessoa real.

> Rodar o script de novo com o mesmo e-mail **atualiza** a conta em vez de
> duplicar: serve para corrigir perfil ou vínculo.

Script e tela chamam **o mesmo código** (`src/core/auth/contas.ts`): fazer
diferente seria a forma mais provável de uma conta nascer pela metade.

> O script roda com `--conditions=react-server` porque importa o Admin SDK,
> que é marcado como `server-only` — e esse pacote falha de propósito fora do
> runtime de React Server Components.

Primeiro acesso e recuperação usam **a mesma tela** (`/definir-senha`), porque
são o mesmo mecanismo: um link com código (`oobCode`) enviado por e-mail.

### Duas decisões que parecem detalhe e não são

**Login errado nunca diz o que errou.** Senha incorreta e e-mail inexistente
devolvem a mesma frase. Diferenciar transformaria o formulário num
verificador de quais famílias têm conta no colégio.

**A recuperação confirma de forma genérica** — "se esse e-mail estiver
cadastrado, você vai receber um link" — pelo mesmo motivo.

O mínimo de 8 caracteres é exigido **só na definição de senha**, nunca no
login: exigir formato ao entrar informa a quem tenta adivinhar como são as
senhas do sistema, e tranca quem tem senha antiga fora do formato.

### Redirecionamento após o login

O login aceita `?continuar=/gestao/alunos` para devolver a pessoa ao lugar que
ela tentou abrir. O valor passa por
[`destinoValido`](../src/features/auth/domain/destino.ts), que só aceita
caminho interno — sem isso, `?continuar=https://site-falso` faria da tela de
login um redirecionador para fora do sistema.

## 6. Seletor de aluno

Um responsável pode ter vários filhos. O seletor troca o contexto de todas as
telas, e a escolha fica no `localStorage`.

Fica ali porque é **preferência de interface, não permissão**: quem decide o
que o responsável pode ver é o vínculo no servidor. Um valor adulterado no
navegador não abre dado de outro aluno — a consulta é recusada pelas Security
Rules.

## 7. Ao mudar uma permissão

Quatro lugares, na ordem:

1. `README.md`, seção 3.1 — a matriz que as pessoas leem
2. `src/core/auth/roles.ts` — a matriz que o aplicativo usa
3. `firestore.rules` — a matriz que o banco obedece
4. `tests/rules/firestore.test.ts` e `src/core/auth/roles.test.ts`

Mudar só os dois primeiros cria o pior cenário: a interface oferece uma ação
que o banco recusa.
