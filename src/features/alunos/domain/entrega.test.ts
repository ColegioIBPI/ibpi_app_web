import { describe, expect, it } from "vitest";

import { DOCUMENTOS_DA_MATRICULA } from "@/core/modelo";
import {
  baseDaEntrega,
  ehOpcional,
  foiEntregue,
  marcar,
  pendentes,
  resumir,
  type Itens,
} from "@/features/alunos/domain/entrega";

const entregue = { entregue: true, em: "2026-02-03T12:00:00.000Z" };

const todosMenos = (faltando: string[]): Itens =>
  Object.fromEntries(
    DOCUMENTOS_DA_MATRICULA.filter((t) => !faltando.includes(t)).map((t) => [
      t,
      entregue,
    ]),
  );

describe("o que falta", () => {
  it("aluno novo deve todos os exigidos", () => {
    const resumo = resumir({});

    expect(resumo.entregues).toBe(0);
    expect(resumo.exigidos).toBe(8);
    expect(resumo.faltam).toBe(8);
    expect(resumo.completo).toBe(false);
  });

  it("laudo médico não conta como pendência", () => {
    // Laudo só existe quando existe. Exigi-lo de todos faria a lista nunca
    // fechar e ensinaria a secretaria a ignorar o que está em vermelho.
    const resumo = resumir(todosMenos(["laudo-medico"]));

    expect(resumo.faltam).toBe(0);
    expect(resumo.completo).toBe(true);
    expect(pendentes(todosMenos(["laudo-medico"]))).toEqual([]);
  });

  it("mas o laudo entregue conta no total mostrado", () => {
    expect(resumir(todosMenos([])).entregues).toBe(9);
    expect(resumir(todosMenos(["laudo-medico"])).entregues).toBe(8);
  });

  it("aponta exatamente o que falta, na ordem da conferência", () => {
    const itens = todosMenos(["rg-do-aluno", "historico-escolar-original"]);

    expect(pendentes(itens)).toEqual([
      "historico-escolar-original",
      "rg-do-aluno",
    ]);
  });

  it("só o laudo médico é opcional", () => {
    const opcionais = DOCUMENTOS_DA_MATRICULA.filter(ehOpcional);
    expect(opcionais).toEqual(["laudo-medico"]);
  });

  it("salvar um campo não apaga os outros", () => {
    // O apagamento seria silencioso: salvar uma observação levaria junto a
    // pasta do Drive, e ninguém notaria até precisar do documento.
    const anterior = {
      itens: { "rg-do-aluno": { entregue: true, em: "2026-02-10", porNome: "Ana" } },
      pastaDoDrive: "1AbC-dEfGhIjKlMnOpQrStUvWxYz0123",
      observacoes: "cópia simples",
      origem: "portal",
    };

    const depois = {
      ...baseDaEntrega("26031", anterior),
      observacoes: "trouxe a autenticada",
    };

    expect(depois.pastaDoDrive).toBe("1AbC-dEfGhIjKlMnOpQrStUvWxYz0123");
    expect(depois.itens).toEqual(anterior.itens);
    expect(depois.observacoes).toBe("trouxe a autenticada");
  });

  it("aluno sem conferência nenhuma parte do zero", () => {
    expect(baseDaEntrega("26031", null)).toEqual({
      matricula: "26031",
      itens: {},
      pastaDoDrive: null,
      observacoes: null,
      origem: "portal",
    });
  });

  it("marcação ausente é o mesmo que não entregue", () => {
    expect(foiEntregue({}, "rg-do-aluno")).toBe(false);
    expect(
      foiEntregue(
        { "rg-do-aluno": { entregue: false, em: null, porNome: null } },
        "rg-do-aluno",
      ),
    ).toBe(false);
  });
});

describe("marcar", () => {
  it("guarda quem marcou e quando", () => {
    const m = marcar(true, "Cristiana", "2026-02-03T12:00:00.000Z");

    expect(m).toEqual({
      entregue: true,
      em: "2026-02-03T12:00:00.000Z",
      porNome: "Cristiana",
    });
  });

  it("desmarcar limpa a data e o autor", () => {
    // Manter a data antiga diria que foi entregue num dia em que, segundo
    // a própria marcação, não foi.
    const m = marcar(false, "Cristiana");

    expect(m.entregue).toBe(false);
    expect(m.em).toBeNull();
    expect(m.porNome).toBeNull();
  });
});
