/**
 * Perfis de acesso e matriz de permissões.
 *
 * Esta é a única fonte de verdade sobre "quem pode o quê" no lado do
 * aplicativo. As Security Rules do Firestore (`firestore.rules`) repetem a
 * mesma matriz no servidor — o cliente é substituível, então a restrição não
 * pode viver só aqui. Ao mudar uma linha desta tabela, mude a regra também.
 *
 * Os seis perfis são os mesmos do app MyIBPI. Ver README, seção 3.
 */

export const ROLES = [
  "aluno",
  "responsavel",
  "professor",
  "secretaria",
  "coordenacao",
  "financeiro",
] as const;

export type Role = (typeof ROLES)[number];

/** Recursos protegidos do sistema. */
export type Recurso =
  "cadastros" | "frequencia" | "ocorrencias" | "notas" | "financeiro";

/**
 * Níveis de acesso, cumulativos: quem gerencia também lança, quem lança
 * também lê. Guardar um nível por recurso, em vez de uma lista de ações,
 * evita a matriz ficar incoerente (alguém com "gerenciar" mas sem "ler").
 */
export type Nivel = "nenhum" | "ler" | "lancar" | "gerenciar";

const ORDEM: Record<Nivel, number> = {
  nenhum: 0,
  ler: 1,
  lancar: 2,
  gerenciar: 3,
};

const PERMISSOES: Record<Role, Record<Recurso, Nivel>> = {
  secretaria: {
    cadastros: "gerenciar",
    frequencia: "lancar",
    ocorrencias: "lancar",
    notas: "gerenciar",
    financeiro: "ler",
  },
  coordenacao: {
    cadastros: "gerenciar",
    frequencia: "lancar",
    ocorrencias: "lancar",
    notas: "gerenciar",
    financeiro: "ler",
  },
  // Quem cuida de mensalidade não precisa ver nota, falta nem ocorrência
  // disciplinar. Lê o cadastro apenas para contato e cobrança.
  financeiro: {
    cadastros: "ler",
    frequencia: "nenhum",
    ocorrencias: "nenhum",
    notas: "nenhum",
    financeiro: "lancar",
  },
  professor: {
    cadastros: "ler",
    frequencia: "lancar",
    ocorrencias: "lancar",
    notas: "lancar",
    financeiro: "nenhum",
  },
  aluno: {
    cadastros: "ler",
    frequencia: "ler",
    ocorrencias: "nenhum",
    notas: "ler",
    financeiro: "nenhum",
  },
  responsavel: {
    cadastros: "ler",
    frequencia: "ler",
    ocorrencias: "ler",
    notas: "ler",
    financeiro: "ler",
  },
};

/**
 * Até onde cada perfil enxerga.
 *
 * Complementa a matriz acima: o professor "lê frequência", mas só a dos
 * alunos das turmas que leciona. Sem esse recorte, permissão de leitura
 * viraria acesso à escola inteira.
 */
export type EscopoDeAlunos =
  "todos" | "turmas-lecionadas" | "filhos" | "proprio";

const ESCOPOS: Record<Role, EscopoDeAlunos> = {
  secretaria: "todos",
  coordenacao: "todos",
  financeiro: "todos",
  professor: "turmas-lecionadas",
  responsavel: "filhos",
  aluno: "proprio",
};

/** Área de navegação. É divisão de layout, não um perfil a mais. */
export type Area = "gestao" | "consulta";

const AREAS: Record<Role, Area> = {
  secretaria: "gestao",
  coordenacao: "gestao",
  financeiro: "gestao",
  professor: "gestao",
  aluno: "consulta",
  responsavel: "consulta",
};

const ROTULOS: Record<Role, string> = {
  aluno: "Aluno",
  responsavel: "Responsável",
  professor: "Professor",
  secretaria: "Secretaria",
  coordenacao: "Coordenação",
  financeiro: "Financeiro",
};

/** Verifica se um valor vindo do banco ou do token é um perfil conhecido. */
export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/** Nível de acesso do perfil em um recurso. */
export function nivelDeAcesso(role: Role, recurso: Recurso): Nivel {
  return PERMISSOES[role][recurso];
}

/**
 * O perfil pode executar a ação no recurso?
 *
 * `pode("secretaria", "cadastros", "ler")` é verdadeiro porque quem gerencia
 * também lê.
 */
export function pode(
  role: Role,
  recurso: Recurso,
  acao: Exclude<Nivel, "nenhum">,
): boolean {
  return ORDEM[PERMISSOES[role][recurso]] >= ORDEM[acao];
}

/** O recurso deve aparecer no menu deste perfil? */
export function podeVer(role: Role, recurso: Recurso): boolean {
  return pode(role, recurso, "ler");
}

export function escopoDeAlunos(role: Role): EscopoDeAlunos {
  return ESCOPOS[role];
}

export function areaDoPerfil(role: Role): Area {
  return AREAS[role];
}

export function rotuloDoPerfil(role: Role): string {
  return ROTULOS[role];
}

/** Rota para onde o usuário vai logo depois de entrar. */
export function rotaInicial(role: Role): string {
  return areaDoPerfil(role) === "gestao" ? "/gestao" : "/portal";
}

/** O perfil faz parte da equipe escolar (em oposição à família)? */
export function isEquipe(role: Role): boolean {
  return areaDoPerfil(role) === "gestao";
}
