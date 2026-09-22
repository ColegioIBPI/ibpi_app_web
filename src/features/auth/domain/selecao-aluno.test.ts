import { describe, expect, it } from "vitest";

import {
  precisaDeSeletor,
  resolverAlunoSelecionado,
} from "@/features/auth/domain/selecao-aluno";

describe("resolverAlunoSelecionado", () => {
  it("mantém a seleção guardada quando o vínculo ainda existe", () => {
    expect(resolverAlunoSelecionado(["1001", "1002"], "1002")).toBe("1002");
  });

  it("cai no primeiro filho quando não há nada guardado", () => {
    expect(resolverAlunoSelecionado(["1001", "1002"], null)).toBe("1001");
    expect(resolverAlunoSelecionado(["1001", "1002"])).toBe("1001");
  });

  it("descarta seleção guardada de um vínculo que não existe mais", () => {
    // Filho que saiu da escola, ou responsável que perdeu o vínculo: o valor
    // velho no navegador não pode manter o acesso.
    expect(resolverAlunoSelecionado(["1001"], "9999")).toBe("1001");
  });

  it("devolve null quando não há filho vinculado", () => {
    expect(resolverAlunoSelecionado([], "1001")).toBeNull();
    expect(resolverAlunoSelecionado([])).toBeNull();
  });
});

describe("precisaDeSeletor", () => {
  it("só aparece com mais de um filho", () => {
    expect(precisaDeSeletor([])).toBe(false);
    expect(precisaDeSeletor(["1001"])).toBe(false);
    expect(precisaDeSeletor(["1001", "1002"])).toBe(true);
  });
});
