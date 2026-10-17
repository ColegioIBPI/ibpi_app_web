# Frequência e ocorrências

Nada disso veio do Access: vive em planilha (`CONTROLE DE FALTAS.xlsx`) e em
PDF impresso. O modelo espelha o que o colégio já preenche.

---

## 1. As quatro situações

| Código | Situação          | Conta como |
| ------ | ----------------- | ---------- |
| `P`    | Presente          | presença   |
| `F`    | Falta             | falta      |
| `A`    | Atraso            | **presença** |
| `S`    | Saída antecipada  | **presença** |

Os três primeiros são os da planilha. A **saída antecipada** foi pedida
depois.

### Por que atraso e saída antecipada contam como presença

**Os dois alunos estiveram na aula.** O registro existe à parte porque
interessa à coordenação — é o que mostra o padrão de quem chega tarde ou sai
cedo —, mas transformá-lo em falta inventaria uma reprovação que o colégio
não aplica.

A conta é a mesma de antes, com um termo a mais:

```
presença = (presentes + atrasos + saídas antecipadas) ÷ dias com registro
```

> Isso vale **enquanto a marcação for do dia**. No dia em que o colégio
> quiser descontar as aulas perdidas depois da saída, a conta muda em
> `percentualDePresenca` — e é por isso que ela mora numa função só, com
> teste.

### Saída antecipada não é a solicitação de saída antecipada

São duas coisas com o mesmo nome:

| | O quê |
| --- | --- |
| `solicitacoes` tipo `saida-antecipada` | a família **pede** para o aluno sair mais cedo |
| `frequenciaDiaria` situação `saida-antecipada` | a escola **registra** que ele saiu |
| `ocorrencias` tipo `saida-antecipada` | a escola **narra** o fato |

O pedido é da família e passa pela coordenação; a presença conta o dia; a
ocorrência conta a história. Um não implica o outro — aluno sai cedo sem ter
pedido, e pedido nem sempre vira saída.

---

## 2. A autorização de publicação das ocorrências

Cada ocorrência decide, **por documento**, quem a lê fora da equipe:

```
visivelParaResponsavel   visivelParaAluno
```

**São dois campos, e não um.** Um "comportamento inadequado" descrito para a
coordenação nem sempre é o texto que se quer na mão do aluno de 14 anos, e
às vezes é exatamente o que o responsável precisa ler antes da reunião.

### O padrão mantém o que já valia

| Campo | Ausente significa | Por quê |
| --- | --- | --- |
| `visivelParaResponsavel` | **verdadeiro** | antes do campo existir, o responsável via todas |
| `visivelParaAluno` | **falso** | o aluno nunca viu ocorrência nenhuma |

Tratar a ausência como "retida" faria a família deixar de ver, de uma hora
para outra, o que já via — e **ninguém notaria, porque o que some não
avisa**. É o mesmo raciocínio de `confirmado` em
[financeiro.md](financeiro.md).

> Conferido contra o banco real: as ocorrências já gravadas continuam todas
> chegando ao responsável, e nenhuma chega ao aluno.

Ocorrência **nova** grava os dois campos sempre, então a ausência só existe
em registro antigo. Na chamada, a caixa do responsável nasce marcada —
desmarcá-la é o ato deliberado de reter — e a do aluno, desmarcada.

### O recorte é por documento, não por menu

O aluno passou a ter `ocorrencias: ler` na matriz. **Isso não quer dizer que
ele vê as ocorrências dele**: a matriz diz o recurso, e
`domain/publicacao.ts` diz o documento. Sem o recurso, a autorização não
teria efeito nenhum; com ele, o recorte continua sendo caso a caso.

A mesma regra existe em dois lugares e **tem de bater**: o serviço filtra
(porque o Admin SDK ignora as regras) e a Security Rule nega (porque o
aplicativo lê o Firestore direto).

### A lista da família não diz que há algo retido

"Há uma ocorrência que você não pode ver" é pior que silêncio: entrega o
fato sem o contexto, que é justamente o que a retenção quis evitar.

Do lado da equipe é o contrário — a lista de ocorrências mostra a quem cada
registro chega, senão a coordenação só descobriria abrindo um por um que
metade está retida.

---

## 3. Onde se marca

A publicação é definida **na chamada**, junto da ocorrência, e as caixas só
aparecem quando há uma ocorrência escolhida: sem ela não há o que publicar,
e duas caixas em toda linha atravancariam uma tela feita às pressas.

Reabrir a chamada traz as caixas **como foram deixadas**. A autorização mora
no documento da ocorrência, não no da frequência, então quem carrega a tela
junta os dois — sem isso, salvar de novo republicaria em silêncio o que
alguém tinha retido.

---

## 4. Pendências

- **Editar a publicação fora da chamada.** Hoje, para mudar quem vê uma
  ocorrência de ontem, é preciso reabrir a chamada daquele dia.
- A ocorrência lançada fora da chamada **não existe**: toda ocorrência nasce
  de uma linha da chamada.
- O app ainda não lê `visivelParaAluno` — ver [app-mobile.md](app-mobile.md).
