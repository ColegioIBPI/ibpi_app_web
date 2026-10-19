# Guia de teste — QA

Portal web e aplicativo Android do Colégio IBPI.

Este documento é o que a equipe de QA precisa para começar. Ele diz **onde
testar, com que conta, o que não tocar e o que já se sabe que está vazio**.

> As **senhas não estão aqui**, de propósito: este arquivo vive no
> repositório. Peça-as a quem liberou o acesso.

---

## 1. Antes de qualquer coisa: é produção

**Não existe ambiente de teste.** O Portal, o aplicativo e o QA falam com o
mesmo projeto Firebase, e o banco tem **74 alunos reais**, com CPF, endereço,
telefone de família e histórico financeiro.

Isso muda como se testa:

| | |
| --- | --- |
| **Grave só no aluno de teste** | matrícula **`QA-0001`**, "QA Aluno de Testes" |
| **Emita recibo só na série `QA`** | a numeração é única e não volta |
| **Nos alunos reais** | só leitura: abrir, conferir, imprimir |

A sandbox já está criada: aluno `QA-0001` numa turma real, com responsável
vinculado, três parcelas (uma paga, uma vencida, uma a vencer) e o talão de
recibos `QA`. É nela que se cancela matrícula, emite recibo, dá baixa e
lança ocorrência.

> Por que não em aluno real: a família **vê** a ocorrência e o boletim no
> aplicativo; o recibo queima um número da sequência que o colégio confere
> no caixa; a matrícula cancelada some das listas e das atas.

### O que não tocar, em nenhuma hipótese

- **Não suspenda nem troque o perfil** das contas que não têm `.teste` no
  e-mail — são as contas reais do colégio.
- **Não apague** aluno, responsável, turma, disciplina ou parcela real.
- **Não envie boleto nem foto** em aluno real.
- **Não publique aviso** para "todos": ele chega às famílias de verdade.
  Para testar aviso, mire a turma do `QA-0001`.

---

## 2. Onde testar

| | |
| --- | --- |
| **Portal web** | `https://conecta.colegioibpi.com.br` |
| **Aplicativo** | build Android, apontando para o mesmo Firebase |

O aplicativo é da **família**: só os perfis `responsavel` e `aluno` entram
nele. O resto é Portal.

---

## 3. As contas

Uma por perfil. O e-mail é o login.

| Perfil | E-mail | Onde entra |
| --- | --- | --- |
| Administração | `admin.teste@ibpi.com.br` | Portal |
| Secretaria | `secretaria.teste@ibpi.com.br` | Portal |
| Coordenação | `coordenacao.teste@ibpi.com.br` | Portal |
| Financeiro | `financeiro.teste@ibpi.com.br` | Portal |
| Professor | `professor.teste@ibpi.com.br` | Portal |
| Responsável | `responsavel.teste@ibpi.com.br` | Portal **e app** |
| Aluno | `aluno.teste@ibpi.com.br` | Portal **e app** |

O professor de teste tem **três alocações** (Física e Matemática em EM2A,
Física em EM3A) e o responsável tem **dois filhos** — ambos de propósito,
para o recorte de escopo e o seletor de aluno terem o que mostrar.

---

## 4. O que mais importa testar

A maior parte dos defeitos deste sistema não é tela quebrada: é **regra
invisível**. Abaixo, as que valem o tempo.

### 4.1 Permissões — o teste mais barato e mais rentável

Entre com **cada um dos sete perfis** e confira que o menu muda. Depois
tente a porta fechada: cole na barra de endereços uma rota que o perfil não
tem.

O esperado é **ser devolvido para a tela inicial**, nunca ver um erro feio
nem a tela carregar pela metade.

| Perfil | Não pode ver |
| --- | --- |
| Professor | Financeiro, Recibos, Usuários, Configurações, Turmas, Disciplinas |
| Financeiro | Notas, Frequência, Ocorrências, Boletins, Usuários |
| Aluno | Financeiro, Solicitações |
| Responsável | nada do lado de gestão |

E o recorte do professor: em **Alunos**, ele só enxerga os das turmas em que
está alocado. Compare com o que a secretaria vê.

### 4.2 Liberação do boletim

**É a regra mais nova e a mais fácil de quebrar.**

1. Com a secretaria, vá em **Boletins** e confira que o `QA-0001` tem três
   caixas (1º, 2º, 3º trimestre), todas desmarcadas.
2. Entre como **responsável** ou **aluno** e abra o boletim: deve dizer
   *"Boletim ainda não liberado"* — e **não** uma grade vazia.
3. Volte, marque o 1º trimestre, e confira que a família passa a ver só
   aquele trimestre.
4. Desmarque e confira que some de novo.

No **aplicativo**, o mesmo: antes de liberar, nada; e a consulta não pode
devolver erro de permissão na tela.

### 4.3 Publicação de ocorrências

Ao lançar ocorrência na chamada, há duas caixas: **Responsável vê** e
**Aluno vê**. O padrão é responsável marcado, aluno desmarcado.

- Lance uma ocorrência no `QA-0001` e confira que o responsável vê e o
  aluno não.
- Marque "Aluno vê" pela lista de **Ocorrências** e confira que aparece
  para ele.
- Retenha (desmarque os dois) e confira que **some dos dois** — e que a
  tela da família **não diz** que existe algo escondido.

### 4.4 Frequência: atraso e saída antecipada **não são falta**

