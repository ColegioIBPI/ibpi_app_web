"use client";

import { useCallback, useSyncExternalStore } from "react";

import { SelectField } from "@/core/ui/field";
import {
  precisaDeSeletor,
  resolverAlunoSelecionado,
} from "@/features/auth/domain/selecao-aluno";

const CHAVE = "ibpi:aluno-selecionado";

/**
 * O `localStorage` é um sistema externo ao React, então a leitura é feita
 * com `useSyncExternalStore`: nada de ler no efeito e chamar `setState`, que
 * provoca renderização em cascata e diferença entre servidor e cliente.
 */
const ouvintes = new Set<() => void>();

function inscrever(callback: () => void) {
  ouvintes.add(callback);
  // Outra aba pode trocar o aluno; `storage` só dispara em outras abas, por
  // isso as mudanças locais avisam os ouvintes na mão.
  window.addEventListener("storage", callback);

  return () => {
    ouvintes.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function lerSalvo(): string | null {
  return window.localStorage.getItem(CHAVE);
}

/** No servidor não existe `localStorage`: ninguém está selecionado ainda. */
function lerSalvoNoServidor(): string | null {
  return null;
}

function guardar(matricula: string) {
  window.localStorage.setItem(CHAVE, matricula);
  for (const ouvinte of ouvintes) ouvinte();
}

interface SeletorDeAlunoProps {
  /** Matrículas dos filhos vinculados ao responsável. */
  vinculados: string[];
  onChange?: (matricula: string) => void;
}

/**
 * Troca o contexto de aluno para responsáveis com mais de um filho.
 *
 * A escolha fica no navegador porque é preferência de interface, não
 * permissão: quem decide o que o responsável pode ver é o vínculo no
 * servidor. Um valor adulterado aqui não abre dado de outro aluno — a
 * consulta é recusada pelas Security Rules.
 */
export function SeletorDeAluno({ vinculados, onChange }: SeletorDeAlunoProps) {
  const salvo = useSyncExternalStore(inscrever, lerSalvo, lerSalvoNoServidor);

  const selecionado = resolverAlunoSelecionado(vinculados, salvo);

  const aoTrocar = useCallback(
    (matricula: string) => {
      guardar(matricula);
      onChange?.(matricula);
    },
    [onChange],
  );

  if (!precisaDeSeletor(vinculados) || !selecionado) return null;

  return (
    <SelectField
      label="Aluno"
      value={selecionado}
      onChange={(evento) => aoTrocar(evento.target.value)}
    >
      {vinculados.map((matricula) => (
        <option key={matricula} value={matricula}>
          Matrícula {matricula}
        </option>
      ))}
    </SelectField>
  );
}
