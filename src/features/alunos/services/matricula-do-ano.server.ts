import "server-only";

import { getAdminDb } from "@/core/firebase/admin";
import { COLECOES } from "@/core/modelo";
import {
  camposDaSituacao,
  idDaMatriculaDoAno,
  type SituacaoParaOAno,
} from "@/features/alunos/domain/matricula-do-ano";

/**
 * Manter o registro de matrícula do ano em dia.
 *
 * O cadastro do aluno guarda **o estado de hoje**; o registro do ano
 * guarda o que foi daquele ano. Quando a secretaria encerra uma
 * matrícula, as duas coisas mudam — e se só o cadastro mudasse, a ata de
 * 2026 sairia, em 2027, com a situação de 2027.
 *
 * Mora aqui, e não dentro de cada ação, porque são **três telas** que
 * encerram matrícula: a situação em lote, a ficha do aluno e, no futuro,
 * qualquer outra. Três cópias da mesma gravação são três lugares para
 * uma delas ficar para trás.
 */

/**
 * Leva a situação para o registro daquele ano.
 *
 * **Só atualiza o que existe.** Criar o registro aqui exigiria turma,
 * segmento e turno, que esta ação não tem — e um documento pela metade
 * quebraria a leitura de quem espera o registro inteiro. Aluno sem
 * registro no ano já aparece como "fora do ano" na lista, que é onde a
 * secretaria vê o problema.
 *
 * Devolve se gravou, para quem precisar contar.
 */
export async function propagarSituacaoParaOAno(
  anoLetivo: number,
  matricula: string,
  situacao: SituacaoParaOAno,
): Promise<boolean> {
  const referencia = getAdminDb()
    .collection(COLECOES.matriculas)
    .doc(idDaMatriculaDoAno(anoLetivo, matricula));

  const registro = await referencia.get();
  if (!registro.exists) return false;

  await referencia.update(camposDaSituacao(situacao));

  return true;
}
