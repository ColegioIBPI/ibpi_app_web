import { describe, expect, it } from "vitest";

import {
  arredondar,
  calcularDependencia,
  calcularLinha,
  mediaAnual,
  mediaDoTrimestre,
  mediaFinal,
  mediaParcial,
  precisaDeRecuperacao,
  situacaoDaDisciplina,
  situacaoDoAno,
} from "@/features/notas/domain/calculo";

const avaliacoes = (projeto: number | null, tarefas: number | null, av: number | null) => ({
  projeto,
  tarefas,
  av,
});

describe("mediaDoTrimestre", () => {
  it("é a média das três avaliações", () => {
    expect(mediaDoTrimestre(avaliacoes(6, 7, 8))).toBe(7);
  });

  it("arredonda para duas casas, como o boletim do colégio", () => {
    // O boletim real: Projeto 7,83 + Tarefas 10,00 + AV 7,60 = 8,48.
    expect(mediaDoTrimestre(avaliacoes(7.83, 10, 7.6))).toBe(8.48);
    expect(mediaDoTrimestre(avaliacoes(7.83, 4, 7))).toBe(6.28);
  });

  it("fica em branco enquanto faltar avaliação", () => {
    // Dividir por 3 com a AV ausente mostraria 6,7 para um aluno com 10 e
    // 10 — número que assusta a família e não significa nada.
    expect(mediaDoTrimestre(avaliacoes(10, 10, null))).toBeNull();
    expect(mediaDoTrimestre(avaliacoes(null, null, null))).toBeNull();
  });

  it("aceita zero como nota lançada", () => {
    // Zero é nota; ausente é ausente. Confundir os dois apagaria a falta de
    // um aluno que de fato zerou a prova.
    expect(mediaDoTrimestre(avaliacoes(0, 6, 6))).toBe(4);
  });

  it("não quebra sem avaliações", () => {
    expect(mediaDoTrimestre(undefined)).toBeNull();
  });
});

describe("mediaAnual", () => {
  it("é a média dos três trimestres", () => {
    expect(mediaAnual({ "1": 6, "2": 7, "3": 8 })).toBe(7);
  });

  it("fica em branco enquanto um trimestre não fechou", () => {
    expect(mediaAnual({ "1": 6, "2": 7, "3": null })).toBeNull();
    expect(mediaAnual({ "1": 6, "2": 7 })).toBeNull();
  });

  it("arredonda para duas casas", () => {
    expect(mediaAnual({ "1": 5, "2": 6, "3": 8 })).toBe(6.33);
  });
});

describe("mediaParcial", () => {
  it("é a média dos trimestres já fechados", () => {
    // É o TOTAL que o boletim do colégio estampa ao longo do ano: com só o
    // 1º trimestre lançado, lá aparece a média dele.
    expect(mediaParcial({ "1": 8.48 })).toBe(8.48);
    expect(mediaParcial({ "1": 6, "2": 8 })).toBe(7);
  });

  it("fica em branco quando nenhum trimestre fechou", () => {
    expect(mediaParcial({})).toBeNull();
    expect(mediaParcial({ "1": null, "2": null, "3": null })).toBeNull();
  });

  it("não é a média anual: ela continua exigindo os três", () => {
    // Confundir as duas marcaria um aluno como reprovado em março.
    const parciais = { "1": 4 };

    expect(mediaParcial(parciais)).toBe(4);
    expect(mediaAnual(parciais)).toBeNull();
  });

  it("com os três fechados, as duas coincidem", () => {
    const fechado = { "1": 6, "2": 7, "3": 8 };

    expect(mediaParcial(fechado)).toBe(mediaAnual(fechado));
  });
});

describe("precisaDeRecuperacao", () => {
  it("abaixo de 5,0 vai para a recuperação final", () => {
    expect(precisaDeRecuperacao(4.9)).toBe(true);
    expect(precisaDeRecuperacao(5)).toBe(false);
  });

  it("sem média anual não há decisão a tomar", () => {
    expect(precisaDeRecuperacao(null)).toBe(false);
  });
});

describe("mediaFinal", () => {
  it("a recuperação entra numa nova média, não substitui a anual", () => {
    // Confirmado com a direção: (média anual + rec) ÷ 2.
    expect(mediaFinal(4, 8)).toBe(6);
  });

  it("sem recuperação a média final é a própria anual", () => {
    expect(mediaFinal(7.5, null)).toBe(7.5);
  });

  it("sem média anual não há média final", () => {
    expect(mediaFinal(null, 8)).toBeNull();
  });
});

describe("arredondar", () => {
  it("usa duas casas decimais", () => {
    expect(arredondar(4.996)).toBe(5);
    expect(arredondar(4.994)).toBe(4.99);
    expect(arredondar(8.477777)).toBe(8.48);
  });
});

