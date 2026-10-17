# Configurações do ano letivo

O que se monta em janeiro, **na ordem em que se monta**:

```
1. Cursos  →  2. Turmas  →  3. Disciplinas  →  4. Professores  →  5. Vínculos  →  6. Critérios
```

Essa ordem é a informação principal da tela. Quem chega sem saber por onde
começar erra justamente a sequência: cria turma antes de o curso existir, ou
aloca professor em disciplina que ninguém cadastrou.

**Turmas, Disciplinas e Professores continuam no menu lateral.** Quem
trabalha nelas todo dia não deveria passar por "Configurações" para abrir
uma lista. Aqui elas aparecem reunidas, não mudadas de lugar.

---

## 1. Cursos

`cursos/{codigo}` — era uma lista fixa no código, virou cadastro. A lista é
do colégio, não do sistema: abrir um curso livre ou um técnico não pode
depender de alguém mexer no código e publicar.

### O cadastro nasceu sem migração

**Os ids dos quatro primeiros são exatamente os códigos que já existiam**
(`medio`, `fundamental`, `eja-medio`, `eja-fundamental`). Por isso todo
aluno, turma, boletim e aviso já gravado aponta para um curso válido sem que
nenhum documento precisasse ser tocado.

> Conferido contra o banco real: 73 alunos e 10 turmas, nenhum órfão.

### O campo continua se chamando `segmento`

Nos documentos, o curso é gravado em `segmento`. Renomear traria um sinônimo
e **quebraria `docs/app-mobile.md`**, que é contrato publicado com a equipe
do aplicativo. "Curso" é como o colégio chama; `segmento` é como está
gravado. São a mesma coisa.

### O código sai do nome e nunca muda

`Curso Livre de Redação` → `curso-livre-de-redacao`. Gerado, e não digitado,
porque vira **id de documento**: um espaço ou uma barra quebrariam o caminho,
e um acento faria o mesmo curso ter dois códigos conforme quem digitou.

E não muda na edição: é a chave que aluno, turma e boletim guardam. Trocá-la
deixaria todos apontando para um curso que não existe, e o estrago
apareceria no boletim de quem já estava matriculado.

### Não existe apagar, existe encerrar

Aluno formado, boletim e recibo antigos apontam para o curso. Sumir com ele
deixaria o histórico sem nome de curso — exatamente o documento que alguém
pede anos depois. Curso encerrado some dos seletores e continua existindo.

No formulário da turma, um curso encerrado **continua aparecendo** se for o
curso daquela turma; sem isso o seletor abriria em outro curso e salvar
trocaria o curso da turma sem ninguém pedir.

### A proteção que mudou de lugar

`segmentoSchema` era `z.enum` e recusava código inventado. Deixou de ser,
porque um enum recusaria no banco o curso que a secretaria acabou de criar
na tela.

A conferência não sumiu: **`salvarTurma` verifica que o curso existe no
cadastro**. É no servidor, e não no formulário — o seletor já só mostra
cursos válidos, mas seletor é conveniência, não garantia.

E `rotuloDoCurso()` nunca devolve vazio: cadastro → rótulos antigos →
o próprio código. Indexar o objeto fixo com um código desconhecido devolvia
`undefined`, e o boletim imprimiria "Curso: " sem ninguém ver.

---

## 2. Vínculos

Quem leciona qual disciplina em qual turma — a mesma `alocacoes` que já era
preenchida na ficha do professor, **vista pela turma**.

As duas telas existem porque são duas perguntas. Na ficha do professor:
"em que turmas o Juarez dá aula?". Aqui: "esta turma já tem professor em
todas as disciplinas?". A primeira se responde um professor por vez; a
segunda, só olhando a turma inteira — que é a pergunta de janeiro.

**As ações são as mesmas** (`alocarProfessor`, `removerAlocacao`). Duas
gravações do mesmo vínculo é como as duas telas passam a discordar sobre o
que é duplicata.

Disciplina já vinculada sai da lista de opções: a ação recusaria a
duplicata, e oferecer o que vai ser recusado é convidar ao erro.

> É este vínculo que define **o que o professor enxerga**. Turma sem
> vínculo é turma que nenhum professor acessa.

---

## 3. Critérios de avaliação

`criteriosDeAvaliacao/{ano}` ou `{ano}-{curso}`.

### É documento publicado, não parâmetro de cálculo

**O boletim continua sendo calculado por
`features/notas/domain/calculo.ts`**, em funções puras com teste para cada
caso — ver [avaliacao.md](avaliacao.md).

Ligar o cálculo a um documento editável faria o boletim de um aluno **mudar
de resultado porque alguém salvou uma tela**, e boletim já fechado não pode
mudar de ideia.

O que este cadastro resolve é outro problema, e é real: hoje o critério só
existe no papel e na cabeça da coordenação, e cada família pergunta por
telefone.

### O formulário nasce preenchido com o que o sistema calcula

`CRITERIO_PADRAO` vem de `docs/avaliacao.md`. Começar em branco convidaria a
publicar um critério que contradiz a conta por distração de quem digitou — e
a família leria uma regra que o boletim não segue.

O peso de cada avaliação é **texto** ("1/3 da média"), não número: um número
ali daria a impressão de que entra em alguma conta.

### Onde a família lê

No **boletim**, abaixo das notas, e **imprime junto**: a pergunta "como essa
média foi calculada?" aparece com o boletim na mão, e a resposta numa outra
tela não chega a quem imprimiu o papel.

Um critério por boletim, e não um por página: filhos em cursos diferentes
podem ter critérios diferentes, e mostrar o de um ao lado do boletim do
outro seria pior que não mostrar nada.

O resumo no cabeçalho da página também sai do critério publicado. Antes era
uma frase fixa no código, que só mudaria no dia em que alguém lembrasse de
editá-la.

### Um por ano, e rascunho não vaza

O critério de 2026 não substitui o de 2025: boletim fechado continua valendo
pelo critério do ano dele.

Enquanto `publicado` é `false`, **só a equipe lê** — critério costuma ser
discutido antes de virar comunicado, e um rascunho visível à família é pior
que nenhum. A regra do Firestore verifica o campo, não só o perfil.

---

## 4. Quem acessa

Secretaria, coordenação e administração — `cadastros: gerenciar`, o mesmo
dono de Turmas e Disciplinas. O financeiro lê cadastro mas não o gerencia,
então **não vê Configurações**.

Os cursos são lidos por **qualquer pessoa autenticada**, como as turmas: o
nome do curso aparece na ficha, no boletim e no recibo.

---

## 5. Pendências

- **Salas** não entraram no roteiro; hoje são escolhidas no cadastro da
  turma e não têm tela própria.
- **Dias e horários de aula** (`diasDeAula`) continuam sem tela.
- **Copiar a estrutura de um ano para o seguinte** — hoje turmas e vínculos
  de janeiro são recriados à mão.
- O critério publicado aparece no **boletim** da família; ainda não tem
  lugar em "Informações úteis", para quem quer lê-lo fora da época de
  boletim.
