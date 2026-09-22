# Portal IBPI — Sistema de Gestão Escolar

Sistema web do Colégio IBPI para gestão acadêmica, de frequência e financeira, com acesso para administradores, professores, alunos e responsáveis.

---

## 1. Visão Geral

O Portal IBPI centraliza em um único sistema web tudo o que hoje está espalhado entre um **banco Access** (`SISIBPI_2026.accdb`), **planilhas Excel** de frequência e boletim, e **PDFs impressos** de diário de classe.

O sistema é a **fonte de verdade** dos dados acadêmicos e financeiros do colégio. Ele cobre:

| Domínio         | O que resolve                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Cadastros       | Alunos, responsáveis, professores, turmas, disciplinas, salas                                  |
| Frequência      | Registro diário da secretaria (falta/presença/atraso) e diário de classe do professor por aula |
| Ocorrências     | Registro disciplinar e acadêmico vinculado ao aluno                                            |
| Notas e boletim | Lançamento por trimestre, cálculo de média, recuperação e situação final                       |
| Financeiro      | Controle de mensalidades, vencimentos e baixa de pagamento                                     |
| Comunicação     | Consulta autônoma pelas famílias, reduzindo demanda da secretaria                              |

### 1.1 Relação com o app MyIBPI

Existe um **aplicativo Android** (`MyIBPI`, em `C:\pessoal\ibpi\android\ibpi_app_android`) já em desenvolvimento, cujo README declara na seção 9.3 que a gestão estrutural aconteceria em "um painel web separado". **Este projeto é esse sistema**, com escopo ampliado.

A divisão acordada:

|                       | Portal Web (este projeto)                    | App MyIBPI (Android)                                 |
| --------------------- | -------------------------------------------- | ---------------------------------------------------- |
| **Papel**             | Sistema completo — toda operação nasce aqui  | Canal de consulta no celular para famílias           |
| **Perfis**            | Administrador, professor, aluno, responsável | Aluno, responsável, professor e equipe               |
| **Escrita**           | Todos os cadastros e lançamentos             | Lançamento de frequência e ocorrência pelo professor |
| **Notificações push** | Não                                          | Sim (canal do app, fase futura)                      |

> **Regra inegociável:** os dois consomem o **mesmo projeto Firebase (`colegioibpi`)**, a mesma modelagem de coleções e as mesmas regras de segurança. Qualquer mudança de modelo feita aqui precisa ser refletida no app, e vice-versa. Duplicar a base transformaria os dois em sistemas com dados divergentes.

### 1.2 Escala atual

Dados extraídos do Access em 22/09/2026 — é um colégio pequeno, e isso justifica escolhas simples de infraestrutura:

| Entidade                 | Registros                |
| ------------------------ | ------------------------ |
| Alunos                   | 73                       |
| Turmas                   | 68 (histórico; 9 ativas) |
| Disciplinas              | 44                       |
| Cursos/ofertas           | 126                      |
| Salas                    | 10                       |
| Lançamentos de pagamento | 847                      |
| Ocorrências (`Fatos`)    | 274                      |

---

## 2. Objetivos

- **Aposentar o Access e as planilhas.** Hoje a mesma informação vive em três lugares (Access, `CONTROLE DE FALTAS.xlsx`, `MODELO DE BOLETIM.xlsx`) e é reconciliada à mão.
- **Dar autonomia às famílias**, que passam a consultar notas, faltas, boletim e situação financeira sem ligar para a secretaria.
- **Permitir que o professor lance frequência, conteúdo e nota no momento em que acontecem**, substituindo a pauta impressa.
- **Calcular boletim e situação final automaticamente**, eliminando a planilha com fórmulas manuais.
- **Tornar a cobrança transparente** para o responsável, com extrato do que está pago, em aberto e vencido.
- **Registrar quem lançou o quê**, para que o colégio consiga responder a contestações de nota, falta ou cobrança.

---

## 3. Usuários e Perfis de Acesso

### 3.1 Matriz de acesso

**Seis perfis**, os mesmos do app MyIBPI. Cada célula vale dentro do escopo
definido em 3.2 — "lê" para o professor significa "lê dos alunos que ele
leciona", não da escola inteira.

