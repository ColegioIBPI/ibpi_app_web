"""
Extrai as tabelas do sistema Access para JSON.

    python scripts/migrate-access/extrair.py "C:/caminho/SISIBPIDADOS2026.accdb"

A saída vai para `scripts/migrate-access/data/`, que está no .gitignore —
o conteúdo é dado pessoal de menor de idade e não pode ser versionado.

Por que Python, num projeto Node? O driver do Access é ODBC e só existe no
Windows; as opções equivalentes no Node exigem compilação nativa ou o
provedor OLEDB, que nem sempre está instalado. Esta etapa roda uma vez, é
isolada do resto do sistema, e o `pyodbc` simplesmente funciona. A
transformação e a carga continuam em TypeScript, com o mesmo código testado
que a aplicação usa.

Requer: pip install pyodbc
"""

import json
import os
import sys
from datetime import date, datetime
from decimal import Decimal

import pyodbc

# Só as tabelas que têm conteúdo. As demais do Access estão vazias — ver
# docs/migracao.md.
TABELAS = [
    "Tabela_Aluno",
    "Turma",
    "Disciplina",
    "Cursos",
    "Salas",
    "Tabela_pagamento",
    "Fatos",
]

SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def serializar(valor):
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    if isinstance(valor, Decimal):
        return float(valor)
    if isinstance(valor, bytes):
        return valor.decode("utf-8", errors="replace")
    return valor


def extrair(caminho_db):
    conexao = pyodbc.connect(
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" + caminho_db + ";"
    )
    cursor = conexao.cursor()

    os.makedirs(SAIDA, exist_ok=True)
    resumo = {}

    for tabela in TABELAS:
        # `SELECT *` e não `cursor.columns()`: a leitura de metadados falha
        # em algumas tabelas deste banco com erro de decodificação UTF-16,
        # enquanto a consulta aos dados funciona normalmente.
        cursor.execute(f"SELECT * FROM [{tabela}]")
        colunas = [d[0] for d in cursor.description]

        linhas = [
            {coluna: serializar(valor) for coluna, valor in zip(colunas, linha)}
            for linha in cursor.fetchall()
        ]

        destino = os.path.join(SAIDA, f"{tabela}.json")
        with open(destino, "w", encoding="utf-8") as arquivo:
            json.dump(linhas, arquivo, ensure_ascii=False, indent=2)

        resumo[tabela] = len(linhas)
        print(f"  {len(linhas):6d}  {tabela}")

    with open(os.path.join(SAIDA, "_resumo.json"), "w", encoding="utf-8") as arquivo:
        json.dump(
            {"extraidoEm": datetime.now().isoformat(), "origem": caminho_db, "tabelas": resumo},
            arquivo,
            ensure_ascii=False,
            indent=2,
        )

    conexao.close()
    return resumo


def extrair_turmas_da_planilha(caminho_xlsx):
    """
    Lê `CONTROLE DE FALTAS.xlsx` e devolve a turma de cada aluno.

    A tabela `Alunos_Turma` do Access está vazia, então a turma é derivada do
    cadastro (curso + etapa). Esta planilha é o registro diário da secretaria
    e serve de conferência: onde as duas discordam, vence a planilha, e a
    divergência entra no relatório.

    Requer: pip install openpyxl
    """
    import openpyxl
    from collections import Counter, defaultdict

    planilha = openpyxl.load_workbook(caminho_xlsx, data_only=True, read_only=True)
    contagem = defaultdict(Counter)

    for linha in planilha["BASE"].iter_rows(min_row=7, max_col=4, values_only=True):
        turma, nome = linha[1], linha[2]
        if not turma or not nome:
            continue
        contagem[str(nome).strip()][str(turma).strip()] += 1

    # A turma mais frequente por aluno: o aluno aparece uma vez por dia de
    # registro, e uma digitação errada isolada não deve mudar a turma dele.
    return {
        nome: turmas.most_common(1)[0][0]
        for nome, turmas in contagem.items()
        if nome.upper() not in ("NOME DO ALUNO", "")
    }


if __name__ == "__main__":
    caminho = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ACCESS_DB_PATH")

    if not caminho:
        print("Informe o caminho do .accdb (argumento ou ACCESS_DB_PATH).")
        sys.exit(1)

    if not os.path.exists(caminho):
        print(f"Arquivo não encontrado: {caminho}")
        sys.exit(1)

    print(f"\nExtraindo de {caminho}\n")
    resumo = extrair(os.path.abspath(caminho))

    faltas = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("CONTROLE_FALTAS_PATH")
    if faltas and os.path.exists(faltas):
        turmas = extrair_turmas_da_planilha(faltas)
        with open(os.path.join(SAIDA, "_turmas_planilha.json"), "w", encoding="utf-8") as arquivo:
            json.dump(turmas, arquivo, ensure_ascii=False, indent=2)
        print(f"  {len(turmas):6d}  turmas da planilha de frequência")
    elif faltas:
        print(f"  aviso: planilha não encontrada em {faltas}")

    print(f"\n{sum(resumo.values())} registros em {SAIDA}\n")
