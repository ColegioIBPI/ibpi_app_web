import type { Topico } from "@/features/ajuda/domain/topico";

/**
 * O conteúdo da Ajuda.
 *
 * É o manual do colégio, e **não é uma lista de botões**: é a explicação
 * de por que o sistema se comporta como se comporta. Quase toda dúvida que
 * chega por telefone nasce de uma regra que faz sentido e que ninguém
 * contou.
 *
 * Ao mudar uma regra no código, o tópico correspondente muda aqui. Os dois
 * ficam no mesmo repositório de propósito: manual que mora longe do código
 * é manual que envelhece sem ninguém perceber.
 */
export const TOPICOS: Topico[] = [
  {
    id: "quem-entra-e-o-que-ve",
    rotas: ["/gestao/responsaveis"],
    titulo: "Quem entra e o que vê",
    resumo: "Os oito perfis e o que cada um alcança.",
    perfis: "todos",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Oito perfis. Cada um abre um menu diferente, e **ninguém vê o que não é da sua função** — não é a tela que esconde, é o sistema que não entrega.",
      },
      {
        tipo: "tabela",
        linhas: [
          {
            rotulo: "Administração",
            valor: "tudo, inclusive criar usuários e distribuir perfil",
          },
          {
            rotulo: "Secretaria",
            valor:
              "cadastro, avisos, documentos, solicitações, boletins, recibos",
          },
          {
            rotulo: "Coordenação",
            valor:
              "o mesmo da secretaria, menos emitir recibo e **sem o financeiro**",
          },
          { rotulo: "Financeiro", valor: "mensalidade, carnê, baixa e recibo" },
          {
            rotulo: "Professor",
            valor: "frequência, diário e nota — **só das turmas dele**",
          },
          {
            rotulo: "Inspetor",
            valor:
              "chamada, atraso e saída antecipada — **de todas as turmas**",
          },
          {
            rotulo: "Responsável",
            valor:
              "boletim, frequência, ocorrência, carteirinha, financeiro e pedidos dos filhos",
          },
          {
            rotulo: "Aluno",
            valor:
              "o próprio boletim, frequência, ocorrências e carteirinha. Não vê financeiro",
          },
        ],
      },
      {
        tipo: "paragrafo",
        texto:
          "O professor enxerga apenas os alunos das turmas em que está **alocado**. Se ele diz que “sumiu a turma”, quase sempre é vínculo que falta.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**O inspetor é o contrário do professor**: sem alocação nenhuma, e por isso mesmo faz a chamada de qualquer turma. Ele não abre o diário de classe, que é da disciplina de um professor, e não enxerga nota nem boletim.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**A coordenação não enxerga o financeiro.** Nem mensalidade, nem boleto, nem o plano acordado. Se a coordenadora precisa saber se uma família está em dia, é com a secretaria ou o financeiro — a tela não existe para ela, e não é falha de permissão.",
      },
      {
        tipo: "aviso",
        tom: "nota",
        texto: "A família usa o **aplicativo**; a equipe usa o **Portal**.",
      },
    ],
  },

  {
    id: "a-tela-inicial",
    /*
      Sem rota de propósito. `/gestao` é prefixo de **todas** as telas, e
      declará-lo faria qualquer tela ainda sem assunto cair aqui — ajuda
      errada, que é pior que o índice. Quem está no painel e clica em
      ajuda chega ao índice, que é um bom destino para quem está ali.
    */
    titulo: "A tela inicial",
    resumo: "O painel mostra o que está esperando por você — e só isso.",
    perfis: "todos",
    onde: "Gestão",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Ao entrar, o sistema mostra **o que está parado esperando você** — pedidos da família na fila, chamada do dia não lançada, boletim por liberar, vencido em aberto, aluno em risco de reprovar por falta.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Cada cartão leva à tela onde se resolve. **Cartão que não aparece é porque está em dia** — o painel não mostra zeros, porque painel cheio de zero ensina a ignorar painel.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Vermelho é o que tem prazo e não volta atrás. O resto espera sem piorar.",
      },
    ],
  },

  {
    id: "ano-letivo",
    rotas: ["/gestao/configuracoes/abertura"],
    titulo: "O ano letivo, e como virar para o próximo",
    resumo: "O seletor do menu manda em quase tudo. Nada é apagado na virada.",
    perfis: ["secretaria", "coordenacao", "admin"],
    onde: "Menu lateral · Gestão › Configurações › Abrir o ano letivo",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "No alto do menu lateral há o **ano letivo**. Ele não é um filtro de uma tela só: é o ano em que você está trabalhando. Alunos, Turmas, boletins, notas e frequência seguem ele, e **o que você lançar entra naquele ano**.",
      },
      {
        tipo: "aviso",
        tom: "cuidado",
        texto:
          "Fora do ano corrente o seletor fica **amarelo**, avisando. É a diferença entre consultar o histórico e editá-lo sem perceber.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**Nada é apagado na virada.** 2027 é um conjunto novo de turmas, vínculos e matrículas; 2026 fica inteiro onde está. Voltar o seletor para 2026 mostra 2026 como ele era — inclusive a turma que o aluno cursava então, e não a de hoje.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Por isso um ano recém-aberto aparece **vazio**: ele ainda não tem ninguém. Isso é o esperado, e não perda de dados — a tela diz qual é o próximo passo.",
      },
      {
        tipo: "passos",
        itens: [
          "**Copiar a estrutura** — em Configurações › Abrir o ano letivo, a partir do ano selecionado no menu. Traz as turmas e os vínculos. É seguro e dá para repetir: o que já existe não é duplicado, e o ano anterior não muda.",
          "**Corrigir o quadro** — os vínculos vêm como sugestão, porque o quadro do ano seguinte quase sempre muda. Corrigir é muito menos trabalho que montar do zero.",
          "**Passar os alunos** — turma por turma, escolhendo o destino de cada uma. Dá para desmarcar quem não passa.",
          "**Trocar o seletor para o ano novo** — e trabalhar nele.",
        ],
      },
      {
        tipo: "aviso",
        tom: "cuidado",
        texto:
          "Passar os alunos **move gente**: a partir dali o aluno aparece na chamada e no diário da turma nova. O boletim, as notas e a ata do ano anterior continuam onde estão.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**Promover não é conta do sistema.** Aprovação é conclusão do boletim, mas quem passa é decisão da escola — por isso não existe um botão “passar todo mundo”.",
      },
    ],
  },

  {
    id: "comecando-o-ano",
    rotas: ["/gestao/configuracoes", "/gestao/turmas", "/gestao/disciplinas", "/gestao/professores"],
    titulo: "Começando o ano, na ordem",
    resumo: "Cursos, turmas, disciplinas, professores, vínculos e critérios.",
    perfis: ["secretaria", "coordenacao", "admin"],
    onde: "Gestão › Configurações",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "A ordem importa: turma antes do curso, ou nota antes do vínculo, trava na etapa seguinte.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Antes de começar, confira o **ano letivo no menu lateral**: a tela de Turmas mostra as turmas daquele ano, e é nele que o que você criar vai entrar.",
      },
      {
        tipo: "passos",
        itens: [
          "**Cursos** — Ensino Fundamental, Médio, EJA. Os quatro já estão gravados. Se algum sumir da lista, a tela oferece *Gravar os cursos atuais* de novo, dizendo quais faltam.",
          "**Turmas** — código, ano, turno e **curso**.",
          "**Disciplinas** — a ordem define a posição no boletim. Use de 10 em 10, para caber uma disciplina nova no meio depois.",
          "**Professores** — o cadastro e o acesso dele.",
          "**Vínculos** — **quem leciona o quê em cada turma**. É o passo mais esquecido e o que mais quebra: sem ele o professor abre o diário vazio, a pauta sai sem colunas e o boletim não tem disciplinas.",
          "**Critérios de avaliação** — o texto que explica como o aluno é avaliado.",
        ],
      },
      {
        tipo: "aviso",
        tom: "nota",
        texto:
          "O sistema trabalha com **três trimestres**. Média do trimestre = (Projeto + Tarefas + AV) ÷ 3; aprovação com média **5,0** e frequência **75%**.",
      },
    ],
  },

  {
    id: "trocar-professor",
    rotas: ["/gestao/configuracoes/vinculos"],
    titulo: "Trocar o professor de uma disciplina no meio do ano",
    resumo: "Dá, e as notas já lançadas continuam lá.",
    perfis: ["secretaria", "coordenacao", "admin"],
    onde: "Gestão › Configurações › Vínculos",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "**As notas já lançadas continuam lá** — elas são da turma e da disciplina, não de quem lançou. Vale o mesmo para a chamada e as ocorrências. O professor novo abre a tela e encontra tudo.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**A exceção é o diário de classe**, que é do professor: o novo começa um diário em branco. O do anterior aparece embaixo, fechado, como **“Diário anterior”** — dá para ler as aulas e o conteúdo, não para alterar.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Na linha da disciplina: **Trocar professor**. Escolha o novo e confirme — é um passo só, e o acesso do anterior àquela turma sai junto. Se ele dá outra disciplina na mesma turma, continua enxergando a turma por ela, e está certo.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**Desvincular é outra coisa**, e continua existindo: é para a disciplina ficar sem professor, quando ainda não há para quem passar.",
      },
    ],
  },

  {
    id: "cadastrar-aluno",
    titulo: "Cadastrar um aluno novo",
    resumo: "O número da matrícula é gerado, e nunca se repete.",
    perfis: ["secretaria", "coordenacao", "admin"],
    onde: "Gestão › Alunos › Novo aluno",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "A tela pede só o necessário para o aluno **existir**: nome, nascimento, CPF, turma e data de matrícula. Tudo opcional menos o nome — o resto você completa na ficha, com os papéis na mão. Pedir cem campos com a família esperando no balcão é como um cadastro fica pela metade.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**O número da matrícula não se digita.** Ele é gerado no formato do colégio — dois dígitos do ano e três do sequencial, como `26007` —, e sai do **ano letivo em que você está**. Trabalhando em 2027, o aluno nasce `27001`.",
      },
      {
        tipo: "aviso",
        tom: "cuidado",
        texto:
          "**Número usado nunca se repete**, nem quando o aluno sai do colégio. Reaproveitar faria o histórico de quem saiu — notas, boletim, cobranças — colar no aluno novo, e isso só apareceria no dia da segunda via.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Escolher a turma já cria o **registro de matrícula daquele ano**, que é o que mantém o boletim e a ata corretos depois da virada. Dá para cadastrar sem turma e definir depois, na ficha — o registro é criado quando a turma entra.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Aluno não se apaga. Quem sai recebe uma **situação** — concluída, transferida, cancelada, abandono — com a data do fato, em `Alunos › Situação das matrículas`. Ele sai das listas e o histórico fica.",
      },
    ],
  },

  {
    id: "situacao-da-matricula",
    rotas: ["/gestao/alunos"],
    titulo: "A situação da matrícula",
    resumo: "Ativa, concluída, transferida, cancelada e abandono.",
    perfis: ["secretaria", "coordenacao", "admin"],
    onde: "Gestão › Alunos",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "A situação decide se o aluno aparece nas listas e em qual ata ele entra.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**Toda situação que não é “ativa” pede a data do fato** — é ela que sai na ata como data de conclusão, de transferência ou de cancelamento.",
      },
      {
        tipo: "paragrafo",
        texto:
          "No fim do ano, **Situação das matrículas** muda a turma inteira de uma vez: filtre, marque e aplique. Nada vem pré-selecionado de propósito.",
      },
    ],
  },

  {
    id: "documentos-da-matricula",
    titulo: "Documentos da matrícula",
    resumo: "A conferência dos nove documentos que a família entrega.",
    perfis: ["secretaria", "coordenacao", "admin"],
    onde: "Gestão › Alunos › (ficha do aluno)",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Cada clique grava sozinho, com a data e quem conferiu — é a resposta para “eu já entreguei isso”.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**Laudo médico é o único opcional.** Os outros oito contam para o “faltam N documentos”.",
      },
    ],
  },

  {
    id: "acessos-as-plataformas",
    titulo: "Acessos às plataformas",
    resumo: "Usuário e senha do IBPI Online e do Plural, que a família lê.",
    perfis: ["secretaria", "coordenacao", "admin"],
    onde: "Gestão › Alunos › (ficha do aluno)",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Usuário e senha do IBPI Online e do Plural, que a família consulta sozinha pelo aplicativo quando esquece.",
      },
      {
        tipo: "paragrafo",
        texto:
          "A **senha do Meu IBPI não fica aqui** — ninguém a conhece, nem o colégio. Quem esqueceu usa “Esqueci minha senha”.",
      },
      {
        tipo: "aviso",
        tom: "cuidado",
        texto:
          "**Se aparecer o seu próprio usuário e senha nesses campos, não é o sistema.** É o navegador, que reconhece “usuário + senha” como tela de entrada e preenche com o que você salvou nele. Apague antes de salvar: o que fica aqui **a família lê**, no Portal e no aplicativo.",
      },
    ],
  },

  {
    id: "carteirinha",
    titulo: "Carteirinha",
    resumo: "Monta-se sozinha do cadastro, e só vale com matrícula ativa.",
    perfis: "todos",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "O aluno e o responsável abrem a carteirinha no Portal — foto, nome, turma, curso, matrícula e validade. Imprime com Ctrl+P.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Vocês não emitem nada: **ela se monta sozinha do cadastro**. O que depende de vocês é a foto, e um cadastro sem foto gera um cartão que não identifica ninguém — o próprio cartão avisa isso à família.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**A carteirinha só vale com matrícula ativa**, e vence em 31 de dezembro. Quem cancelou ou se transferiu continua enxergando o cartão, com “Sem validade” escrito por cima: a família precisa entender por que a portaria recusou, e uma tela vazia não explicaria.",
      },
    ],
  },

  {
    id: "frequencia",
    rotas: ["/gestao/frequencia", "/gestao/diario"],
    titulo: "As quatro marcações da chamada",
    resumo: "P, F, A e S — e por que atraso conta como presença.",
    perfis: ["professor", "inspetor", "secretaria", "coordenacao", "admin"],
    onde: "Gestão › Frequência",
    blocos: [
      {
        tipo: "tabela",
        linhas: [
          { rotulo: "P", valor: "presente" },
          { rotulo: "F", valor: "falta" },
          { rotulo: "A", valor: "atraso" },
          { rotulo: "S", valor: "saída antecipada" },
        ],
      },
      {
        tipo: "paragrafo",
        texto:
          "**Atraso e saída antecipada contam como presença.** O aluno esteve na aula; o registro existe porque interessa à coordenação, mas contá-lo como falta criaria uma reprovação que o colégio não aplica.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Todo aluno começa como presente — marque só as exceções, como na planilha.",
      },
    ],
  },

  {
    id: "publicacao-da-ocorrencia",
    rotas: ["/gestao/ocorrencias"],
    titulo: "A ocorrência tem autorização de publicação",
    resumo: "Duas caixas decidem quem lê cada ocorrência.",
    perfis: ["professor", "inspetor", "secretaria", "coordenacao", "admin"],
    onde: "Gestão › Ocorrências",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Ao marcar uma ocorrência aparecem duas caixas: **Responsável vê** e **Aluno vê**.",
      },
      {
        tipo: "lista",
        itens: [
          "O responsável **nasce marcado** — é o que sempre aconteceu.",
          "O aluno **nasce desmarcado**: ocorrência se trata com o adulto.",
          "Desmarcar o responsável **retém** o registro: fica só com a equipe.",
        ],
      },
      {
        tipo: "paragrafo",
        texto:
          "Dá para mudar depois, pela lista de Ocorrências. A conversa com a família acontece dias depois do registro, e o que parecia delicado deixa de ser.",
      },
      {
        tipo: "aviso",
        tom: "nota",
        texto:
          "A tela da família **não diz** que existe algo retido. Dizer “há uma ocorrência que você não pode ver” entregaria o fato sem o contexto.",
      },
    ],
  },

  {
    id: "liberacao-do-boletim",
    rotas: ["/gestao/boletins"],
    titulo: "A família só vê o boletim depois que você libera",
    resumo: "Três caixas por aluno, uma por trimestre.",
    perfis: ["secretaria", "coordenacao", "admin", "professor"],
    onde: "Gestão › Boletins",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "**Esta é a regra que mais gera dúvida.** As notas entram aos poucos ao longo do trimestre, e um boletim meio preenchido é lido como “meu filho está indo mal” por quem não sabe que faltam avaliações.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Cada aluno tem **três caixas**, uma por trimestre. Enquanto a caixa está desmarcada, a família **não recebe** aquelas notas — nem no Portal nem no aplicativo.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Há um botão para liberar a lista inteira: o trimestre fecha para todo mundo no mesmo dia, e marcar trinta caixas à mão é como três alunos ficam de fora.",
      },
      { tipo: "paragrafo", texto: "Recolher volta a esconder." },
    ],
  },

  {
    id: "boletim-2",
    titulo: "O boletim 2, quando o número não é o da conta",
    resumo: "Uma cópia com valores fixos, que você edita e marca como oficial.",
    perfis: ["secretaria", "coordenacao", "admin"],
    onde: "Gestão › Boletins › (aluno)",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "O boletim normal é **calculado**: ele se refaz a partir das notas que os professores lançam, e por isso uma correção aparece na hora. O **boletim 2** é o contrário, de propósito — ele nasce como cópia e, a partir daí, **nada o recalcula**. O valor que você digitar é o que sai no papel.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Serve para quando o número do boletim não é o número que a conta dá: aluno que chega transferido com notas de outra escola, adaptação curricular, decisão de conselho de classe.",
      },
      {
        tipo: "passos",
        itens: [
          "**Criar o boletim 2** — ele copia tudo o que já está lançado.",
          "**Conferir e corrigir** o que precisar. Dá para renomear as colunas (trocar “AV” por “PROVA”, por exemplo) e esconder as que não usa.",
          "**Salvar.**",
          "**Marcar “Este é o boletim oficial”** quando estiver certo.",
        ],
      },
      {
        tipo: "aviso",
        tom: "cuidado",
        texto:
          "Enquanto a caixa **não** estiver marcada, a família continua vendo o calculado — o boletim 2 existe só para a equipe. Marcada, ele passa a ser o que o aluno e o responsável veem no Portal, e o que sai na impressão.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**Marcar como oficial também libera.** O boletim calculado tem a liberação por trimestre; o boletim 2 é do ano inteiro, e esta caixa faz o papel dela. Um aluno sem nenhum trimestre liberado passa a ver o boletim 2 inteiro.",
      },
      {
        tipo: "aviso",
        tom: "nota",
        texto:
          "No **aplicativo** a família ainda vê o calculado: ele lê as notas direto e ainda não conhece o boletim 2. A tela avisa quando isso vale. No Portal e na impressão o oficial já vale.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Se uma média que você digitou **não bate** com as três notas daquele trimestre, aparece um aviso pequeno com o valor que a conta daria. Não impede nada — divergir é o ponto deste boletim —, mas é assim que um erro de digitação não passa despercebido.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**A ata de resultado final segue o oficial.** Marcado o boletim 2, é dele que saem as médias, a frequência e a situação daquele aluno na ata — a planilha que a escola assina e o boletim que a família recebeu não podem discordar. A ata ganha uma coluna **Origem** dizendo quais linhas vieram do boletim 2, e ela só aparece quando alguma veio.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**Apagar o boletim 2** devolve o calculado ao lugar dele. O professor não enxerga este documento; quem o cria, edita e marca fica registrado.",
      },
    ],
  },

  {
    id: "o-que-o-boletim-calcula",
    rotas: ["/gestao/notas"],
    titulo: "O que o boletim calcula",
    resumo: "Média, recuperação e reprovação por falta.",
    perfis: ["professor", "secretaria", "coordenacao", "admin"],
    blocos: [
      {
        tipo: "lista",
        itens: [
          "**Avaliação não lançada não é zero.** A média fica em branco enquanto faltar uma das três. Zero lançado, por outro lado, **é nota** e entra na conta.",
          "**Média parcial ≠ média anual.** A coluna TOTAL mostra os trimestres já fechados; a anual, que decide, só existe com os três.",
          "**Recuperação é só no fim do ano**, e a média final é (anual + recuperação) ÷ 2.",
          "**Reprovado por falta** usa a frequência geral do ano, não a da disciplina.",
        ],
      },
      {
        tipo: "aviso",
        tom: "nota",
        texto:
          "O **critério de avaliação** que vocês publicam é o texto que a família lê. Ele **não muda a conta** — mudar a conta de um boletim já fechado faria o resultado de um aluno mudar porque alguém salvou uma tela.",
      },
    ],
  },

  {
    id: "situacao-da-parcela",
    rotas: ["/gestao/financeiro"],
    titulo: "A situação da parcela não é digitada",
    resumo: "Vencida, em aberto e paga são conclusões sobre hoje.",
    perfis: ["financeiro", "secretaria", "admin"],
    onde: "Gestão › Financeiro",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "“Vencida”, “em aberto”, “paga” são **conclusões sobre hoje**, calculadas a cada abertura de tela. O que se guarda são os fatos: vencimento, valor, data e valor do pagamento.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Por isso não existe campo “situação” para corrigir — corrija a data ou o valor, e a situação acompanha.",
      },
    ],
  },

  {
    id: "baixa-e-conferencia",
    titulo: "Baixa, e a conferência à parte",
    resumo: "A baixa entra conferida; parcela paga não se apaga.",
    perfis: ["financeiro", "secretaria", "admin"],
    onde: "Gestão › Financeiro",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "A baixa registra o pagamento que já aconteceu. Ela entra **marcada como conferida**, porque quem lança quase sempre está com o comprovante na mão; desmarcar é o caso raro, para o PIX que a família avisou e o extrato só mostra amanhã.",
      },
      {
        tipo: "aviso",
        tom: "cuidado",
        texto:
          "**Parcela paga não pode ser apagada.** Primeiro desfaça a baixa — é esse registro que o colégio precisa quando a família contesta.",
      },
    ],
  },

  {
    id: "plano-e-anotacao",
    titulo: "O plano acordado e a anotação interna",
    resumo: "Dois textos, e só um deles a família lê.",
    perfis: ["financeiro", "secretaria", "admin"],
    onde: "Gestão › Financeiro",
    blocos: [
      {
        tipo: "tabela",
        linhas: [
          {
            rotulo: "Plano acordado",
            valor:
              "o que foi combinado na matrícula. **O responsável lê** no Portal e no aplicativo",
          },
          {
            rotulo: "Anotação interna",
            valor:
              "“ligar dia 10, o pai recebe no dia 5”. **Só a equipe lê.** A família não vê, nunca",
          },
        ],
      },
    ],
  },

  {
    id: "recibos",
    rotas: ["/gestao/recibos"],
    titulo: "Recibos",
    resumo: "Não se edita, e emitir de mensalidade dá baixa na parcela.",
    perfis: ["secretaria", "financeiro", "coordenacao", "admin"],
    onde: "Gestão › Recibos",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Corrigir um recibo já entregue faria o papel na mão da família discordar do sistema. Errou: **cancele com motivo e emita outro**. Os dois ficam no histórico.",
      },
      {
        tipo: "aviso",
        tom: "cuidado",
        texto:
          "**O número cancelado não volta.** O buraco na sequência é o que prova, na conferência, que aquele recibo existiu e foi anulado.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**Antes de emitir o primeiro, abra um talão.** Informe a série e o **próximo número**: se o talão de papel está no 847, informe **848**, para o sistema não emitir um número que já está numa gaveta.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Ao escolher o aluno aparecem as parcelas em aberto. Clicar em *Lançar no recibo* já traz serviço, referência e valor — e **ao emitir, a parcela fica paga**. Não lance a baixa de novo no financeiro. Cancelar o recibo devolve a parcela ao aberto.",
      },
      {
        tipo: "aviso",
        tom: "nota",
        texto:
          "A **secretaria também emite**, porque metade do que o colégio cobra — declaração, 2ª via de histórico, 2ª chamada — é pago no balcão dela.",
      },
    ],
  },

  {
    id: "avisos-e-pedidos",
    rotas: ["/gestao/avisos", "/gestao/informacoes", "/gestao/solicitacoes", "/gestao/documentos"],
    titulo: "Avisos, informações úteis e pedidos",
    resumo: "O que vai para a família, e o que ela escreve de volta.",
    perfis: ["secretaria", "coordenacao", "financeiro", "admin", "professor"],
    blocos: [
      {
        tipo: "lista",
        itens: [
          "**Aviso** vai para todos, um segmento, uma turma, um aluno ou um responsável. Cuidado com “todos”: chega a todas as famílias.",
          "**Informações úteis** é o material institucional — calendário, proposta pedagógica, critérios.",
          "**Solicitações** é a única coisa que a família **escreve** no sistema: documentação, saída antecipada e 2ª chamada. Saída antecipada é atendida **só pela coordenação**.",
        ],
      },
    ],
  },

  {
    id: "usuarios",
    rotas: ["/gestao/usuarios"],
    titulo: "Usuários e acessos",
    resumo: "Suspender corta o acesso de verdade, na hora.",
    perfis: ["admin", "secretaria", "coordenacao"],
    onde: "Gestão › Usuários",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "A tela mostra quem tem acesso, com que perfil e **até onde enxerga**.",
      },
      {
        tipo: "paragrafo",
        texto:
          "**Suspender corta o acesso de verdade** — no Portal e no aplicativo, e as sessões abertas caem. Trocar o perfil também derruba a sessão: a pessoa entra de novo já com o acesso novo.",
      },
      {
        tipo: "paragrafo",
        texto: "Três coisas o sistema recusa, e todas por um motivo:",
      },
      {
        tipo: "lista",
        itens: [
          "trocar o **próprio** perfil;",
          "suspender o **próprio** acesso;",
          "rebaixar ou suspender a **única administração ativa** — senão ninguém mais promove ninguém.",
        ],
      },
      {
        tipo: "aviso",
        tom: "nota",
        texto:
          "A **conta de família não nasce aqui**: ela vem do cadastro do aluno ou do responsável, onde o vínculo é feito junto. Criada solta, a pessoa entra e não vê nada — a lista marca essas contas com um aviso.",
      },
      {
        tipo: "paragrafo",
        texto:
          "A senha sai como **link para copiar**, não por e-mail: o sistema não manda e-mail, e quem atende costuma estar com a pessoa ao telefone.",
      },
    ],
  },

  {
    id: "relatorios",
    titulo: "Relatórios",
    resumo: "O que sai em planilha e o que sai para impressão.",
    perfis: ["secretaria", "coordenacao", "financeiro", "admin"],
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Em **planilha** (abre no Excel): Planilhão · Atas de matrículas, ativos, cancelados, concluídos e transferidos · Ata de resultado final (na tela da turma) · Pauta (na tela do diário) · Inadimplentes · Valores a receber.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Para **imprimir** (Ctrl+P): Relatório de inadimplentes · Ficha cadastral · Ficha financeira · Boletim · Recibo.",
      },
      {
        tipo: "lista",
        itens: [
          "**Inadimplentes e valores a receber saem por parcela**, não somando o aluno: quem cobra precisa saber qual mensalidade, de que mês.",
          "**Valores a receber inclui o que já venceu** — a pergunta “quanto entra até o dia 30” é sobre o que ainda não entrou.",
        ],
      },
    ],
  },

  {
    id: "nao-da-para-desfazer",
    titulo: "O que não dá para desfazer",
    resumo: "Quase tudo se corrige. Estas três, não.",
    perfis: "todos",
    blocos: [
      {
        tipo: "tabela",
        linhas: [
          {
            rotulo: "Número de recibo cancelado",
            valor: "não é reaproveitado",
          },
          {
            rotulo: "Aviso publicado",
            valor: "pode ser despublicado, mas quem já leu, leu",
          },
          {
            rotulo: "Arquivo substituído",
            valor: "boleto e foto novos apagam os anteriores",
          },
        ],
      },
      {
        tipo: "paragrafo",
        texto:
          "E uma que **se desfaz, mas incomoda**: liberar o boletim e recolher depois. A família que já olhou viu.",
      },
      {
        tipo: "aviso",
        tom: "nota",
        texto:
          "O resto se corrige à vontade: o sistema guarda **quem mudou o quê**, e quase tudo volta atrás.",
      },
    ],
  },

  {
    id: "dados-incompletos",
    titulo: "Onde os dados de hoje estão incompletos",
    resumo: "O que veio do Access sem tudo, e o que é só treino.",
    perfis: "todos",
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "O sistema entrou no ar com o cadastro migrado do Access. Algumas coisas o sistema antigo não guardava:",
      },
      {
        tipo: "lista",
        itens: [
          "**um aluno cancelado sem data** — foi encerrado aqui, e a data não existe em lugar nenhum; complete em Alunos › Situação das matrículas;",
          "**parcelas antigas sem descrição** — o Access guardava só valor e vencimento. A tela mostra um travessão, e preencher “mensalidade” por padrão inventaria um dado que ninguém conferiu;",
          "**responsáveis sem tipo** — contam como “acadêmico e financeiro” até alguém ajustar.",
        ],
      },
      {
        tipo: "paragrafo",
        texto:
          "E duas coisas que estão no banco só para treinamento, que podem ser apagadas ou substituídas pelo cadastro de verdade:",
      },
      {
        tipo: "lista",
        itens: [
          "os professores chamados **“QA Professor — …”**, criados para as turmas terem grade;",
          "as **notas e diários de EM2A e EM3A**, com resultados variados de propósito.",
        ],
      },
    ],
  },
];