| Perfil          | Cadastros              | Frequência      | Ocorrências     | Notas/Boletim    | Financeiro      |
| --------------- | ---------------------- | --------------- | --------------- | ---------------- | --------------- |
| **Secretaria**  | Lê e **gerencia**      | Lê e **lança**  | Lê e **lança**  | Lê e **corrige** | Lê              |
| **Coordenação** | Lê e **gerencia**      | Lê e **lança**  | Lê e **lança**  | Lê e **corrige** | Lê              |
| **Financeiro**  | Lê (dados de contato)  | ❌ Sem acesso   | ❌ Sem acesso   | ❌ Sem acesso    | Lê e **lança**  |
| **Professor**   | Lê (alunos das turmas) | Lê e **lança**  | Lê e **lança**  | Lê e **lança**   | ❌ Sem acesso   |
| **Aluno**       | Lê (próprio cadastro)  | Lê (própria)    | ❌ Sem acesso   | Lê (próprio)     | ❌ Sem acesso   |
| **Responsável** | Lê (dos filhos)        | Lê (dos filhos) | Lê (dos filhos) | Lê (dos filhos)  | Lê (dos filhos) |

A separação do **Financeiro** é intencional: quem cuida de mensalidade não
precisa ver nota, falta nem ocorrência disciplinar de aluno. É o mesmo
recorte que o app MyIBPI já adota, e reduz a superfície de exposição de dado
de menor de idade.

**Secretaria e coordenação têm hoje a mesma permissão.** Ficam como perfis
separados mesmo assim, porque o recorte entre elas tende a aparecer com o uso
(quem fecha boletim, quem publica comunicado), e separar depois um perfil que
nasceu unificado exige mexer em conta de usuário — separar agora não custa
nada.

### 3.2 Regras de escopo

- **Professor** enxerga exclusivamente os alunos das **turmas e disciplinas que leciona**. A restrição é validada no servidor, nunca só na interface.
- **Responsável** pode ter **vários filhos matriculados**. A interface tem um **seletor de aluno** que troca o contexto de todas as telas ao mesmo tempo.
- **Aluno** não vê ocorrências disciplinares — elas ficam restritas ao responsável e à equipe escolar. Mesma regra já adotada no app.
- **Financeiro** é invisível para o perfil aluno: a seção some do menu, não aparece vazia.
- Um aluno pode ter **mais de um responsável** (pai e mãe com acessos independentes). O vínculo é modelado como muitos-para-muitos.

### 3.3 Compatibilidade de perfis com o app MyIBPI

O portal e o app usam **exatamente os mesmos seis perfis**, gravados no campo
`role` do documento em `users`:

`aluno` · `responsavel` · `professor` · `secretaria` · `coordenacao` · `financeiro`

O valor também vai para as _custom claims_ do Firebase Auth, o que permite às
Security Rules do Firestore decidirem o acesso sem precisar ler o documento do
usuário a cada consulta.

Onde o portal fala em "área de gestão", entenda secretaria, coordenação,
financeiro e professor; "área de consulta" é aluno e responsável. É uma
divisão de navegação, não um sétimo perfil.

### 3.4 Criação de contas

**Não existe autocadastro.** A secretaria cria as contas (ou importa em lote do Access) e o sistema envia um e-mail com link para a pessoa **definir a própria senha**. Isso garante que todo acesso corresponde a uma matrícula válida e evita que a secretaria conheça senhas de famílias.

Primeiro acesso e recuperação de senha usam **o mesmo mecanismo** — um link
com código enviado por e-mail — e a mesma tela. Detalhes em
[`docs/permissoes.md`](docs/permissoes.md).

---

## 4. Plataforma e Tecnologias

### 4.1 Plataforma

- **Web**, área 100% restrita — nenhuma página pública, nenhuma indexação em buscador.
- **Responsivo**, com dois focos de uso reais:
  - **Celular** — responsáveis e alunos consultando boletim, faltas e financeiro.
  - **Desktop** — secretaria e professores em cadastros, lançamento de notas e relatórios, com tabelas densas.