Na chamada, o botão cicla P → F → A → S. Marque **S (saída antecipada)** e
confira que o percentual de frequência **não cai** como cairia com falta.

### 4.5 Recibos

Na série **`QA`**:

- emita um recibo com dois itens, de serviços diferentes e formas de
  pagamento diferentes;
- confira que o **total** bate com a soma, e que o número é sequencial;
- **tente editar** — não deve haver como. O caminho é cancelar e emitir
  outro;
- cancele e confira que o motivo é obrigatório, que o recibo fica marcado
  como cancelado **no próprio documento impresso**, e que o número não é
  reaproveitado.

E a quitação: lance uma parcela em aberto do `QA-0001` no recibo, emita, e
confira que a parcela aparece **paga** no extrato. Cancele o recibo e
confira que ela volta a ficar em aberto.

### 4.6 Usuários

- Suspenda uma conta `.teste` e confira que ela **não entra mais**, nem no
  Portal nem no aplicativo (a mensagem deve falar em acesso suspenso, não
  em senha errada).
- Tente **trocar o próprio perfil** e **suspender a si mesmo**: os dois
  devem ser recusados com explicação.
- Com uma só administração ativa, tente rebaixá-la: deve ser recusado.

### 4.7 Relatórios

Baixe cada um e confira que abre no Excel com conteúdo:

Planilhão · Ata de matrículas · Ata de ativos · Ata de cancelados · Ata de
concluídos · Ata de transferidos · Ata de resultado final (na tela da
turma) · Pauta (na tela do diário) · Inadimplentes · Valores a receber

E os impressos (Ctrl+P, conferir a prévia): **Relatório de inadimplentes**,
**Ficha cadastral** (deve sair em **retrato**), **Ficha financeira**,
**Boletim**, **Recibo**.

### 4.8 O aplicativo

Além do boletim e das ocorrências acima:

- trocar de filho no seletor e conferir que **todas** as abas acompanham;
- abrir uma solicitação (documentação, saída antecipada, 2ª chamada) e
  conferir que ela aparece na fila da secretaria;
- baixar o boleto;
- conferir que o **aluno não vê financeiro**.

---

## 5. O que já se sabe que está vazio

**Não reporte como defeito.** O sistema está em implantação e boa parte do
ano letivo ainda não foi montada.

| O quê | Quanto existe | Efeito |
| --- | --- | --- |
| Vínculos professor × turma × disciplina | **110** — montados | ver abaixo |
| Notas lançadas | **13** | boletins quase em branco |
| Diários de classe | **3**, o maior com 1 aula | a pauta sai com poucas colunas de aula |
| Boletins fechados | **0** | — |
| Cursos cadastrados | **0** | os quatro padrões aparecem; grave-os em Configurações › Cursos para editar |
| Critérios de avaliação | **0** | o bloco "Como o aluno é avaliado" não aparece até publicar um |
| Ocorrências | **1** | — |
| Credenciais de plataforma | **0** | a aba de acessos abre vazia |

Em compensação, há dado de sobra em: **alunos (74)**, **responsáveis
(120)**, **cobranças (852)**, **disciplinas (46)**, **turmas (10)** e
**documentos solicitáveis (10)**.

### Os vínculos são andaime

As **10 turmas têm grade completa** — as 11 disciplinas do boletim cada
uma —, então a ata de resultado final, a pauta e o diário têm colunas e o
QA consegue lançar nota.

Mas **o quadro de professores é de mentira**. O colégio não informou quem
leciona o quê, e o banco só tinha dois professores. Os nomes
`QA Professor — Linguagens`, `— Exatas`, `— Humanas` e `— Diversificada`
existem só para a alocação ter um responsável.

**Não reporte os nomes como errados**, e não os use para conferir horário.
O professor real já cadastrado e as turmas dele não foram tocados.

O **Professor de Teste** ficou só com **EM2A e EM3A**, de propósito: é a
conta que o QA usa, e o escopo dele precisa continuar estreito para o teste
de permissão da seção 4.1 significar alguma coisa.

Um detalhe conhecido: **um aluno cancelado não tem data de cancelamento** —
foi encerrado no Portal e a data não existe em lugar nenhum. Os outros dez
têm.

---

## 6. Como reportar

Para cada defeito:

1. **Perfil e e-mail** usados — metade dos relatos de "não aparece" é
   permissão funcionando;
2. **Portal ou aplicativo**;
3. **Caminho** até a tela (`Gestão › Boletins › Liberação`);
4. **O que fez, o que esperava, o que aconteceu**;
5. **Matrícula ou número** do registro envolvido, quando houver;
6. **Horário aproximado** — ajuda a achar o registro na auditoria;
7. Print da tela.

> "Sem permissão", "a lista veio vazia" e "o campo está em branco" são, na
> maioria das vezes, comportamento correto. Antes de abrir, confira as
> seções 4.1 e 5.

---

## 7. Depois do teste

```bash
npm run qa:sandbox -- --apagar     # leva o aluno QA, o talão e tudo o que ele gerou
npm run qa:vinculos -- --apagar    # leva os professores de andaime e as alocações deles
npm run conta:teste -- --perfil <perfil> --apagar
```

A sandbox apaga junto tudo o que foi gerado nela — nota, frequência,
ocorrência, recibo da série `QA`. O que ficar num aluno real **não é
apagado por script**: tem de ser corrigido pela tela, porque script que
apaga dado de aluno é mais perigoso que o engano que ele conserta.
