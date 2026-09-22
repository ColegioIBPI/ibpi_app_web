# Tasks de Desenvolvimento — Portal IBPI

Plano de execução do sistema web. Cada task cabe em uma sessão de trabalho e entrega **código + testes + documentação** — os três, senão não está concluída.

Referência de requisitos: [README.md](README.md).

---

## [FASE 1] Setup e Configuração

- [x] Criar projeto Next.js 16 com TypeScript, App Router e Tailwind CSS
- [x] Configurar ESLint, Prettier e `tsconfig` com paths absolutos
- [x] Criar a estrutura de pastas definida na seção 4.4 do README
- [x] Configurar Vitest + React Testing Library e escrever o primeiro teste de fumaça
- [x] Configurar Playwright para os testes E2E
- [x] Conectar o repositório `ColegioIBPI/ibpi_app_web` e fazer o commit inicial
- [x] Configurar o SDK cliente do Firebase (`colegioibpi`) com variáveis de ambiente
- [x] Configurar o Firebase Admin SDK no servidor, com a chave em variável de ambiente
- [x] Criar `.env.example` e documentar todas as variáveis necessárias
- [x] Preencher o `.env.local` com as chaves reais do Firebase
- [x] Criar o app Web no Firebase e habilitar Authentication (e-mail/senha)
- [x] Criar o banco Firestore em `southamerica-east1`, em modo de produção
- [x] Adicionar `npm run check:firebase` para diagnosticar a configuração
- [ ] Ativar o Cloud Storage — exige upgrade para o plano Blaze, com limite de orçamento _(só é necessário na FASE 3.2)_
- [ ] Conectar o repositório à Vercel e validar o primeiro deploy
- [ ] Configurar as variáveis de ambiente no painel da Vercel

### Design system

- [x] Configurar a paleta IBPI no tema do Tailwind (`#0098DA`, `#FEFEFE`, `#FDD900`, `#6E6E6E`, `#E7E5E6`)
- [x] Definir a escala tipográfica e o espaçamento base
- [x] Adicionar o logo e o favicon nas versões do manual da marca
- [x] Criar os componentes base: botão, campo de texto, select, cartão, tabela, modal, toast
- [x] Criar os componentes de estado: carregando, vazio, erro, sem permissão
- [x] Validar contraste AA de todos os pares texto/fundo da paleta
- [ ] Obter do colégio as versões vetoriais (SVG) do logo — os arquivos atuais são JPEG

---

## [FASE 2] Autenticação e Controle de Acesso

- [x] Modelar a coleção `users` com `role` compatível com o app MyIBPI
- [x] Implementar a matriz de permissões e escopo (`core/auth/roles.ts`)
- [x] Implementar a tela de login (e-mail e senha)
- [x] Implementar recuperação de senha por e-mail
- [x] Implementar o fluxo de primeiro acesso: link por e-mail e definição da própria senha
- [x] Implementar a sessão com cookie HttpOnly e o `proxy.ts` de proteção de rotas
- [x] Implementar o roteamento inicial por perfil (gestão × consulta)
- [x] Implementar o guarda de permissão por perfil nas rotas
- [x] Implementar o menu derivado da matriz de permissões
- [x] Implementar o seletor de aluno para responsáveis com mais de um filho
- [x] Escrever as Firestore Security Rules espelhando a matriz de acesso (seção 3.1)
- [x] Testar as Security Rules no emulador do Firebase
- [x] Implementar o logout com revogação dos tokens
- [x] Documentar o modelo de permissões em `docs/permissoes.md`
- [x] Aplicar as _custom claims_ de perfil na criação de conta (`npm run criar:usuario`)
- [ ] Levar a criação de conta para a tela da secretaria _(FASE 3.2 — o script vira Server Action)_
- [x] Publicar as Security Rules no projeto `colegioibpi` (`npm run deploy:rules`)
- [x] Dar à conta Google do desenvolvedor permissão no projeto Firebase, para o `firebase deploy` funcionar pelo CLI
- [ ] Criar as contas de teste dos seis perfis para os testes E2E autenticados

---

## [FASE 3] Funcionalidades Core

### 3.1 Migração do sistema Access

- [ ] Escrever o leitor ODBC das tabelas do `SISIBPIDADOS2026.accdb`
- [ ] Resolver o problema de encoding UTF-16 na tabela `Professores`
- [ ] Mapear e consolidar as disciplinas duplicadas (`PORTUGUES/LITERATURA` × `PORTUGUÊS/LITERATURA`)
- [ ] Separar as 126 linhas de `Cursos` em curso + período letivo
- [ ] Reconstruir o vínculo aluno↔turma a partir das planilhas de frequência (tabela `Alunos_Turma` está vazia)
- [ ] Definir com a coordenação a conversão do histórico bimestral para trimestral _(pendência bloqueante)_
- [ ] Escrever o script de migração de alunos (73 registros, ~100 campos)
- [ ] Escrever o script de migração de turmas, disciplinas, professores e salas
- [ ] Escrever o script de migração de pagamentos (847 registros)
- [ ] Escrever o script de migração de ocorrências (`Fatos`, 274 registros)
- [ ] Garantir idempotência: rodar duas vezes não pode duplicar registro
- [ ] Escrever o relatório de validação pós-migração (contagens e divergências)
- [ ] Documentar o mapeamento Access → Firestore em `docs/migracao.md`

