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
- [x] Ativar o Cloud Storage (plano Blaze)
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
- [x] Levar a criação de conta para a tela da secretaria (responsáveis; demais perfis seguem por script)
- [x] Publicar as Security Rules no projeto `colegioibpi` (`npm run deploy:rules`)
- [x] Dar à conta Google do desenvolvedor permissão no projeto Firebase, para o `firebase deploy` funcionar pelo CLI
- [ ] Criar as contas de teste dos seis perfis para os testes E2E autenticados

---

## [FASE 3] Funcionalidades Core

### 3.1 Migração do sistema Access

- [x] Escrever o leitor ODBC das tabelas do `SISIBPIDADOS2026.accdb`
- [x] Investigar a falha de leitura da tabela `Professores` — não era encoding, a tabela está vazia
- [x] Mapear e consolidar as disciplinas duplicadas (44 → 43)
- [x] Reconstruir o vínculo aluno↔turma pelo cadastro, conferido com a planilha de frequência
- [x] Consolidar responsáveis duplicados entre irmãos (146 → 118)
- [x] Escrever o script de migração de alunos (73 registros)
- [x] Escrever o script de migração de turmas, disciplinas, salas e matrículas
- [x] Escrever o script de migração de pagamentos (847 registros)
- [x] Migrar os itens contratados (`Fatos`, 274 registros) para `contratos`
- [x] Garantir idempotência: id determinístico e gravação com `merge`
- [x] Escrever o relatório de validação pós-migração (`npm run migrar:validar`)
- [x] Documentar o mapeamento Access → Firestore em `docs/migracao.md`
- [x] Executar a carga no projeto `colegioibpi` e validar
- [ ] Definir com a coordenação a conversão do histórico bimestral para trimestral _(pendência bloqueante das notas)_
- [ ] Migrar as notas, depois de definida a conversão
- [ ] Revisar com a secretaria as 4 divergências de turma e o significado do turno "E"
- [ ] Recadastrar a oferta de cursos (as 126 linhas de `Cursos` misturam curso e período)

### 3.2 Cadastro de alunos

- [x] Modelar **todas** as coleções em Zod (`src/core/modelo/`), inclusive as ainda vazias
- [x] Documentar o modelo em `docs/modelo-dados.md`
- [x] Criar os esquemas Zod de validação do cadastro
- [x] Implementar a listagem de alunos com busca por nome, matrícula e turma
- [x] Implementar a ficha do aluno, nos blocos do cadastro de origem
- [x] Aplicar o escopo de acesso na leitura pelo servidor (Admin SDK ignora as rules)
- [x] Implementar a edição do cadastro (Server Action + auditoria)
- [x] Implementar o formulário — blocos Identificação, Matrícula, Contato, Filiação, Documentos e Observações
- [x] Resolver o vínculo de turma pelo código, recusando turma inexistente
- [x] Implementar a inativação de aluno (sem exclusão, preservando o histórico)
- [ ] Implementar o formulário — bloco Acadêmico (dependências e reclassificações)
- [ ] Implementar o vínculo de responsáveis pela tela do aluno
- [x] Implementar upload de foto do aluno, com remoção de EXIF e entrega por rota autenticada
- [x] Escrever e publicar as regras do Storage (nenhum acesso pelo cliente)
- [ ] Atualizar a coleção `matriculas` quando o aluno troca de turma pelo cadastro
- [ ] Implementar a tela de detalhe do aluno com as abas de frequência, notas e financeiro

### 3.3 Responsáveis e vínculos

- [x] Modelar a coleção `responsaveis` com relação N:N para alunos
- [x] Implementar a listagem com busca por nome e e-mail e filtro por acesso
- [x] Implementar o cadastro de responsável, recusando e-mail já usado
- [x] Implementar a vinculação e desvinculação de responsável ↔ aluno
- [x] Implementar a criação da conta de acesso a partir da ficha
- [x] Propagar o vínculo para `users/{uid}`, que é o que as rules consultam
- [x] Mostrar os responsáveis na ficha do aluno (visão inversa)
- [x] Unificar a criação de conta entre a tela e o script (`core/auth/contas.ts`)
- [ ] Permitir editar o vínculo pela ficha do aluno, não só pela do responsável
- [ ] Desativar o acesso de um responsável sem apagar o cadastro

### 3.4 Turmas, disciplinas e alocações