- **Sem requisito offline.** O sistema exige conexão e exibe estado de erro quando não houver.

### 4.2 Stack

| Camada                           | Tecnologia                                                  |
| -------------------------------- | ----------------------------------------------------------- |
| Linguagem                        | TypeScript                                                  |
| Framework                        | Next.js 16 (App Router)                                     |
| UI                               | React + Tailwind CSS                                        |
| Animação                         | Framer Motion                                               |
| Ícones                           | Lucide React                                                |
| Formulários e validação          | React Hook Form + Zod                                       |
| Autenticação                     | Firebase Authentication (e-mail + senha)                    |
| Banco de dados                   | Cloud Firestore                                             |
| Arquivos                         | Firebase Storage (fotos de aluno, documentos, comprovantes) |
| Acesso privilegiado              | Firebase Admin SDK em Route Handlers / Server Actions       |
| Testes unitários e de integração | Vitest + React Testing Library                              |
| Testes E2E                       | Playwright (fluxos críticos)                                |
| Hospedagem                       | Vercel                                                      |

### 4.3 Estratégia de acesso ao Firebase

Duas vias, propositalmente:

- **Cliente (navegador)** — consultas de aluno e responsável, protegidas pelas _Firestore Security Rules_. A regra é a última linha de defesa: o cliente é substituível, então a restrição não pode viver só na interface.
- **Servidor (Admin SDK)** — criação de contas, importação em lote, lançamento de nota e de cobrança, fechamento de boletim. Roda em Server Actions e Route Handlers do Next.js, onde a chave de serviço nunca chega ao navegador.

> A chave do Admin SDK entra como variável de ambiente na Vercel (`FIREBASE_SERVICE_ACCOUNT`), **nunca** no repositório.

### 4.4 Organização de pastas

```
src/
  app/                      # rotas (App Router)
    (auth)/                 # login, definir senha, recuperar senha
    (portal)/               # área de aluno e responsável
    (admin)/                # área de secretaria, coordenação e professor
    api/                    # route handlers (Admin SDK)
  features/
    <feature>/
      components/           # UI da feature
      hooks/                # estado de tela
      schemas/              # validação Zod
      services/             # acesso a dados
      domain/               # regras de negócio puras (cálculo de média, situação)
  core/
    firebase/               # client e admin
    ui/                     # design system (cores IBPI, botões, tabela, campos)
    auth/                   # sessão, guarda de rota, permissões
    lib/                    # formatação de data, moeda, utilidades
  types/
scripts/
  migrate-access/           # importação do Access para o Firestore
docs/                       # documentação por módulo
```

Regra que sustenta a organização: **cálculo de média, situação e frequência ficam em `domain/`, como funções puras testáveis** — nunca dentro de componente React. É a regra do boletim que mais vai mudar, e ela precisa estar num lugar só.

---

## 5. Funcionalidades Principais

### 5.1 Autenticação e sessão

- Login por e-mail e senha.
- Primeiro acesso por link enviado no e-mail, com definição da própria senha.
- Recuperação de senha por e-mail.
- Sessão persistente, com logout explícito.
- Roteamento inicial por perfil: administrador e professor caem na área de gestão; aluno e responsável, na área de consulta.
- Seletor de aluno no topo, para responsáveis com mais de um filho.

### 5.2 Cadastro de alunos

O Access tem ~100 campos por aluno. Eles são reorganizados em blocos, mantendo tudo o que é usado hoje:

| Bloco                   | Campos                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| Identificação           | Matrícula, nome, data de nascimento, foto, nacionalidade, naturalidade (UF/município), código INEP |
| Documentos              | CPF, identidade (órgão emissor, UF, data), certidão (termo, folha, livro, cartório, UF, emissão)   |
| Contato                 | Endereço completo com CEP, até 4 telefones, e-mails do aluno                                       |
| Filiação e responsáveis | Mãe, pai, responsáveis com parentesco, CPF e e-mail                                                |
| Matrícula               | Data, curso, etapa, turno (até duas matrículas simultâneas), plano de pagamento, situação, status  |
| Acadêmico               | Dependências e reclassificações por ano/curso/série, com até 8 disciplinas                         |
| Observações             | Campo livre e histórico de ocorrências                                                             |

