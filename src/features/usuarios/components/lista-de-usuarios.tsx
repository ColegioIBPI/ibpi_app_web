"use client";

import { KeyRound, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { ROLES, rotuloDoPerfil, type Role } from "@/core/auth/roles";
import type { UsuarioComId } from "@/core/modelo";
import { Button } from "@/core/ui/button";
import { SelectField } from "@/core/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/core/ui/table";
import {
  alterarPapel,
  alternarAcesso,
  linkDeSenha,
} from "@/features/usuarios/actions/usuarios";
import {
  resumoDoVinculo,
  semVinculoUtil,
} from "@/features/usuarios/domain/administracao";

/**
 * Quem tem acesso ao sistema.
 *
 * A tela responde três perguntas, nesta ordem de frequência: quem é essa
 * pessoa que está vendo o que não devia, por que fulano entra e não vê
 * nada, e como cortar o acesso de quem saiu hoje.
 *
 * Por isso o vínculo aparece na linha e a conta de família sem vínculo é
 * **marcada**: é a falha mais comum do cadastro, e descobri-la aqui é
 * melhor que descobri-la pela ligação.
 */
export function ListaDeUsuarios({
  usuarios,
  meuUid,
  podeTrocarPapel,
  podeSuspender,
}: {
  usuarios: UsuarioComId[];
  meuUid: string;
  podeTrocarPapel: boolean;
  podeSuspender: boolean;
}) {
  const router = useRouter();

  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [link, setLink] = useState<{ nome: string; url: string } | null>(null);

  async function executar(
    chave: string,
    acao: () => Promise<{ ok: boolean; erro?: string; link?: string }>,
  ) {
    setErro(null);
    setOcupado(chave);

    try {
      const resultado = await acao();

      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível concluir.");
        return null;
      }

      router.refresh();
      return resultado;
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <p
          role="alert"
          className="border-danger bg-danger-surface text-danger rounded-md border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      )}

      {link && (
        <div className="border-line bg-surface-subtle rounded-md border px-3 py-2">
          <p className="text-ink text-sm font-medium">
            Link de senha de {link.nome}
          </p>
          <p className="text-ink-muted text-xs">
            Use uma vez e expira. Passe pessoalmente ou por um canal que a
            pessoa já use — quem tiver este link define a senha dela.
          </p>
          <input
            readOnly
            aria-label={`Link de senha de ${link.nome}`}
            value={link.url}
            onFocus={(evento) => evento.target.select()}
            className="border-line bg-surface text-ink mt-2 w-full rounded-md border px-2 py-1 font-mono text-xs"
          />
          <div className="mt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setLink(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}

      <Table caption="Contas de acesso ao sistema">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Pessoa</TableHeaderCell>
            <TableHeaderCell>Perfil</TableHeaderCell>
            <TableHeaderCell>Alcance</TableHeaderCell>
            <TableHeaderCell>Acesso</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Ações</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {usuarios.map((usuario) => {
            const souEu = usuario.id === meuUid;
            const suspenso = usuario.ativo === false;
            const semVinculo = semVinculoUtil(usuario);

            return (
              <TableRow key={usuario.id}>
                <TableCell>
                  <span className="text-ink font-medium">
                    {usuario.nome}
                    {souEu && (
                      <span className="text-ink-muted ml-2 text-xs">você</span>
                    )}
                  </span>
                  <span className="text-ink-muted block text-xs">
                    {usuario.email}
                  </span>
                </TableCell>

                <TableCell>
                  {podeTrocarPapel && !souEu ? (
                    <SelectField
                      label={`Perfil de ${usuario.nome}`}
                      className="h-8 text-xs"
                      value={usuario.role}
                      disabled={ocupado !== null}
                      onChange={(evento) =>
                        executar(`papel-${usuario.id}`, () =>
                          alterarPapel({
                            uid: usuario.id,
                            role: evento.target.value as Role,
                          }),
                        )
                      }
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {rotuloDoPerfil(role)}
                        </option>
                      ))}
                    </SelectField>
                  ) : (
                    <span className="text-ink text-sm">
                      {rotuloDoPerfil(usuario.role)}
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-ink-muted text-xs">
                  {resumoDoVinculo(usuario)}
                  {semVinculo && (
                    <span className="text-warning mt-0.5 flex items-center gap-1">
                      <TriangleAlert className="size-3" aria-hidden />
                      entra e não vê nada
                    </span>
                  )}
                </TableCell>

                <TableCell>
                  <span
                    className={
                      suspenso
                        ? "text-danger text-xs font-medium"
                        : "text-success text-xs font-medium"
                    }
                  >
                    {suspenso ? "Suspenso" : "Ativo"}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex justify-end gap-2">
                    {podeSuspender && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={ocupado !== null}
                        onClick={() =>
                          executar(`senha-${usuario.id}`, async () => {
                            const resultado = await linkDeSenha(usuario.id);
                            if (resultado.ok && resultado.link) {
                              setLink({
                                nome: usuario.nome,
                                url: resultado.link,
                              });
                            }
                            return resultado;
                          })
                        }
                      >
                        <KeyRound className="size-4" aria-hidden />
                        Senha
                      </Button>
                    )}

                    {podeSuspender && !souEu && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={ocupado !== null}
                        onClick={() =>
                          executar(`acesso-${usuario.id}`, () =>
                            alternarAcesso({
                              uid: usuario.id,
                              ativo: suspenso,
                            }),
                          )
                        }
                      >
                        {suspenso ? "Reativar" : "Suspender"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <p className="text-ink-muted text-xs">
        Suspender corta o acesso <strong>no Portal e no aplicativo</strong>: a
        conta é desativada no Firebase e as sessões abertas caem. Trocar o
        perfil também derruba a sessão — a pessoa entra de novo já com o
        acesso novo.
      </p>
    </div>
  );
}
