# Design system

Implementado em `src/app/globals.css` (tokens) e `src/core/ui/` (componentes).

## Paleta

Origem: _Manual da Marca — Colégio IBPI_.

| Token                     | Hex                   | Contraste no branco | Uso                                                                             |
| ------------------------- | --------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `brand-500`               | `#0098DA`             | 3.2:1               | **Azul oficial.** Preenchimento, borda, anel de foco. Não usar em texto pequeno |
| `brand-600`               | `#007CB2`             | 4.6:1               | Texto, link, botão primário — passa AA                                          |
| `brand-700`               | `#00648F`             | 6.5:1               | Hover e títulos                                                                 |
| `brand-800` / `brand-900` | `#004E70` / `#003952` | 9.0:1 / 12.3:1      | Alto contraste                                                                  |
| `brand-50…400`            | —                     | —                   | Fundos e superfícies claras                                                     |
| `accent`                  | `#FDD900`             | 1.4:1               | Amarelo da marca — **só como fundo**, com `accent-ink` por cima (11.2:1)        |
| `ink`                     | `#1A1A1A`             | 17.4:1              | Texto principal                                                                 |
| `ink-muted`               | `#666666`             | 5.7:1               | Texto secundário                                                                |
| `line`                    | `#E7E5E6`             | —                   | Cinza da marca: bordas e divisórias                                             |
| `surface`                 | `#FEFEFE`             | —                   | Branco da marca: fundo                                                          |

Semânticas, derivadas para uso funcional (não estão no manual):

| Token     | Hex       | Contraste | Uso                |
| --------- | --------- | --------- | ------------------ |
| `success` | `#0E7C3A` | 5.3:1     | Aprovado, pago     |
| `danger`  | `#B3261E` | 6.5:1     | Reprovado, vencido |
| `warning` | `#8A6100` | 5.5:1     | Atenção, pendência |

### Por que o azul oficial não vira cor de texto

`#0098DA` sobre branco dá **3.2:1**, abaixo do mínimo AA de 4.5:1 para texto
normal. Ele continua sendo a cor da marca e aparece em preenchimento, borda e
foco — onde o requisito é 3:1 e ele passa. Para texto, link e botão o sistema
usa `brand-600`, que mantém a mesma matiz e saturação e chega a 4.6:1.

O mesmo vale ao contrário: texto branco sobre `#0098DA` também dá 3.2:1, então
o botão primário usa `brand-600` como fundo.

> `ink-muted` é `#666666` e não o chumbo `#6E6E6E` do manual: sobre o cinza
> `#E7E5E6` da própria marca, o chumbo dá 4.07:1 e reprova. O `#666666` dá
> 4.58:1 sobre o cinza e 5.74:1 sobre branco — indistinguível a olho nu e
> aprovado nos dois fundos.

Todos os valores acima foram calculados pela fórmula de luminância relativa da
WCAG, não estimados.

## Componentes

| Componente                                                   | Arquivo              | Observação                                                                                                       |
| ------------------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Button`                                                     | `core/ui/button.tsx` | Variações primary, secondary, ghost, danger. `type="button"` por padrão, para não submeter formulário sem querer |
| `TextField` / `SelectField`                                  | `core/ui/field.tsx`  | Rótulo associado, `aria-invalid` e mensagem de erro com `role="alert"`                                           |
| `Card`                                                       | `core/ui/card.tsx`   | Bloco de conteúdo com título e ação                                                                              |
| `Table` e primitivas                                         | `core/ui/table.tsx`  | Cabeçalho fixo, rolagem horizontal no celular                                                                    |
| `Modal`                                                      | `core/ui/modal.tsx`  | `<dialog>` nativo: foco preso e Escape vêm do navegador                                                          |
| `ToastProvider` / `useToast`                                 | `core/ui/toast.tsx`  | Aviso passageiro, com `aria-live`                                                                                |
| `LoadingState`, `EmptyState`, `ErrorState`, `ForbiddenState` | `core/ui/states.tsx` | Os quatro estados que toda tela precisa tratar                                                                   |

## Tipografia e espaçamento

Fonte **Inter** (`next/font/google`), carregada na variável `--font-inter` e
exposta como `--font-sans`. Foi escolhida por ter altura-x grande e números
tabulares legíveis em tamanho pequeno — o sistema é feito de tabela de nota e
de falta.

A **escala tipográfica e o espaçamento são os padrões do Tailwind** (`text-xs`
a `text-2xl`, espaçamento em múltiplos de `0.25rem`). É uma decisão, não uma
omissão: uma escala própria só se justifica quando há um layout específico que
a padrão não atende, e não é o caso aqui. Na prática o sistema usa:

| Uso                   | Classe                    |
| --------------------- | ------------------------- |
| Título de página      | `text-xl font-semibold`   |
| Título de bloco       | `text-base font-semibold` |
| Texto padrão e tabela | `text-sm`                 |
| Apoio, dica, erro     | `text-xs`                 |

Raio de borda de cartão e modal: `rounded-card` (`0.75rem`).

## Diretrizes

- **Mobile-first** nas telas de aluno e responsável; **densidade de dados** nas
  telas de secretaria e professor.
- Foco visível em tudo (`:focus-visible` global no `globals.css`).
- Tema claro apenas.
- Componente não contém regra de negócio.

## Logo

`public/brand/logo-ibpi.png` e `public/brand/icone-ibpi.png`, com fundo
tornado transparente a partir dos arquivos originais em `C:\pessoal\ibpi\doc`.

> ⚠️ Os originais recebidos são JPEG. Vale pedir ao colégio as versões
> vetoriais (SVG/AI) do manual — a logo fica visivelmente melhor em tela de
> alta densidade e o favicon sai mais limpo.