### 3.2 Cadastro de alunos

- [ ] Modelar a coleção `alunos` no Firestore
- [ ] Criar os esquemas Zod de validação do cadastro
- [ ] Implementar a listagem de alunos com busca por nome, matrícula e turma
- [ ] Implementar o formulário de cadastro — bloco Identificação
- [ ] Implementar o formulário — bloco Documentos (CPF, identidade, certidão)
- [ ] Implementar o formulário — bloco Contato (endereço, telefones, e-mails)
- [ ] Implementar o formulário — bloco Filiação e responsáveis
- [ ] Implementar o formulário — bloco Matrícula (curso, etapa, turno, plano)
- [ ] Implementar o formulário — bloco Acadêmico (dependências e reclassificações)
- [ ] Implementar upload de foto do aluno no Firebase Storage
- [ ] Implementar a inativação de aluno (sem exclusão, preservando o histórico)
- [ ] Implementar a tela de detalhe do aluno com as abas de frequência, notas e financeiro

### 3.3 Responsáveis e vínculos

- [ ] Modelar a coleção `responsaveis` com relação N:N para alunos
- [ ] Implementar o cadastro de responsável
- [ ] Implementar a vinculação e desvinculação de responsável ↔ aluno
- [ ] Implementar a criação da conta de acesso do responsável a partir do cadastro

### 3.4 Turmas, disciplinas e alocações

- [ ] Modelar as coleções `turmas`, `disciplinas`, `salas` e `alocacoes`
- [ ] Implementar o CRUD de turmas com segmento, ano letivo e turno
- [ ] Implementar o CRUD de disciplinas
- [ ] Implementar o CRUD de professores
- [ ] Implementar a alocação professor × turma × disciplina
- [ ] Implementar a matrícula de aluno em turma, com histórico por ano letivo
- [ ] Implementar o cadastro de dias e horários de aula por turma
- [ ] Implementar a regra de escopo: professor só enxerga suas alocações

### 3.5 Frequência — registro diário (secretaria)

- [ ] Modelar a coleção `frequenciaDiaria`
- [ ] Implementar a tela de chamada diária por turma, otimizada para teclado
- [ ] Implementar a marcação `P` / `F` / `A` por aluno
- [ ] Implementar o registro de ocorrência e observação junto à marcação
- [ ] Implementar a edição de um lançamento já feito, com registro em auditoria
- [ ] Implementar os contadores por aluno: percentual de faltas, atrasos, faltas, ocorrências
- [ ] Implementar a consulta de frequência pelo aluno e pelo responsável

### 3.6 Frequência — diário de classe (professor)

- [ ] Modelar a coleção `diarioClasse` (alocação × trimestre × aulas)
- [ ] Implementar a criação da grade de aulas do trimestre, com datas
- [ ] Implementar a marcação de dias sem aula (férias, recesso, ponte, feriado) fora do cálculo
- [ ] Implementar a chamada por aula (`p` / `f`) para a turma
- [ ] Implementar o registro do conteúdo ministrado por aula
- [ ] Implementar a grade paralela de avaliações de trabalho (PL)
- [ ] Implementar o cálculo do percentual de frequência por aluno na disciplina
- [ ] Implementar o alerta de aluno se aproximando do limite de 25% de faltas

### 3.7 Ocorrências

- [ ] Modelar a coleção `ocorrencias`
- [ ] Implementar o lançamento de ocorrência disciplinar e acadêmica
- [ ] Implementar os tipos em uso: uniforme, comportamento inadequado, saída antecipada, porte indevido de celular, entrada atrasada, atestado médico, justificada, outros
- [ ] Implementar a listagem com filtro por tipo e período
- [ ] Implementar a regra de visibilidade: oculta para o perfil aluno

### 3.8 Notas e boletim

- [ ] Modelar as coleções `notas` e `boletins`
- [ ] Implementar as funções puras de domínio: média do trimestre `(Projeto + Tarefas + AV) ÷ 3`
- [ ] Implementar a função pura de média anual (média dos três trimestres)
- [ ] Implementar a função pura de situação: aprovado com média ≥ 5,0 e frequência ≥ 75%
- [ ] Implementar a função pura de recuperação final: `(média anual + recuperação) ÷ 2`
- [ ] Implementar a tela de lançamento de notas pelo professor, por turma e disciplina
- [ ] Implementar a correção de nota pelo administrador, com auditoria
- [ ] Implementar o bloco Projeto Bilíngue (IBEU): STEAM, ENGLISH, PROJECT, com nível e recuperação
- [ ] Implementar o bloco Eletivas, com período e situação
- [ ] Implementar o bloco Dependência/Reclassificação (`P1`, `P2`, `TOTAL`, `REC`, `MÉDIA`, `SITUAÇÃO`)
- [ ] Implementar o campo de observações do boletim
- [ ] Implementar a visualização do boletim pelo aluno e pelo responsável
- [ ] Implementar a exportação do boletim em PDF no formato usado pelo colégio
- [ ] Documentar as regras de avaliação em `docs/avaliacao.md`