- [x] Modelar as coleções `turmas`, `disciplinas`, `salas` e `alocacoes`
- [x] Implementar o CRUD de turmas com segmento, ano letivo e turno
- [x] Implementar a tela da turma com os alunos matriculados
- [x] Implementar o CRUD de disciplinas, com id que impede grafia duplicada
- [x] Implementar o CRUD de professores
- [x] Implementar a alocação professor × turma × disciplina
- [x] Implementar a criação da conta de acesso do professor
- [x] Implementar a regra de escopo: professor só enxerga suas alocações
- [x] Propagar as turmas para `users/{uid}`, que é o que as rules consultam
- [ ] Implementar a matrícula de aluno em turma, com histórico por ano letivo
- [ ] Implementar o cadastro de dias e horários de aula por turma
- [ ] Mostrar os professores na tela da turma (visão inversa)

### 3.4b Avisos direcionados

- [x] Modelar a coleção `avisos` com destino por aluno, responsável, turma, segmento ou todos
- [x] Acrescentar o recurso `avisos` à matriz de permissões
- [x] Implementar a publicação, com escopo por perfil (professor só nas turmas dele)
- [x] Implementar anexo em PDF e imagem, servido por rota autenticada
- [x] Implementar a listagem da equipe e a leitura no Portal da família
- [x] Implementar despublicar sem apagar
- [x] Escrever e publicar as Security Rules de `avisos`
- [x] Reescrever a regra de leitura de `avisos` para o app MyIBPI ler direto do Firestore (`users/{uid}.chavesDeAviso`)
- [ ] Servir anexo de aviso para o app (hoje o Storage nega todo acesso de cliente)
- [ ] Disparar notificação push ao publicar _(canal do app)_

### 3.5 Frequência — registro diário (secretaria)

- [x] Modelar a coleção `frequenciaDiaria`
- [x] Implementar a tela de chamada diária por turma, otimizada para teclado
- [x] Implementar a marcação `P` / `F` / `A` por aluno
- [x] Implementar o registro de ocorrência e observação junto à marcação
- [x] Implementar a edição de um lançamento já feito, com registro em auditoria
- [x] Implementar os contadores e o percentual de presença (limite de 25% de faltas)
- [x] Implementar a consulta de frequência pelo aluno e pelo responsável
- [ ] Implementar o calendário letivo, para calcular quantas faltas ainda cabem
- [x] Implementar a exportação da frequência por turma e período

### 3.6 Frequência — diário de classe (professor)

> Desbloqueado: professores e alocações já existem (3.4).

- [x] Modelar a coleção `diarioClasse` (alocação × trimestre × aulas)
- [x] Implementar a criação da grade de aulas do trimestre, com datas
- [x] Implementar a marcação de dias sem aula (férias, recesso, ponte, feriado) fora do cálculo
- [x] Implementar a chamada por aula para a turma
- [x] Implementar o registro do conteúdo ministrado por aula
- [x] Implementar o cálculo do percentual de frequência por aluno na disciplina
- [x] Implementar o escopo: o professor só abre a alocação dele; outro diário responde 404
- [x] Implementar o destaque das aulas letivas sem conteúdo registrado
- [ ] Implementar a grade paralela de avaliações de trabalho (PL) _(entra com 3.8, onde a PL é usada)_
- [ ] Implementar o alerta de aluno se aproximando do limite de 25% de faltas

> O percentual abaixo de 75% já aparece destacado — o que falta é o alerta de
> _aproximação_, que precisa saber quantas aulas ainda restam no trimestre e
> depende do calendário letivo (3.5).

> O trimestre inicial do seletor é **sugerido pelo mês** (`core/lib/ano-letivo`),
> porque o calendário letivo ainda não está cadastrado. É só o valor inicial de
> um campo que a pessoa vê e troca.

### 3.7 Ocorrências

- [x] Modelar a coleção `ocorrencias`
- [x] Implementar o lançamento junto da chamada, com os tipos em uso na planilha
- [x] Implementar a listagem para a equipe e para o responsável
- [x] Implementar a regra de visibilidade: oculta para o perfil aluno
- [ ] Implementar o lançamento avulso, fora da chamada (ocorrência acadêmica)
- [ ] Implementar filtro por tipo e período na listagem

### 3.8 Notas e boletim

