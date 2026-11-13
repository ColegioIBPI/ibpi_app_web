import { describe, expect, it } from "vitest";

import { navegacaoDisponivelPara, navegacaoPara } from "@/core/auth/navegacao";
import { areaDoPerfil, pode, ROLES } from "@/core/auth/roles";

const rotulos = (role: Parameters<typeof navegacaoPara>[0]) =>
  navegacaoPara(role).map((item) => item.rotulo);

describe("navegacaoPara", () => {
  it("financeiro vê só o financeiro e o cadastro", () => {
    // Recibo entra aqui com recurso próprio: quem recebe o dinheiro emite.
    // Configurações **não** entra: monta a estrutura do ano e exige
    // `gerenciar` em cadastros, que o financeiro não tem.
    expect(rotulos("financeiro")).toEqual([
      "Alunos",
      "Avisos",
      "Financeiro",
      "Recibos",
    ]);
  });

  it("quem publica aviso não publica material institucional", () => {
    // Informações úteis é calendário, proposta pedagógica, critérios de
    // avaliação: sai da secretaria e da coordenação, não de quem apenas
    // comunica.
    expect(rotulos("financeiro")).not.toContain("Informações úteis");
    expect(rotulos("professor")).not.toContain("Informações úteis");
  });

  it("professor não vê financeiro nem gestão de turmas", () => {
    const itens = rotulos("professor");
    expect(itens).toContain("Frequência");
    expect(itens).toContain("Diário de classe");
    expect(itens).toContain("Notas");
    expect(itens).toContain("Ocorrências");
    expect(itens).not.toContain("Financeiro");
    // Turmas e Disciplinas exigem gerenciar cadastro, que o professor não
    // tem — ele chega às disciplinas pelo diário de classe.
    expect(itens).not.toContain("Turmas");
    expect(itens).not.toContain("Disciplinas");
    expect(itens).not.toContain("Responsáveis");
    expect(itens).not.toContain("Professores");
  });

  it("secretaria vê todos os itens de gestão", () => {
    expect(rotulos("secretaria")).toEqual([
      "Alunos",
      "Responsáveis",
      "Professores",
      "Turmas",
      "Disciplinas",
      "Documentos",
      "Frequência",
      "Diário de classe",
      "Ocorrências",
      "Notas",
      "Boletins",
      "Avisos",
      "Solicitações",
      "Informações úteis",
      "Financeiro",
      "Usuários",
      "Configurações",
      "Recibos",
    ]);
  });

  it("a administração vê todos os itens de gestão", () => {
    // A chave mestra não pode ter menos porta que a secretaria.
    const daSecretaria = new Set(rotulos("secretaria"));
    const doAdmin = rotulos("admin");

    for (const item of daSecretaria) expect(doAdmin).toContain(item);
    expect(doAdmin).toContain("Financeiro");
  });

  it("aluno não vê financeiro, mas tem a aba de ocorrências", () => {
    // Ocorrências entrou quando a escola passou a poder **autorizar** a
    // publicação caso a caso. A aba existe; o que ele lê lá dentro é só o
    // que foi marcado para ele — o recorte é por documento, não por menu.
    expect(rotulos("aluno")).toEqual([
      "Avisos",
      "Boletim",
      "Frequência",
      "Ocorrências",
      "Carteirinha",
      "Informações úteis",
    ]);
    expect(rotulos("aluno")).not.toContain("Financeiro");
  });

  it("responsável vê tudo da área de consulta", () => {
    expect(rotulos("responsavel")).toEqual([
      "Avisos",
      "Boletim",
      "Frequência",
      "Ocorrências",
      "Carteirinha",
      "Financeiro",
      "Solicitações",
      "Informações úteis",
    ]);
  });

  it("a coordenação não vê o financeiro", () => {
    // Ela é pedagógica: responde por nota, falta e disciplina. O que a
    // família deve não entra nessa conversa.
    const itens = rotulos("coordenacao");

    expect(itens).not.toContain("Financeiro");
    // Recibos continua: ela confere e reimprime a 2ª via do que já foi
    // pago no balcão. O que ela perdeu é o que a família **deve**.
    expect(itens).toContain("Recibos");
    expect(itens).toContain("Boletins");
  });

  it("o inspetor vê a frequência e nada além do que a chamada precisa", () => {
    expect(rotulos("inspetor")).toEqual([
      "Alunos",
      "Frequência",
      "Ocorrências",
    ]);
  });

  it("o inspetor não abre o diário, que é da alocação", () => {
    // Ele faz a chamada do dia em qualquer turma, mas não leciona: o
    // diário abriria vazio, e item de menu sem conteúdo ensina a ignorar
    // o menu.
    expect(rotulos("inspetor")).not.toContain("Diário de classe");
    expect(rotulos("inspetor")).not.toContain("Notas");
    expect(rotulos("inspetor")).not.toContain("Boletins");
    expect(rotulos("inspetor")).not.toContain("Financeiro");
    expect(rotulos("inspetor")).not.toContain("Solicitações");
  });

  it("cada perfil só recebe itens da própria área", () => {
    for (const role of ROLES) {
      const area = areaDoPerfil(role);
      for (const item of navegacaoPara(role)) {
        expect(item.area).toBe(area);
      }
    }
  });

  it("nenhum item aparece para quem não tem permissão no recurso", () => {
    for (const role of ROLES) {
      for (const item of navegacaoPara(role)) {
        expect(pode(role, item.recurso, item.minimo)).toBe(true);
      }
    }
  });

  it("todo perfil tem ao menos um item de menu", () => {
    for (const role of ROLES) {
      expect(navegacaoPara(role).length).toBeGreaterThan(0);
    }
  });
});

describe("navegacaoDisponivelPara", () => {
  it("devolve só o que já foi implementado", () => {
    for (const role of ROLES) {
      for (const item of navegacaoDisponivelPara(role)) {
        expect(item.disponivel).toBe(true);
      }
    }
  });

  it("é sempre um subconjunto do que o perfil tem direito de ver", () => {
    for (const role of ROLES) {
      const permitidos = new Set(navegacaoPara(role).map((i) => i.href));
      for (const item of navegacaoDisponivelPara(role)) {
        expect(permitidos.has(item.href)).toBe(true);
      }
    }
  });
});
