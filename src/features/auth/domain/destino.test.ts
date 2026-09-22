import { describe, expect, it } from "vitest";

import { destinoValido } from "@/features/auth/domain/destino";

describe("destinoValido", () => {
  it("aceita caminho interno", () => {
    expect(destinoValido("/gestao/alunos")).toBe("/gestao/alunos");
    expect(destinoValido("/portal")).toBe("/portal");
    expect(destinoValido("/gestao/alunos?turma=EM1A")).toBe(
      "/gestao/alunos?turma=EM1A",
    );
  });

  it("recusa URL absoluta para outro site", () => {
    expect(destinoValido("https://site-falso.example")).toBeNull();
    expect(destinoValido("http://site-falso.example")).toBeNull();
  });

  it("recusa as formas disfarçadas de URL absoluta", () => {
    // O navegador trata todas essas como "vá para outro host".
    expect(destinoValido("//site-falso.example")).toBeNull();
    expect(destinoValido("/\\site-falso.example")).toBeNull();
    expect(destinoValido("/\\/site-falso.example")).toBeNull();
  });

  it("recusa caractere de controle usado para burlar a verificação", () => {
    expect(destinoValido("/\tgestao")).toBeNull();
    expect(destinoValido("/\ngestao")).toBeNull();
    expect(destinoValido("/gestao\\..\\admin")).toBeNull();
  });

  it("recusa esquemas que executam código", () => {
    expect(destinoValido("javascript:alert(1)")).toBeNull();
    expect(destinoValido("data:text/html,<script>")).toBeNull();
  });

  it("recusa caminho relativo", () => {
    expect(destinoValido("gestao/alunos")).toBeNull();
    expect(destinoValido("../admin")).toBeNull();
  });

  it("devolve null quando não há destino", () => {
    expect(destinoValido(undefined)).toBeNull();
    expect(destinoValido(null)).toBeNull();
    expect(destinoValido("")).toBeNull();
  });
});
