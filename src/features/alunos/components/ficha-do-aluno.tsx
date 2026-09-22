import {
  ROTULOS_DE_SEGMENTO,
  ROTULOS_DE_TURNO,
  type Segmento,
  type Turno,
} from "@/core/modelo";
import { Card } from "@/core/ui/card";
import { formatDate } from "@/core/lib/format";
import type { AlunoComId } from "@/features/alunos/services/alunos.server";

/**
 * Ficha do aluno, nos mesmos blocos do cadastro do Access — é como a
 * secretaria já pensa a informação, e mudar a organização só criaria
 * atrito sem ganho.
 */

interface Campo {
  rotulo: string;
  valor: string | null | undefined;
}

export function FichaDoAluno({ aluno }: { aluno: AlunoComId }) {
  const { contato, documentos, filiacao } = aluno;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Bloco
        titulo="Identificação"
        campos={[
          { rotulo: "Matrícula", valor: aluno.matricula },
          { rotulo: "Nome", valor: aluno.nome },
          { rotulo: "Nascimento", valor: data(aluno.dataNascimento) },
          { rotulo: "CPF", valor: cpf(aluno.cpf) },
          { rotulo: "Nacionalidade", valor: documentos?.nacionalidade },
          {
            rotulo: "Naturalidade",
            valor: juntar(
              [documentos?.naturalidade, documentos?.ufNaturalidade],
              " / ",
            ),
          },
        ]}
      />

      <Bloco
        titulo="Matrícula"
        campos={[
          { rotulo: "Turma", valor: aluno.turmaCodigo },
          {
            rotulo: "Segmento",
            valor: aluno.segmento
              ? ROTULOS_DE_SEGMENTO[aluno.segmento as Segmento]
              : null,
          },
          { rotulo: "Série", valor: aluno.serie },
          {
            rotulo: "Turno",
            valor: aluno.turno ? ROTULOS_DE_TURNO[aluno.turno as Turno] : null,
          },
          { rotulo: "Data da matrícula", valor: data(aluno.dataMatricula) },
          {
            rotulo: "Situação",
            valor: aluno.ativo ? "Matriculado" : "Ex-aluno",
          },
        ]}
      />

      <Bloco
        titulo="Contato"
        campos={[
          { rotulo: "E-mails", valor: juntar(contato?.emails, ", ") },
          {
            rotulo: "Telefones",
            valor: juntar(contato?.telefones?.map(telefone), " · "),
          },
          {
            rotulo: "Endereço",
            valor: juntar(
              [
                contato?.endereco?.logradouro,
                contato?.endereco?.complemento,
                contato?.endereco?.bairro,
              ],
              ", ",
            ),
          },
          {
            rotulo: "Cidade",
            valor: juntar(
              [contato?.endereco?.cidade, contato?.endereco?.uf],
              " / ",
            ),
          },
          { rotulo: "CEP", valor: contato?.endereco?.cep },
        ]}
      />

      <Bloco
        titulo="Filiação"
        campos={[
          { rotulo: "Mãe", valor: filiacao?.mae },
          { rotulo: "Pai", valor: filiacao?.pai },
        ]}
      />

      <Bloco
        titulo="Documentos"
        campos={[
          { rotulo: "Identidade", valor: documentos?.identidade },
          {
            rotulo: "Órgão emissor",
            valor: juntar(
              [documentos?.orgaoEmissor, documentos?.ufEmissor],
              " / ",
            ),
          },
          { rotulo: "Emissão", valor: data(documentos?.dataEmissao) },
          { rotulo: "Certidão — termo", valor: documentos?.certidaoTermo },
          { rotulo: "Certidão — folha", valor: documentos?.certidaoFolha },
          { rotulo: "Certidão — livro", valor: documentos?.certidaoLivro },
          {
            rotulo: "Cartório",
            valor: juntar(
              [documentos?.cartorio, documentos?.ufCartorio],
              " / ",
            ),
          },
          { rotulo: "Código INEP", valor: documentos?.codigoINEP },
        ]}
      />

      <Bloco
        titulo="Observações"
        campos={[{ rotulo: "Anotações", valor: aluno.observacoes }]}
      />
    </div>
  );
}

function Bloco({ titulo, campos }: { titulo: string; campos: Campo[] }) {
  const preenchidos = campos.filter((campo) => campo.valor);

  return (
    <Card title={titulo}>
      {preenchidos.length === 0 ? (
        <p className="text-ink-muted text-sm">Sem informação cadastrada.</p>
      ) : (
        <dl className="divide-line divide-y text-sm">
          {preenchidos.map((campo) => (
            <div
              key={campo.rotulo}
              className="grid grid-cols-[10rem_1fr] gap-3 py-2"
            >
              <dt className="text-ink-muted">{campo.rotulo}</dt>
              <dd className="text-ink break-words">{campo.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

function juntar(
  valores: (string | null | undefined)[] | undefined,
  separador: string,
): string | null {
  const limpos = (valores ?? []).filter(Boolean);
  return limpos.length > 0 ? limpos.join(separador) : null;
}

function data(valor: string | null | undefined): string | null {
  return valor ? formatDate(valor) : null;
}

/** `01719425078` → `017.194.250-78` */
function cpf(valor: string | null | undefined): string | null {
  if (!valor || valor.length !== 11) return valor ?? null;

  return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
}

/** `+5521999998888` → `(21) 99999-8888` */
function telefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").replace(/^55/, "");

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }

  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return valor;
}