### 3.9 Financeiro

- [ ] Modelar a coleção `cobrancas`
- [ ] Implementar o cadastro do plano de pagamento por aluno (parcelas, valor, vencimentos)
- [ ] Implementar a geração das parcelas a partir do plano
- [ ] Implementar a função pura de situação da parcela: em aberto, paga, vencida
- [ ] Implementar a baixa manual de pagamento (data, valor pago, banco, recibo)
- [ ] Implementar o extrato financeiro por aluno
- [ ] Implementar a visão somente leitura do responsável
- [ ] Implementar o relatório de inadimplência por turma e período

### 3.10 Auditoria

- [ ] Modelar a coleção `auditoria`
- [ ] Implementar o registro automático em alterações de nota
- [ ] Implementar o registro automático em alterações de frequência
- [ ] Implementar o registro automático em alterações financeiras
- [ ] Implementar a consulta de auditoria para o administrador

### 3.11 Relatórios e exportações

- [ ] Implementar a exportação de listas em Excel para a secretaria
- [ ] Implementar a lista de frequência por turma e período
- [ ] Implementar o painel inicial do administrador com os indicadores do dia

---

## [FASE 4] Design e UI

- [ ] Implementar o layout da área de gestão (menu lateral, cabeçalho, contexto de ano letivo)
- [ ] Implementar o layout da área de consulta (aluno e responsável), mobile-first
- [ ] Revisar a responsividade de todas as telas em celular e desktop
- [ ] Otimizar as telas de lançamento de nota e frequência para uso por teclado
- [ ] Implementar as transições e microinterações com Framer Motion
- [ ] Revisar acessibilidade: contraste, foco visível, navegação por teclado, rótulos
- [ ] Padronizar os estados de carregamento, vazio e erro em todas as telas

---

## [FASE 5] Testes

- [ ] Testes unitários de todas as funções de domínio (média, situação, frequência, cobrança)
- [ ] Testes unitários dos hooks de estado de tela
- [ ] Testes de integração dos formulários com validação Zod
- [ ] Testes das Firestore Security Rules no emulador, por perfil
- [ ] Teste E2E: login e roteamento por perfil
- [ ] Teste E2E: lançamento de frequência diária
- [ ] Teste E2E: lançamento de nota pelo professor
- [ ] Teste E2E: consulta de boletim pelo responsável
- [ ] Teste E2E: baixa de pagamento e visualização pelo responsável
- [ ] Teste do script de migração com a base real do Access

---

## [FASE 6] Documentação

- [ ] Manter o `README.md` atualizado conforme as decisões evoluem
- [ ] `docs/permissoes.md` — matriz de acesso e Security Rules
- [ ] `docs/modelo-dados.md` — coleções, campos e relacionamentos
- [ ] `docs/avaliacao.md` — regras de nota, média, recuperação e situação
- [ ] `docs/migracao.md` — mapeamento Access → Firestore e como rodar o script
- [ ] `docs/deploy.md` — variáveis de ambiente e processo na Vercel
- [ ] Manual de uso da secretaria (o público que mais vai usar o sistema)
- [ ] Atualizar o README do app MyIBPI com as regras de avaliação definidas aqui

---

## [FASE 7] Conformidade e Deploy

- [ ] Escrever a política de privacidade
- [ ] Implementar o termo de consentimento do responsável (LGPD, art. 14), com data e IP
- [ ] Definir e implementar a política de retenção de dados de ex-alunos
- [ ] Revisar as Security Rules antes da entrada em produção
- [ ] Configurar o domínio definitivo na Vercel
- [ ] Executar a migração final dos dados do Access
- [ ] Criar as contas de acesso e disparar os e-mails de primeiro acesso
- [ ] Treinar a secretaria e os professores
- [ ] Validação final em produção com dados reais
- [ ] Reavaliar a separação de ambientes dev/produção

---

## Ordem sugerida de ataque

As fases não são estritamente sequenciais, mas há dependências reais:

1. **FASE 1** inteira antes de qualquer outra coisa.
2. **FASE 2** antes da FASE 3 — sem perfil e escopo, toda tela precisaria ser refeita depois.
3. Dentro da FASE 3, comece por **3.1 (migração)** e **3.2/3.4 (cadastros)**: sem aluno e turma no banco, nada mais tem o que exibir.
4. **3.5/3.6 (frequência)** e **3.8 (notas)** podem andar em paralelo — dependem dos mesmos cadastros, mas não uma da outra.
5. **3.9 (financeiro)** é independente das anteriores e pode entrar a qualquer momento depois dos cadastros.
6. **FASE 7** é a única que não pode ser adiada indefinidamente: sem política de privacidade e consentimento, o sistema não deveria receber dado real de menor de idade.