- [x] Modelar as coleções `notas` e `boletins`
- [x] Implementar as funções puras de domínio: média do trimestre `(Projeto + Tarefas + AV) ÷ 3`
- [x] Implementar a função pura de média anual (média dos três trimestres)
- [x] Implementar a função pura de situação: aprovado com média ≥ 5,0 e frequência ≥ 75%
- [x] Implementar a função pura de recuperação final: `(média anual + recuperação) ÷ 2`
- [x] Implementar a tela de lançamento de notas pelo professor, por turma e disciplina
- [x] Implementar a correção de nota pelo administrador, com auditoria
- [x] Implementar o bloco Projeto Bilíngue (IBEU): STEAM, ENGLISH, PROJECT, com nível e recuperação
- [x] Implementar o bloco Eletivas, com período e situação
- [x] Implementar o bloco Dependência/Reclassificação (`P1`, `P2`, `TOTAL`, `REC`, `MÉDIA`, `SITUAÇÃO`)
- [x] Implementar o campo de observações do boletim
- [x] Implementar a visualização do boletim pelo aluno e pelo responsável
- [x] Implementar a exportação do boletim em PDF no formato usado pelo colégio
- [x] Reproduzir o layout do `boletim_resultado.pdf` (A4 deitado, blocos e gráfico)
- [x] Ajustar o cálculo para **duas** casas decimais, como o documento do colégio
- [x] Definir a ordem pedagógica das disciplinas no boletim (`disciplinas.ordem`)
- [ ] Permitir à secretaria ordenar as disciplinas pela tela, não só pelo script
- [ ] Confirmar o valor da META (6) e se ele varia por segmento
- [x] Documentar as regras de avaliação em `docs/avaliacao.md`
- [ ] Implementar o fechamento do ano: gravar o retrato em `boletins.disciplinas[]` e travar o lançamento
- [ ] Confirmar com a coordenação a regra de arredondamento (ver `docs/avaliacao.md`, seção 3)
- [ ] Migrar as notas do Access — **bloqueado**: o sistema antigo é bimestral e o boletim é trimestral

> O PDF sai pela impressão do navegador, com `@media print`. Gerar o PDF no
> servidor exigiria manter uma segunda descrição do boletim em sincronia com
> a tela — e é assim que as duas versões acabam divergindo.

### 3.9 Financeiro

- [x] Modelar a coleção `cobrancas`
- [x] Implementar o cadastro do plano de pagamento por aluno (parcelas, valor, vencimentos)
- [x] Implementar a geração das parcelas a partir do plano
- [x] Implementar a função pura de situação da parcela: em aberto, paga, vencida
- [x] Implementar a baixa manual de pagamento (data, valor pago, banco, recibo)
- [x] Implementar o extrato financeiro por aluno
- [x] Implementar a visão somente leitura do responsável
- [x] Implementar o relatório de inadimplência por turma e período
- [x] Corrigir os valores migrados que perdiam o ponto decimal (56 parcelas)
- [x] Exportar o relatório de inadimplência em Excel/PDF
- [ ] Ligar o carnê gerado ao item contratado que o originou

> A situação da parcela **não é gravada**: ver `docs/financeiro.md`, seção 2.
> Juros e multa não são calculados — o valor pago é digitado como aconteceu.

### 3.10 Auditoria

- [x] Modelar a coleção `auditoria`
- [x] Implementar a gravação com auditoria atômica (`gravarComAuditoria`)
- [x] Registrar as alterações de cadastro, turma e disciplina
- [x] Implementar o registro automático em alterações de nota
- [ ] Implementar o registro automático em alterações de frequência
- [x] Implementar o registro automático em alterações financeiras
- [ ] Implementar a consulta de auditoria para o administrador

### 3.11 Relatórios e exportações

- [x] Implementar a exportação de listas em Excel para a secretaria
- [x] Implementar a lista de frequência por turma e período
- [x] Publicar os índices compostos do Firestore (`firestore.indexes.json`)
- [ ] Implementar o painel inicial do administrador com os indicadores do dia
- [ ] Exportar responsáveis e notas por turma
- [ ] Gerar o boletim de uma turma inteira num PDF só

> Planilha é `.xlsx` de verdade, e não CSV: o Excel destrói matrícula com
> zero à esquerda e número de recibo. PDF sai pela impressão do navegador.
> Ver `docs/exportacoes.md`.

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
