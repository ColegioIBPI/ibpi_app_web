/**
 * Faz **esta rota** imprimir em A4 retrato.
 *
 * O `@page` do `globals.css` é paisagem, escolhido pelo boletim — três
 * trimestres × quatro colunas não cabem em retrato sem encolher o texto a
 * um tamanho ilegível. Mas a ficha cadastral é um formulário vertical, e em
 * paisagem sobra meia folha em branco à direita.
 *
 * **`@page` não aceita seletor**: não dá para dizer "retrato dentro desta
 * div". A regra é do documento inteiro, e a única forma de trocá-la por
 * rota é a própria rota declarar a sua — que, vindo depois, vence a do
 * `globals.css`.
 *
 * Sai do DOM quando a rota sai: o React desmonta o `<style>` junto com a
 * página, então navegar daqui para o boletim não leva o retrato junto.
 *
 * Conferido no navegador: as duas regras ficam no documento, a da rota por
 * último, e é ela que vale. O Chrome normaliza `A4 portrait` para `a4` ao
 * serializar — são a mesma coisa, porque retrato é a orientação padrão de
 * um tamanho nomeado. O `portrait` fica escrito mesmo assim, para quem lê.
 */
export function PaginaEmRetrato() {
  return (
    <style
      // `dangerouslySetInnerHTML` porque é folha de estilo, não texto: o
      // React não deve escapar nada aqui dentro.
      dangerouslySetInnerHTML={{
        __html: "@page { size: A4 portrait; margin: 10mm; }",
      }}
    />
  );
}