describe("situacaoDaDisciplina", () => {
  const base = { recuperacao: null, percentualDeFrequencia: 1 };

  it("enquanto o ano não fecha, o aluno está cursando", () => {
    expect(
      situacaoDaDisciplina({ ...base, mediaAnual: null }),
    ).toBe("cursando");
  });

  it("média 5,0 com frequência aprova", () => {
    expect(situacaoDaDisciplina({ ...base, mediaAnual: 5 })).toBe("aprovado");
  });

  it("média abaixo de 5,0 manda para a recuperação, não reprova", () => {
    // A diferença importa: é o que a secretaria usa para convocar as finais.
    expect(situacaoDaDisciplina({ ...base, mediaAnual: 4.9 })).toBe(
      "recuperacao",
    );
  });

  it("a recuperação pode salvar o aluno", () => {
    expect(
      situacaoDaDisciplina({ ...base, mediaAnual: 4, recuperacao: 8 }),
    ).toBe("aprovado");
  });

  it("recuperação insuficiente reprova", () => {
    expect(
      situacaoDaDisciplina({ ...base, mediaAnual: 4, recuperacao: 5 }),
    ).toBe("reprovado");
  });

  it("frequência abaixo de 75% reprova mesmo com média boa", () => {
    expect(
      situacaoDaDisciplina({
        mediaAnual: 9,
        recuperacao: null,
        percentualDeFrequencia: 0.7,
      }),
    ).toBe("reprovado-por-falta");
  });

  it("75% exatos ainda aprova", () => {
    expect(
      situacaoDaDisciplina({
        mediaAnual: 7,
        recuperacao: null,
        percentualDeFrequencia: 0.75,
      }),
    ).toBe("aprovado");
  });

  it("sem frequência registrada a nota decide sozinha", () => {
    // No começo do ano não há o que calcular; reprovar por falta aqui
    // inventaria uma reprovação.
    expect(
      situacaoDaDisciplina({
        mediaAnual: 7,
        recuperacao: null,
        percentualDeFrequencia: null,
      }),
    ).toBe("aprovado");
  });

  it("média que arredonda para 5,00 aprova", () => {
    // O boletim estampa 5,00; dizer 'reprovado' seria indefensável.
    expect(
      situacaoDaDisciplina({ ...base, mediaAnual: arredondar(4.996) }),
    ).toBe("aprovado");
  });
});

describe("situacaoDoAno", () => {
  it("uma disciplina em curso segura o ano", () => {
    expect(situacaoDoAno(["aprovado", "cursando"])).toBe("cursando");
  });

  it("recuperação pendente segura o resultado", () => {
    expect(situacaoDoAno(["aprovado", "recuperacao"])).toBe("recuperacao");
  });

  it("uma reprovação reprova o ano", () => {
    expect(situacaoDoAno(["aprovado", "aprovado", "reprovado"])).toBe(
      "reprovado",
    );
  });

  it("reprovação por falta vale para o ano inteiro", () => {
    expect(situacaoDoAno(["aprovado", "reprovado-por-falta"])).toBe(
      "reprovado-por-falta",
    );
  });

  it("tudo aprovado aprova o ano", () => {
    expect(situacaoDoAno(["aprovado", "aprovado"])).toBe("aprovado");
  });

  it("sem disciplinas não há resultado", () => {
    expect(situacaoDoAno([])).toBe("cursando");
  });
});

describe("calcularDependencia", () => {
  it("total é P1 + P2 e a média é a metade", () => {
    expect(calcularDependencia({ p1: 6, p2: 8, recuperacao: null })).toEqual({
      total: 14,
      media: 7,
      situacao: "aprovado",
    });
  });

  it("fica em curso enquanto faltar prova", () => {
    expect(calcularDependencia({ p1: 6, p2: null, recuperacao: null })).toEqual({
      total: null,
      media: null,
      situacao: "cursando",
    });
  });

  it("média baixa vai para recuperação", () => {
    expect(
      calcularDependencia({ p1: 4, p2: 4, recuperacao: null }).situacao,
    ).toBe("recuperacao");
  });
});

describe("calcularLinha", () => {
  it("fecha a linha do boletim com os três trimestres", () => {
    const linha = calcularLinha(
      {
        "1": avaliacoes(6, 6, 6),
        "2": avaliacoes(7, 7, 7),
        "3": avaliacoes(8, 8, 8),
      },
      null,
      1,
    );

    expect(linha.mediasPorTrimestre).toEqual({ "1": 6, "2": 7, "3": 8 });
    expect(linha.mediaAnual).toBe(7);
    expect(linha.mediaFinal).toBe(7);
    expect(linha.situacao).toBe("aprovado");
  });

  it("deixa a média anual em branco com o ano em andamento", () => {
    const linha = calcularLinha({ "1": avaliacoes(6, 6, 6) }, null, 1);

    expect(linha.mediasPorTrimestre).toEqual({ "1": 6, "2": null, "3": null });
    expect(linha.mediaAnual).toBeNull();
    expect(linha.situacao).toBe("cursando");
  });

  it("aplica a recuperação no fechamento", () => {
    const linha = calcularLinha(
      {
        "1": avaliacoes(4, 4, 4),
        "2": avaliacoes(4, 4, 4),
        "3": avaliacoes(4, 4, 4),
      },
      8,
      1,
    );

    expect(linha.mediaAnual).toBe(4);
    expect(linha.mediaFinal).toBe(6);
    expect(linha.situacao).toBe("aprovado");
  });
});
