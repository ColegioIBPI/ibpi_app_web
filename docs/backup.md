# Backup e restauração

```bash
npm run backup
npm run backup -- --destino D:/backups-ibpi
```

## Por que isto existe

**Não há `colegioibpi-dev`.** Toda mudança de estrutura, toda limpeza e
todo script de migração rodam sobre o banco de verdade, com o aplicativo
da família apontando para ele.

E o Firestore **não tem lixeira**: documento apagado não volta, e não há
"ontem" para onde voltar. O backup é a única coisa entre uma linha de
script e o cadastro do colégio.

## O que ele grava

| | |
| --- | --- |
| **Um JSON por coleção** | com o **id** de cada documento |
| **`_auth.json`** | as contas, sem senha |
| **`arquivos/`** | o que está no Cloud Storage |
| **`manifesto.json`** | projeto, data e a contagem de cada coleção |

**O id vai junto porque aqui ele significa alguma coisa.** A matrícula é a
chave de `alunos`, `boletins`, `credenciais`, `boletos` e
`entregaDeDocumentos`; o ano letivo entra na chave de `notas`, `turmas` e
`alocacoes`. Um backup sem ids não reconstrói nada.

**Senha não dá para salvar.** O Firebase guarda hash e não devolve o
original — nem para o dono do projeto. O que volta é quem existe, com que
e-mail, qual perfil (`customClaims`, que é o que as Security Rules leem) e
se está ativo. Restaurar contas significa recriá-las e disparar o link de
primeira senha, como no primeiro acesso.

**Os arquivos entram** porque são os que não se refazem digitando: foto de
aluno, boleto, anexo de aviso. O nome da pasta vira parte do nome do
arquivo (`alunos__26007__foto.webp`) para caber num diretório só.

## Onde ele cai, e por que não no Git

Em `backups/<data>/`, e **`backups/` está no `.gitignore`**.

É dado pessoal de menor de idade — nome, CPF, endereço, filiação,
histórico financeiro. Um backup versionado é esse dado publicado no
GitHub para sempre, e `git add -A` não perdoa.

> Guarde a pasta **fora da máquina** antes de qualquer operação de risco.
> Um backup no mesmo disco não protege do disco.

## Restaurar

**Não existe ainda, e é de propósito.** Escrever de volta é uma ferramenta
perigosa o bastante para não dividir o arquivo com a que só lê, e ela
precisa de decisões que o backup não precisa: sobrescreve ou recusa o que
já está lá? Restaura a coleção inteira ou um documento?

Para uma emergência hoje, o JSON é legível e cada arquivo tem os ids — dá
para reinserir à mão pelo console do Firebase ou por um script pontual.
Quando a restauração virar rotina, ela vira `scripts/restaurar.mts`.

## Quando rodar

- **Antes de qualquer script que escreve** (migração, limpeza, correção em
  lote);
- **antes da virada de ano letivo**;
- no fim de cada período em que a secretaria cadastrou muita coisa.

O custo é baixo: a base inteira hoje são **3 801 documentos e 12 MB**.
