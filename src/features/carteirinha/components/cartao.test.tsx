import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Cartao, type DadosDoCartao } from "@/features/carteirinha/components/cartao";
import { validadeDaCarteirinha } from "@/features/carteirinha/domain/carteirinha";

const ALUNO: DadosDoCartao = {
  matricula: "22022",
  nome: "Francisco Gobato Camargos",
  turmaCodigo: "EM3A",
  serie: "3",
  turno: "manha",
  curso: "Ensino Médio",
  dataNascimento: "2009-03-14",
  fotoPath: "alunos/22022/foto.webp",
  fotoAtualizadaEm: "2026-02-01T10:00:00.000Z",
};

const validade = (situacao: "ativa" | "cancelada", hoje = "2026-10-20") =>
  validadeDaCarteirinha({ situacaoMatricula: situacao }, 2026, hoje);

describe("carteirinha válida", () => {
  it("mostra o que a portaria lê: nome, turma e matrícula", () => {
    render(
      <Cartao aluno={ALUNO} anoLetivo={2026} validade={validade("ativa")} />,
    );

    expect(screen.getByText("Francisco Gobato Camargos")).toBeInTheDocument();
    expect(screen.getByText("3ª série · EM3A · Manhã")).toBeInTheDocument();
    expect(screen.getByText("22022")).toBeInTheDocument();
    expect(screen.getByText("31/12/2026")).toBeInTheDocument();
  });

  it("não leva aviso nenhum", () => {
    render(
      <Cartao aluno={ALUNO} anoLetivo={2026} validade={validade("ativa")} />,
    );

    expect(screen.queryByText(/Sem validade/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sem foto/)).not.toBeInTheDocument();
  });
});

describe("carteirinha sem validade", () => {
  it("continua sendo desenhada, com o motivo por cima", () => {
    // Esconder a tela não explicaria nada a quem está na portaria; deixar
    // o cartão bonito transformaria o sistema em emissor de documento
    // falso. O cartão aparece, e o aviso vem antes dos dados.
    render(
      <Cartao aluno={ALUNO} anoLetivo={2026} validade={validade("cancelada")} />,
    );

    expect(
      screen.getByText("Sem validade — Matrícula cancelada"),
    ).toBeInTheDocument();
    expect(screen.getByText("Francisco Gobato Camargos")).toBeInTheDocument();
  });

  it("o aviso vem antes dos dados do aluno", () => {
    const { container } = render(
      <Cartao aluno={ALUNO} anoLetivo={2026} validade={validade("cancelada")} />,
    );

    const texto = container.textContent ?? "";
    expect(texto.indexOf("Sem validade")).toBeLessThan(
      texto.indexOf("Francisco"),
    );
  });
});

describe("cadastro sem foto", () => {
  it("avisa quem vai mostrar o cartão", () => {
    // Hoje é o caso de quase todo o colégio: 1 de 63 alunos tem foto. Um
    // cartão sem foto não identifica ninguém, e quem vai mostrá-lo precisa
    // saber disso antes de chegar na portaria.
    render(
      <Cartao
        aluno={{ ...ALUNO, fotoPath: null, fotoAtualizadaEm: null }}
        anoLetivo={2026}
        validade={validade("ativa")}
      />,
    );

    expect(screen.getByText(/Sem foto no cadastro/)).toBeInTheDocument();
    // E mostra as iniciais no lugar da imagem.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("cadastro incompleto", () => {
  it("sem turma e sem série, marca a ausência em vez de sumir", () => {
    render(
      <Cartao
        aluno={{ ...ALUNO, turmaCodigo: null, serie: null, turno: null }}
        anoLetivo={2026}
        validade={validade("ativa")}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("sem data de nascimento, o campo continua existindo", () => {
    render(
      <Cartao
        aluno={{ ...ALUNO, dataNascimento: null }}
        anoLetivo={2026}
        validade={validade("ativa")}
      />,
    );

    expect(screen.getByText("Nascimento")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