Funções: criar, editar, buscar (por nome, matrícula ou turma), inativar (nunca excluir — o histórico escolar precisa sobreviver), upload de foto.

### 5.3 Turmas, disciplinas e professores

- **Turmas** nomeadas como hoje: `EF6`, `EF7A`, `EF8A`, `EF9A`, `EM1A`, `EM2A`, `EM3A`, `E.J.A. EF`, `E.J.A. EM`.
- **Segmentos:** Ensino Fundamental, Ensino Médio, EJA (EF e EM), Cursos Livres / Apoio / Eletivas / Bilíngue.
- **Disciplinas** vindas do Access (44), incluindo as combinadas usadas no EJA: `HISTÓRIA/GEOGRAFIA`, `BIOLOGIA/QUÍMICA`, `FÍSICA/MATEMÁTICA`, `PORTUGUÊS/LITERATURA` e afins.
- **Alocação:** professor ↔ turma ↔ disciplina. É essa alocação que define o escopo de acesso do professor.
- **Matrícula** do aluno na turma, com histórico por ano letivo.
- **Salas** e dias/horários de aula por turma.

> **Ensino Infantil está fora do escopo** — não existe em nenhuma base atual do colégio.

### 5.4 Frequência

Os **dois controles que existem hoje** são mantidos, porque servem a propósitos diferentes:

**a) Registro diário — secretaria**
Reproduz o `CONTROLE DE FALTAS.xlsx`. Por dia e por turma, marca-se cada aluno como:

| Código | Significado |
| ------ | ----------- |
| `P`    | Presente    |
| `F`    | Falta       |
| `A`    | Atraso      |

Cada registro aceita **ocorrência** e **observação**. Tipos de ocorrência em uso: uniforme, comportamento inadequado, saída antecipada, porte indevido de celular, entrada atrasada, atestado médico, falta justificada, outros.

Contadores por aluno, como na planilha: percentual de faltas, total de atrasos, total de faltas, total de ocorrências.

**b) Diário de classe — professor**
Reproduz a `PAUTA DE CONTEÚDO` / `diciplina.pdf`. Por professor, disciplina, turma e trimestre:

- Grade de aulas com data (ex.: Aula 1 = 11/05, Aula 2 = 15/05...), marcando `p`/`f` por aluno.
- **Percentual de frequência** calculado por aluno na disciplina.
- **Descrição do conteúdo** ministrado em cada aula.
- Marcação de dias sem aula: férias, recesso, ponte, feriado — que **não entram no cálculo** de frequência.
- Grade paralela de **avaliações de trabalho (PL)** por data.

**Limite:** mais de **25% de faltas** reprova o aluno. O sistema alerta quando o aluno se aproxima do limite.

### 5.5 Ocorrências

Registro vinculado ao aluno, com data, tipo (disciplinar ou acadêmica), descrição e autor do lançamento. Migra a tabela `Fatos` do Access (274 registros). Visível para responsável e equipe; **oculto para o aluno**.

### 5.6 Notas e boletim

**Estrutura de avaliação — confirmada com a direção:**

| Item                         | Regra                                                                    |
| ---------------------------- | ------------------------------------------------------------------------ |
| Períodos                     | **3 trimestres**                                                         |
| Avaliações por trimestre     | **Projeto**, **Tarefas**, **AV**                                         |
| Média do trimestre           | `(Projeto + Tarefas + AV) ÷ 3`                                           |
| Média anual                  | média dos três trimestres                                                |
| Aprovação                    | média ≥ **5,0** **e** frequência ≥ **75%**                               |
| Recuperação                  | apenas **final** (não há recuperação trimestral), para média anual < 5,0 |
| Média final após recuperação | `(média anual + nota da recuperação) ÷ 2`                                |
| Abrangência                  | mesma regra para EF, EM, EJA e Cursos Livres                             |

**Blocos adicionais do boletim** (conforme `MODELO DE BOLETIM.xlsx`):

