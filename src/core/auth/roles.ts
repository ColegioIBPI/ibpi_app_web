/**
 * Perfis de acesso e matriz de permissões.
 *
 * Esta é a única fonte de verdade sobre "quem pode o quê" no lado do
 * aplicativo. As Security Rules do Firestore (`firestore.rules`) repetem a
 * mesma matriz no servidor — o cliente é substituível, então a restrição não
 * pode viver só aqui. Ao mudar uma linha desta tabela, mude a regra também.
 *
 * Os seis perfis de trabalho são os mesmos do app MyIBPI. Ver README,
 * seção 3.
 *
 * O sétimo, `admin`, é a administração do sistema: enxerga e lança em tudo.
 * Ele existe para quem mantém o Portal e para o colégio pequeno, onde a
 * mesma pessoa faz secretaria e caixa. Não é um perfil de trabalho — é a
 * chave mestra, e deve ser dada a poucas contas.
 */

export const ROLES = [
  "aluno",
  "responsavel",
  "professor",
  "secretaria",
  "coordenacao",
  "financeiro",
  "admin",
] as const;

export type Role = (typeof ROLES)[number];

/** Recursos protegidos do sistema. */
export type Recurso =
  | "cadastros"
  | "frequencia"
  | "ocorrencias"
  | "notas"
  | "financeiro"
  | "avisos"
  | "solicitacoes";

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
  // A chave mestra: tudo, no nível mais alto. Declarada por extenso, e não
  // gerada com um `map`, para o dia em que um recurso novo entrar na lista:
  // o TypeScript exige a linha aqui, e a decisão de dar o acesso fica
  // escrita em vez de acontecer sozinha.
  admin: {
    cadastros: "gerenciar",
    frequencia: "gerenciar",
    ocorrencias: "gerenciar",
    notas: "gerenciar",
    financeiro: "gerenciar",
    avisos: "gerenciar",
    solicitacoes: "gerenciar",
  },
  secretaria: {
    cadastros: "gerenciar",
    frequencia: "lancar",
    ocorrencias: "lancar",
    notas: "gerenciar",
    financeiro: "ler",
    avisos: "gerenciar",
    // Atende a fila: muda a situação do pedido e o recusa quando for o caso.
    solicitacoes: "gerenciar",
  },
  coordenacao: {
    cadastros: "gerenciar",
    frequencia: "lancar",
    ocorrencias: "lancar",
    notas: "gerenciar",
    financeiro: "ler",
    avisos: "gerenciar",
    solicitacoes: "gerenciar",
  },
  // Quem cuida de mensalidade não precisa ver nota, falta nem ocorrência
  // disciplinar. Lê o cadastro apenas para contato e cobrança.
  financeiro: {
    cadastros: "ler",
    frequencia: "nenhum",
    ocorrencias: "nenhum",
    notas: "nenhum",
    financeiro: "lancar",
    // Publica aviso de cobrança e prazo, mas não apaga o de outra pessoa.
    avisos: "lancar",
    // Pedido de declaração e de saída não passa pelo caixa.
    solicitacoes: "nenhum",
  },
  professor: {
    cadastros: "ler",
    frequencia: "lancar",
    ocorrencias: "lancar",
    notas: "lancar",
    financeiro: "nenhum",
    // Publica para as turmas que leciona — o escopo vale aqui também.
    avisos: "lancar",
    solicitacoes: "nenhum",
  },
  aluno: {
    cadastros: "ler",
    frequencia: "ler",
    ocorrencias: "nenhum",
    notas: "ler",
    financeiro: "nenhum",
    avisos: "ler",
    // Quem pede declaração, saída antecipada e 2ª chamada é o responsável.
    // O aluno é menor de idade, e o pedido é um ato do adulto por ele.
    solicitacoes: "nenhum",
  },
  responsavel: {
    cadastros: "ler",
    frequencia: "ler",
    ocorrencias: "ler",
    notas: "ler",
    financeiro: "ler",
    avisos: "ler",
    /**
     * **A única escrita da família no sistema inteiro.**
     *
     * Em todo o resto ela lê. Aqui ela abre o próprio pedido e o cancela
     * enquanto ninguém o pegou — fora isso, quem move a fila é a escola.
     * Continua valendo que nada é gravado pelo cliente: a Server Action
     * verifica o vínculo com o aluno antes de aceitar.
     */
    solicitacoes: "lancar",
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
  admin: "todos",
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
  admin: "gestao",
  secretaria: "gestao",
  coordenacao: "gestao",
  financeiro: "gestao",
  professor: "gestao",
  aluno: "consulta",
  responsavel: "consulta",
};

const ROTULOS: Record<Role, string> = {
  aluno: "Aluno",
  admin: "Administração",
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

/**
 * O perfil administra a escola inteira, sem recorte?
 *
 * É a pergunta que separa quem confere o trabalho dos outros — abre
 * qualquer alocação, publica aviso para qualquer destino, despublica o
 * aviso alheio — de quem trabalha dentro de um escopo. Professor tem as
 * turmas dele; o financeiro fala com quem paga.
 *
 * Existe como função, e não como `role === "secretaria" || role ===
 * "coordenacao"` repetido pelo código, porque foi exatamente assim que a
 * administração ficou de fora de cinco lugares quando o perfil nasceu.
 */
export function administraEscola(role: Role): boolean {
  return role === "admin" || role === "secretaria" || role === "coordenacao";
}
