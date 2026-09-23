import {
  areaDoPerfil,
  pode,
  type Area,
  type Nivel,
  type Recurso,
  type Role,
} from "@/core/auth/roles";

/**
 * Menu do sistema, derivado da matriz de permissões.
 *
 * O item só aparece para quem tem acesso ao recurso — o menu nunca oferece
 * uma porta que o servidor vai fechar. A permissão continua sendo verificada
 * na rota; esconder o link é conveniência, não segurança.
 */

export interface ItemDeNavegacao {
  href: string;
  rotulo: string;
  area: Area;
  recurso: Recurso;
  /** Nível mínimo para o item aparecer. */
  minimo: Exclude<Nivel, "nenhum">;
  /** `false` enquanto a tela ainda não existe (ver TASKS.md). */
  disponivel: boolean;
}

const ITENS: ItemDeNavegacao[] = [
  // Gestão — secretaria, coordenação, financeiro e professor
  {
    href: "/gestao/alunos",
    rotulo: "Alunos",
    area: "gestao",
    recurso: "cadastros",
    minimo: "ler",
    disponivel: true,
  },
  {
    href: "/gestao/responsaveis",
    rotulo: "Responsáveis",
    area: "gestao",
    recurso: "cadastros",
    // Cadastro de família e criação de acesso: secretaria e coordenação.
    minimo: "gerenciar",
    disponivel: true,
  },
  {
    href: "/gestao/professores",
    rotulo: "Professores",
    area: "gestao",
    recurso: "cadastros",
    minimo: "gerenciar",
    disponivel: true,
  },
  {
    href: "/gestao/turmas",
    rotulo: "Turmas",
    area: "gestao",
    recurso: "cadastros",
    minimo: "gerenciar",
    disponivel: true,
  },
  {
    href: "/gestao/disciplinas",
    rotulo: "Disciplinas",
    area: "gestao",
    recurso: "cadastros",
    // Cadastro estrutural, como Turmas: é da secretaria e da coordenação.
    // O professor chega à lista de disciplinas pelo diário de classe, não
    // por um item de menu que ele não administra.
    minimo: "gerenciar",
    disponivel: true,
  },
  {
    href: "/gestao/frequencia",
    rotulo: "Frequência",
    area: "gestao",
    recurso: "frequencia",
    minimo: "lancar",
    disponivel: true,
  },
  {
    href: "/gestao/diario",
    rotulo: "Diário de classe",
    area: "gestao",
    recurso: "frequencia",
    minimo: "lancar",
    disponivel: true,
  },
  {
    href: "/gestao/ocorrencias",
    rotulo: "Ocorrências",
    area: "gestao",
    recurso: "ocorrencias",
    minimo: "ler",
    disponivel: true,
  },
  {
    href: "/gestao/notas",
    rotulo: "Notas",
    area: "gestao",
    recurso: "notas",
    minimo: "lancar",
    disponivel: false,
  },
  {
    href: "/gestao/avisos",
    rotulo: "Avisos",
    area: "gestao",
    recurso: "avisos",
    minimo: "lancar",
    disponivel: true,
  },
  {
    href: "/gestao/financeiro",
    rotulo: "Financeiro",
    area: "gestao",
    recurso: "financeiro",
    minimo: "ler",
    disponivel: false,
  },

  // Consulta — aluno e responsável
  {
    href: "/portal/avisos",
    rotulo: "Avisos",
    area: "consulta",
    recurso: "avisos",
    minimo: "ler",
    disponivel: true,
  },
  {
    href: "/portal/boletim",
    rotulo: "Boletim",
    area: "consulta",
    recurso: "notas",
    minimo: "ler",
    disponivel: false,
  },
  {
    href: "/portal/frequencia",
    rotulo: "Frequência",
    area: "consulta",
    recurso: "frequencia",
    minimo: "ler",
    disponivel: true,
  },
  {
    href: "/portal/ocorrencias",
    rotulo: "Ocorrências",
    area: "consulta",
    recurso: "ocorrencias",
    minimo: "ler",
    disponivel: true,
  },
  {
    href: "/portal/financeiro",
    rotulo: "Financeiro",
    area: "consulta",
    recurso: "financeiro",
    minimo: "ler",
    disponivel: false,
  },
];

/** Itens que o perfil tem direito de ver, na área dele. */
export function navegacaoPara(role: Role): ItemDeNavegacao[] {
  const area = areaDoPerfil(role);

  return ITENS.filter(
    (item) => item.area === area && pode(role, item.recurso, item.minimo),
  );
}

/** Itens já implementados — os únicos que viram link de verdade. */
export function navegacaoDisponivelPara(role: Role): ItemDeNavegacao[] {
  return navegacaoPara(role).filter((item) => item.disponivel);
}
