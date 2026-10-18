# Administração de usuários

Quem tem acesso ao sistema, com que perfil e até onde enxerga —
`/gestao/usuarios`.

A tela responde três perguntas, nesta ordem de frequência:

1. **quem é essa pessoa** que está vendo o que não devia;
2. **por que fulano entra e não vê nada**;
3. **como cortar o acesso** de quem saiu hoje.

---

## 1. A conta vive em dois lugares

| Onde | O quê |
| --- | --- |
| Firebase Auth | login, senha, `disabled`, a **custom claim** com o perfil |
| `users/{uid}` | espelho de nome/e-mail/ativo + o que as regras leem |

A Security Rule **não consegue chamar o Auth**. Por isso o espelho existe —
e por isso toda gravação mexe nos dois lados. Mexer em um só é como a
pessoa entra e não lê nada, ou continua lendo o que já não deveria.

O `uid` é o id do documento, e é o mesmo do Auth.

---

## 2. Suspender corta o acesso de verdade

**Este era um buraco.** A sessão do Portal já recusava quem tem
`ativo: false`, mas o **aplicativo lê o Firestore direto**, com o próprio
token, e nunca passa por ela. Uma conta "suspensa" só no documento
continuaria funcionando no celular da pessoa.

Suspender agora faz três coisas:

```
auth.updateUser(uid, { disabled: true })   // fecha os dois caminhos
auth.revokeRefreshTokens(uid)              // derruba a sessão aberta
users/{uid}.ativo = false                  // mantém o espelho honesto
```

> Conferido contra o projeto real, em conta descartável: suspender marca
> `disabled` no Auth, zera o documento e revoga os tokens; reativar desfaz.

Trocar o perfil também revoga os tokens: a claim velha vale por até uma
hora, e sem revogar a pessoa continuaria com o acesso antigo durante esse
tempo.

**A claim é gravada antes do documento.** É ela que as regras leem — se o
documento mudasse primeiro e a claim falhasse, a tela diria "professor" e o
banco continuaria tratando a pessoa como administração, que é o sentido
errado do erro.

---

## 3. As travas

Cada uma existe porque é um jeito conhecido de perder o sistema:

| Trava | Por quê |
| --- | --- |
| Ninguém troca o **próprio** perfil | quem se rebaixa perde a tela no mesmo clique |
| Ninguém suspende o **próprio** acesso | derruba a sessão e tranca a porta de dentro |
| Não se rebaixa o **último administrador ativo** | ninguém mais promove ninguém |
| Não se suspende o **último administrador ativo** | idem |

Administrador **suspenso não conta** como saída de emergência: dois no
papel e um suspenso ainda é um só de verdade.

A tela avisa quando há **apenas uma** conta de administração ativa. É o
aviso que evita a situação em que não há mais o que fazer pelo Portal.

---

## 4. Quem administra

`usuarios` é recurso próprio, com a divisão que impede escalada:

| Perfil | Nível | O que faz |
| --- | --- | --- |
| Administração | `gerenciar` | tudo, inclusive distribuir perfil |
| Secretaria | `lancar` | suspende, reativa e gera link de senha |
| Coordenação | `ler` | enxerga quem tem acesso |
| Resto | `nenhum` | — |

**A secretaria não distribui perfil de propósito.** Com `gerenciar`, ela
poderia se promover a administração — e a matriz inteira deixaria de
significar o que diz. Mas ela precisa cortar o acesso do professor que saiu
hoje sem esperar ninguém, e isso é `lancar`.

---

## 5. Senha: link, não e-mail

O Portal não manda e-mail. O botão **gera o link** de definição de senha
para quem atende copiar — é de uso único e expira.

A conta nasce com senha aleatória que ninguém conhece: quem define é a
própria pessoa, pelo link. **Ninguém da escola chega a saber a senha de
ninguém.**

> O link dá acesso à conta. Passe pessoalmente ou por um canal que a pessoa
> já use.

---

## 6. Conta de família não nasce aqui

Só perfis de equipe: professor, secretaria, coordenação, financeiro e
administração.

Aluno e responsável nascem no **cadastro deles**, onde o vínculo com as
matrículas é feito junto. Criada solta, a conta entra e não vê nada — e é
exatamente a reclamação que esta tela existe para evitar.

Por isso a lista **marca** a conta de família sem vínculo:

> ⚠️ entra e não vê nada

Conta de equipe sem vínculo é normal: secretaria não tem filho nem turma.

---

## 7. Divergência conhecida do documento do colégio

O documento de requisitos diz *"Coordenador: acesso total, exceto aos
módulos financeiros"*. **A coordenação continua lendo** financeiro e
recibos — decisão confirmada com a direção: ela atende família e precisa
saber se há pendência antes da conversa. Lançar continua sendo do
financeiro.

---

## 8. Pendências

- **Buscar e filtrar** a lista por perfil e por situação — hoje ela vem
  inteira, ordenada por equipe e depois família.
- **Histórico por conta** na tela: a trilha existe em `auditoria`, mas não
  é mostrada aqui.
- **Vincular filhos/turmas** continua no cadastro do responsável e do
  professor; esta tela mostra o alcance, não o edita.