- **Projeto Bilíngue (IBEU)** — trilha paralela com STEAM, ENGLISH e PROJECT, nota por trimestre e recuperação, com nível registrado (ex.: N2).
- **Eletivas** — disciplina eletiva com período (ex.: `FRANCÊS 2026.02`) e situação (`CURSANDO`, `CONCLUÍDO`).
- **Dependência / Reclassificação** — modelo próprio: `P1`, `P2`, `TOTAL`, `REC`, `MÉDIA`, `SITUAÇÃO`.
- **Faltas por trimestre** e campo de **observações**.

**Funções:** lançamento pelo professor (só nas suas disciplinas), correção pelo administrador, cálculo automático de média e situação, visualização pelo aluno e responsável, e **exportação do boletim em PDF** no formato que o colégio já usa.

### 5.7 Financeiro

**Controle interno** — nenhum dinheiro passa pelo sistema, nenhum gateway integrado.

- Plano de pagamento por aluno: número de parcelas, valor e vencimentos.
- Extrato por aluno com situação de cada parcela: **em aberto**, **paga**, **vencida**.
- Baixa manual pelo administrador: data do pagamento, valor pago, banco e número do recibo.
- Campo de observações, como no Access.
- Visão do responsável: somente leitura, dos filhos vinculados.
- Relatório de inadimplência por turma e por período.

Migra a tabela `Tabela_pagamento` (847 registros), com os campos `Matricula`, `Vencimento`, `QTDE de Parcelas`, `Valor`, `Data Pagamento`, `Valor Pago`, `No Banco`, `No IBPI`, `Observações`.

> O modelo de dados é desenhado para comportar uma integração futura de boleto/PIX (Asaas, Cora, Mercado Pago) sem migração — mas **nada disso está no escopo**.

### 5.8 Relatórios e exportações

- Boletim individual em **PDF**.
- Lista de frequência por turma e período.
- Relatório de inadimplência.
- Exportação de listas em **Excel** para a secretaria.

### 5.9 Modelo de dados (Firestore)

Modelagem inicial, compartilhada com o app MyIBPI:

| Coleção            | Conteúdo                                              | Chave                  |
| ------------------ | ----------------------------------------------------- | ---------------------- |
| `users`            | Conta de acesso: `role`, `nome`, `email`, vínculos    | `uid` do Firebase Auth |
| `alunos`           | Cadastro completo do aluno                            | `matricula`            |
| `responsaveis`     | Responsável e lista de alunos vinculados (N:N)        | id gerado              |
| `professores`      | Professor e suas alocações                            | id gerado              |
| `turmas`           | Turma, segmento, ano letivo, turno, sala              | `codigoTurma`          |
| `disciplinas`      | Disciplina, sigla                                     | `codigoDisciplina`     |
| `alocacoes`        | professor × turma × disciplina × ano letivo           | id gerado              |
| `matriculas`       | aluno × turma × ano letivo × situação                 | id gerado              |
| `frequenciaDiaria` | data × turma × aluno → `P`/`F`/`A` + ocorrência       | id gerado              |
| `diarioClasse`     | alocação × trimestre → aulas, conteúdo, presenças     | id gerado              |
| `ocorrencias`      | aluno, data, tipo, descrição, autor                   | id gerado              |
| `notas`            | aluno × disciplina × trimestre → projeto, tarefas, av | id gerado              |
| `boletins`         | consolidado por aluno × ano letivo                    | id gerado              |
| `cobrancas`        | aluno, parcela, vencimento, valor, situação, baixa    | id gerado              |
| `auditoria`        | quem alterou o quê, quando, valor antes e depois      | id gerado              |

> ⚠️ A definir na FASE 3: se as subcoleções (ex.: `alunos/{id}/notas`) rendem consultas melhores que coleções raiz para os relatórios de turma. A decisão sai da primeira modelagem com dados reais migrados.

---

## 6. Requisitos de Segurança

### 6.1 Dados tratados

O sistema processa **dados pessoais de menores de idade** (identificação, documentos, foto, desempenho, ocorrências disciplinares) e **dados financeiros das famílias**. É a categoria que exige o controle de acesso mais rigoroso previsto na LGPD.

