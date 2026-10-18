import { formatarTelefone, formatDate } from "@/core/lib/format";
import {
  ROTULOS_DE_SITUACAO_DA_MATRICULA,
  ROTULOS_DE_TIPO_DE_RESPONSAVEL,
  ROTULOS_DE_TURNO,
} from "@/core/modelo";
import type { AlunoComId } from "@/features/alunos/services/alunos.server";
import { rotuloDoCurso } from "@/features/cursos/domain/curso";
import { formatarCPF } from "@/features/financeiro/domain/abertas";
import type { ResponsavelComId } from "@/features/responsaveis/services/responsaveis.server";

/**
 * Ficha cadastral do aluno, para imprimir.
 *
 * Reproduz a folha que o colégio já usa — os mesmos blocos, na mesma
 * ordem, porque é assim que a secretaria lê e confere. Mudar a organização
 * criaria atrito sem ganho, como na ficha de tela.
 *
 * **Campo vazio aparece como linha em branco, e não some.** A ficha é
 * impressa para ser preenchida à mão no que falta; esconder o que está
 * vazio tiraria justamente o espaço onde se escreve.
 */
export function FichaCadastral({
  aluno,
  responsaveis,
  cursos,
}: {
  aluno: AlunoComId;
  responsaveis: ResponsavelComId[];
  cursos: Array<{ codigo: string; nome: string }>;
}) {
  const { contato, documentos, filiacao } = aluno;

  return (
    <article className="ficha text-[11px]">
      <header className="border-ink/40 mb-3 flex items-end justify-between border-b pb-2">
        <h1 className="text-ink text-sm font-bold">
          Colégio IBPI · Ficha Cadastral
        </h1>
        <p className="text-ink-muted">
          {rotuloDoCurso(aluno.segmento, cursos)}
        </p>
      </header>

      <Bloco>
        <Campo rotulo="Matrícula" valor={aluno.matricula} />
        <Campo
          rotulo="Data de matrícula"
          valor={aluno.dataMatricula ? formatDate(aluno.dataMatricula) : null}
        />
        <Campo rotulo="INEP" valor={documentos?.codigoINEP} />
        <Campo
          rotulo="Situação"
          valor={ROTULOS_DE_SITUACAO_DA_MATRICULA[aluno.situacaoMatricula]}
        />
      </Bloco>

      <Bloco>
        <Campo rotulo="Curso" valor={rotuloDoCurso(aluno.segmento, cursos)} />
        <Campo rotulo="Etapa / série" valor={aluno.serie} />
        <Campo
          rotulo="Turno"
          valor={aluno.turno ? ROTULOS_DE_TURNO[aluno.turno] : null}
        />
        <Campo rotulo="Turma" valor={aluno.turmaCodigo} />
      </Bloco>

      <Bloco>
        <Campo rotulo="Aluno" valor={aluno.nome} span={3} />
        <Campo
          rotulo="Nascimento"
          valor={aluno.dataNascimento ? formatDate(aluno.dataNascimento) : null}
        />
      </Bloco>

      <Bloco>
        <Campo rotulo="Mãe" valor={filiacao?.mae} span={2} />
        <Campo rotulo="Pai" valor={filiacao?.pai} span={2} />
      </Bloco>

      <Bloco>
        <Campo rotulo="Nacionalidade" valor={documentos?.nacionalidade} />
        <Campo rotulo="Naturalidade" valor={documentos?.naturalidade} />
        <Campo rotulo="UF natural" valor={documentos?.ufNaturalidade} />
        <Campo rotulo="CPF" valor={formatarCPF(aluno.cpf)} />
      </Bloco>

      <Titulo>Certidão</Titulo>
      <Bloco>
        <Campo rotulo="Termo" valor={documentos?.certidaoTermo} />
        <Campo rotulo="Folha" valor={documentos?.certidaoFolha} />
        <Campo rotulo="Livro" valor={documentos?.certidaoLivro} />
        <Campo rotulo="Cartório" valor={documentos?.cartorio} />
      </Bloco>

      <Titulo>Identidade</Titulo>
      <Bloco>
        <Campo rotulo="Número" valor={documentos?.identidade} />
        <Campo
          rotulo="Emissão"
          valor={
            documentos?.dataEmissao ? formatDate(documentos.dataEmissao) : null
          }
        />
        <Campo rotulo="Órgão emissor" valor={documentos?.orgaoEmissor} />
        <Campo rotulo="UF emissor" valor={documentos?.ufEmissor} />
      </Bloco>

      <Titulo>Contato</Titulo>
      <Bloco>
        <Campo
          rotulo="Telefones"
          valor={(contato?.telefones ?? []).map(formatarTelefone).join("  ·  ")}
          span={2}
        />
        <Campo
          rotulo="E-mails"
          valor={(contato?.emails ?? []).join("  ·  ")}
          span={2}
        />
      </Bloco>

      <Bloco>
        <Campo rotulo="Endereço" valor={contato?.endereco?.logradouro} span={3} />
        <Campo rotulo="Complemento" valor={contato?.endereco?.complemento} />
      </Bloco>

      <Bloco>
        <Campo rotulo="CEP" valor={contato?.endereco?.cep} />
        <Campo rotulo="Bairro" valor={contato?.endereco?.bairro} />
        <Campo rotulo="Cidade" valor={contato?.endereco?.cidade} />
        <Campo rotulo="UF" valor={contato?.endereco?.uf} />
      </Bloco>

      <Titulo>Responsáveis</Titulo>
      {/*
        Duas linhas de responsável mesmo quando há um só: a folha é
        preenchida à mão quando o segundo aparece, e uma ficha sem a linha
        vazia obriga a reimprimir.
      */}
      {[0, 1].map((indice) => {
        const responsavel = responsaveis[indice];

        return (
          <Bloco key={indice}>
            <Campo rotulo="Responsável" valor={responsavel?.nome} span={2} />
            <Campo rotulo="Parentesco" valor={responsavel?.parentesco} />
            <Campo rotulo="CPF" valor={formatarCPF(responsavel?.cpf)} />
            <Campo
              rotulo="Tipo"
              valor={
                responsavel
                  ? ROTULOS_DE_TIPO_DE_RESPONSAVEL[responsavel.tipo ?? "ambos"]
                  : null
              }
            />
            <Campo
              rotulo="Telefone"
              valor={
                responsavel?.telefone
                  ? formatarTelefone(responsavel.telefone)
                  : null
              }
            />
            <Campo rotulo="E-mail" valor={responsavel?.email} span={2} />
          </Bloco>
        );
      })}

      <Titulo>Observações</Titulo>
      <p className="border-ink/30 min-h-[3.5rem] border-b whitespace-pre-wrap">
        {aluno.observacoes}
      </p>

      <p className="text-ink-muted mt-3 text-[10px]">
        Emitido em {formatDate(new Date())}.
      </p>
    </article>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-ink mt-3 mb-1 text-[11px] font-bold uppercase">
      {children}
    </h2>
  );
}

/**
 * Uma faixa de campos. Sempre quatro colunas — é a largura que o formulário
 * do colégio usa, e em retrato ela cabe sem apertar.
 */
function Bloco({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 grid grid-cols-4 gap-x-3 gap-y-1.5">{children}</div>
  );
}

/**
 * Um campo da ficha: rótulo pequeno em cima, valor sobre uma linha.
 *
 * A linha fica mesmo sem valor — é onde a secretaria escreve à mão o que o
 * cadastro ainda não tem.
 */
function Campo({
  rotulo,
  valor,
  span = 1,
}: {
  rotulo: string;
  valor?: string | null;
  span?: number;
}) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <span className="text-ink-muted block text-[9px] uppercase">
        {rotulo}
      </span>
      <span className="border-ink/30 text-ink block min-h-[1.1rem] border-b">
        {valor || " "}
      </span>
    </div>
  );
}
