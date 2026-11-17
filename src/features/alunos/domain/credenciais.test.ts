import { describe, expect, it } from "vitest";

import { usuarioEhDeQuemSalva } from "@/features/alunos/domain/credenciais";

const SECRETARIA = "cristiana@colegioibpi.com.br";

describe("acesso de quem está salvando", () => {
  it("reconhece o login da pessoa logada em qualquer um dos campos", () => {
    // O acidente relatado: o navegador preenche o formulário do aluno com
    // o login de quem está atendendo, e salvar põe a senha do Portal dela
    // num campo que **a família lê**.
    expect(usuarioEhDeQuemSalva([SECRETARIA, null], SECRETARIA)).toBe(true);
    expect(usuarioEhDeQuemSalva([null, SECRETARIA], SECRETARIA)).toBe(true);
  });

  it("ignora maiúsculas e espaços — o engano continua o mesmo", () => {
    expect(
      usuarioEhDeQuemSalva(["  Cristiana@ColegioIBPI.com.br "], SECRETARIA),
    ).toBe(true);
  });

  it("deixa passar o acesso de verdade do aluno", () => {
    expect(
      usuarioEhDeQuemSalva(["aluno.maria", "maria@aluno.ibpi"], SECRETARIA),
    ).toBe(false);
  });

  it("campo vazio não é o login de ninguém", () => {
    // Senão a secretaria não conseguiria **limpar** um acesso.
    expect(usuarioEhDeQuemSalva([null, null], SECRETARIA)).toBe(false);
    expect(usuarioEhDeQuemSalva(["", "  "], SECRETARIA)).toBe(false);
  });

  it("sessão sem e-mail não bloqueia nada", () => {
    // Não dá para comparar com o que não existe, e recusar toda gravação
    // seria pior que o problema.
    expect(usuarioEhDeQuemSalva(["qualquer"], "")).toBe(false);
    expect(usuarioEhDeQuemSalva([""], "   ")).toBe(false);
  });
});