### 6.2 Controles implementados

- Autenticação obrigatória em toda rota; nenhum dado acessível sem sessão.
- **Firestore Security Rules** espelhando a matriz da seção 3.1 — a restrição vive no servidor, não na interface.
- Escopo do professor limitado às suas alocações, validado no servidor.
- Perfil e vínculos definidos no servidor (via Admin SDK e _custom claims_), nunca informados pelo cliente.
- Operações administrativas isoladas em Server Actions / Route Handlers.
- Contas criadas apenas pela secretaria; sem autocadastro.
- Chave do Admin SDK apenas em variável de ambiente na Vercel.

### 6.3 Log de auditoria

Registro de **quem alterou, o que, quando e qual era o valor anterior** em três domínios:

- **Notas** — quem lançou e quem corrigiu.
- **Frequência** — quem marcou e quem alterou uma falta.
- **Financeiro** — quem lançou a cobrança e quem deu baixa.

É o que permite ao colégio responder a uma contestação de família. O Access atual já tem uma tabela `log`, o que confirma que a necessidade é real.

### 6.4 Conformidade com a LGPD

Tratada **desde o início**, no mínimo viável:

- **Política de privacidade** acessível no sistema.
- **Termo de consentimento** do responsável para tratamento de dados do menor (LGPD, art. 14), registrado com data e IP.
- Acesso a dado pessoal restrito por perfil e vínculo.
- Definição de **retenção**: ex-alunos mantêm histórico escolar (exigência legal) mas saem das listagens operacionais.

> ⚠️ A definir: prazo de retenção de dados de ex-alunos e do histórico financeiro. Precisa de orientação do colégio/contador.

### 6.5 Riscos aceitos

> ⚠️ **Ambiente único.** Foi decidido usar um só projeto Firebase para desenvolvimento e produção. Enquanto o sistema estiver em construção, qualquer teste manipula a mesma base que as famílias usarão. Recomendo revisar antes da entrada em uso real — criar um `colegioibpi-dev` custa nada no plano gratuito e elimina a classe inteira de acidentes de "apaguei a coleção errada".

---

## 7. Design e Identidade Visual

### 7.1 Paleta oficial

Extraída do _Manual da Marca — Colégio IBPI_:

| Cor       | Hex       | RGB           | Uso no sistema                         |
| --------- | --------- | ------------- | -------------------------------------- |
| Azul IBPI | `#0098DA` | 0, 152, 218   | Primária: ações, links, estados ativos |
| Branco    | `#FEFEFE` | 254, 254, 254 | Fundo                                  |
| Amarelo   | `#FDD900` | 253, 217, 0   | Alerta, destaque, pendências           |
| Chumbo    | `#6E6E6E` | 110, 110, 110 | Texto secundário                       |
| Cinza     | `#E7E5E6` | 231, 229, 230 | Bordas, fundo de cartão, divisórias    |

Cores semânticas complementares (não estão no manual, derivadas para uso funcional): verde para aprovado/pago, vermelho para reprovado/vencido. Todos os pares texto/fundo precisam passar em **contraste AA (4.5:1)** — o azul `#0098DA` **não** atinge AA para texto pequeno sobre branco, então ele é usado em áreas de preenchimento e bordas, com texto em um azul mais escuro.

### 7.2 Logo

Três versões no manual: **padrão** (com gradiente), **chapado** e **com contorno**. Mais dois ícones isolados (padrão e chapado) para aplicações pequenas — favicon e avatar. Arquivos disponíveis em `C:\pessoal\ibpi\doc\`.

### 7.3 Referência visual

O site institucional [ibpi.com.br](https://www.ibpi.com.br/) é a referência de identidade: azul sobre branco, bastante fotografia. O portal **conversa com essa identidade, mas tem linguagem de sistema** — densidade de informação, tabela, formulário e estado, em vez de banner e hero.

### 7.4 Diretrizes de interface

- **Mobile-first** nas telas de aluno e responsável; **densidade de dados** nas telas de secretaria e professor.
- Componentes pequenos e sem regra de negócio, com estados de carregamento, vazio e erro explícitos.
- Tabelas com busca, ordenação e paginação — a secretaria trabalha com listas.
- Lançamento de frequência e nota otimizado para **repetição rápida** (teclado, sem mouse): é a tela mais usada do sistema.
- Tema claro apenas.

---

## 8. Integrações Externas

**Nenhuma integração externa no escopo.** Apenas os serviços do Firebase (Authentication, Firestore, Storage) e a Vercel como hospedagem.

Ficam explicitamente fora: gateway de pagamento, WhatsApp Business API, Google Classroom/Workspace, ERP contábil e notificações push (que pertencem ao app).

A única "integração" é de **mão única e por única vez**: o script de migração que lê o Access e escreve no Firestore.

---

## 9. Infraestrutura

### 9.1 Firebase

- **Projeto existente:** `colegioibpi` (número `438848489534`, bucket `colegioibpi.firebasestorage.app`), o mesmo do app Android.
- Serviços: Authentication (e-mail/senha), Cloud Firestore, Storage.
- **Ambiente único** para desenvolvimento e produção — ver risco em 6.5.
- Credenciais (`google-services.json`, chave do Admin SDK) ficam **fora do controle de versão**.

### 9.2 Hospedagem — Vercel

- Deploy contínuo a partir do GitHub.
- Sem domínio próprio no início: o sistema roda no domínio `.vercel.app`. Plugar um domínio do colégio depois não exige nenhuma mudança de código.
- Variáveis de ambiente configuradas no painel da Vercel, por ambiente.

> ⚠️ A definir: domínio definitivo (sugestão: `portal.ibpi.com.br`).

### 9.3 Repositório

- GitHub: **[`ColegioIBPI/ibpi_app_web`](https://github.com/ColegioIBPI/ibpi_app_web)**
- **Branch única `main`**, com commit direto. Escolha consciente para reduzir cerimônia no início; quando entrar um segundo desenvolvedor, vale migrar para `feature/*` + Pull Request (que também habilita os previews automáticos da Vercel).

Repositórios relacionados na mesma organização:

| Repositório                    | Projeto              |
| ------------------------------ | -------------------- |
| `ColegioIBPI/ibpi_app_web`     | Portal web (este)    |
| `ColegioIBPI/ibpi_app_android` | App MyIBPI (Android) |

### 9.4 Migração do sistema Access

O sistema legado é um aplicativo **Microsoft Access** com dois arquivos:

| Arquivo                  | Conteúdo                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `SISIBPIDADOS2026.accdb` | Dados acadêmicos — 34 tabelas: `Tabela_Aluno`, `Turma`, `Disciplina`, `Professores`, `Tabela_pagamento`, `Fatos`, `Cursos`, `Salas` |
| `SISIBPI_2026.accdb`     | Cadastro de clientes e serviços — 12 tabelas                                                                                        |

A migração é **completa** e acontece por script (`scripts/migrate-access/`), lendo via ODBC e escrevendo no Firestore. Deve ser **idempotente** — rodar duas vezes não pode duplicar registro — porque na prática ela roda várias vezes até os dados saírem certos.

Pontos de atenção já identificados na leitura da base:

- **Encoding:** a tabela `Professores` falha ao ser lida como UTF-16 pelo driver ODBC. Precisa de tratamento específico.
- **Duplicidade:** existem disciplinas repetidas com grafias diferentes (`PORTUGUES/LITERATURA` e `PORTUGUÊS/LITERATURA`; `MATEMATICA` e `MATEMÁTICA /FÍSICA`). Exigem consolidação manual antes da carga.
- **Tabelas vazias:** `Alunos_Turma`, `dados_vida_escolar`, `Dias de Aulas` e `Movimento de Pagamento` estão zeradas — o vínculo aluno↔turma vive em outro lugar e precisa ser reconstruído a partir das planilhas de frequência.
- **Cursos como ofertas:** as 126 linhas de `Cursos` misturam curso e período (`APOIO ESCOLAR - 1A SERIE EM - BIMESTRE 1`), o que no modelo novo se separa em curso + período letivo.
- **Bimestre × trimestre:** o Access está organizado em **bimestres**, mas o boletim atual é **trimestral**. A conversão precisa de regra definida pela coordenação.

> ⚠️ **Pendência bloqueante da migração:** como converter o histórico bimestral do Access para o modelo trimestral atual. Alternativa: migrar apenas o cadastro e começar as notas de 2026 em branco.

---

## 10. Padrões de Desenvolvimento

### 10.1 Arquitetura

- Separação clara entre **UI** (`components`), **estado de tela** (`hooks`), **acesso a dados** (`services`) e **regra de negócio** (`domain`).
- Regra de negócio — cálculo de média, situação, percentual de frequência, status de cobrança — em **funções puras**, sem React e sem Firebase, testáveis isoladamente.
- Server Components por padrão; `"use client"` apenas onde há interação.
- Validação com **Zod** compartilhada entre formulário e servidor: um esquema só, sem divergência entre o que a tela aceita e o que a API aceita.
- Sem regra de negócio dentro de componente.

### 10.2 Commits (Conventional Commits)

| Prefixo     | Uso                                    |
| ----------- | -------------------------------------- |
| `feat:`     | nova funcionalidade                    |
| `fix:`      | correção de bug                        |
| `docs:`     | alteração em documentação              |
| `test:`     | adição ou ajuste de testes             |
| `style:`    | formatação, sem mudança de lógica      |
| `refactor:` | refatoração de código                  |
| `chore:`    | tarefas gerais (configs, dependências) |

### 10.3 Branches

**Commit direto em `main`.** Sem `develop`, sem branches de feature.

### 10.4 Testes

Testes são obrigatórios em toda feature e toda mudança relevante:

- **Unitários de domínio** — cálculo de média, recuperação, situação final, percentual de frequência, status de cobrança. Prioridade máxima: é onde um erro vira boletim errado.
- **Unitários de componente e hook** — sucesso, carregando, vazio, erro, repetição.
- **Integração** — formulários com validação Zod, fluxo de lançamento de nota e de frequência.
- **E2E (Playwright)** nos fluxos críticos: login, lançamento de frequência, lançamento de nota, consulta de boletim pelo responsável.
- **Regras do Firestore** testadas com o emulador — uma regra permissiva expõe dado de menor de idade.

```bash
npm test
npm run test:e2e
```

### 10.5 Documentação

Toda mudança de comportamento, arquitetura, contrato de dados ou navegação atualiza a documentação na mesma entrega. Cada módulo tem seu `.md` em `docs/`. Documentação pendente significa task não concluída.

---

## Pendências consolidadas

| #   | Pendência                                                                  | Bloqueia                           |
| --- | -------------------------------------------------------------------------- | ---------------------------------- |
| 1   | Conversão do histórico bimestral (Access) para trimestral                  | FASE 3 — migração de notas         |
| 2   | Consolidação das disciplinas duplicadas no Access                          | FASE 3 — migração de disciplinas   |
| 3   | Reconstrução do vínculo aluno↔turma (tabela vazia no Access)               | FASE 3 — migração de matrículas    |
| 4   | Prazo de retenção de dados de ex-alunos                                    | FASE 6 — política de privacidade   |
| 5   | Domínio definitivo do sistema                                              | FASE 7 — deploy                    |
| 6   | Ativar o Cloud Storage (exige plano Blaze)                                 | FASE 3.2 — foto e documentos       |
| 7   | Separação de ambientes dev/produção                                        | Entrada em uso real                |
| 8   | Atualizar o README do app MyIBPI com as regras de avaliação definidas aqui | Alinhamento entre os dois projetos |
| 9   | Alinhar a modelagem de `users` do app MyIBPI com a adotada aqui            | Alinhamento entre os dois projetos |

---

_Documento gerado na fase de levantamento de requisitos, em 22/09/2026, a partir de entrevista com a direção e da análise do sistema Access, das planilhas de frequência e boletim, do diário de classe e do manual da marca. Mantido atualizado conforme o projeto evolui._
