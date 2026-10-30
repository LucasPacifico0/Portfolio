"""
export_projects.py — MySQL → data/projects.json

Lê a VIEW v_portfolio_projects e gera o JSON que o front-end consome.
Assim o site continua 100% estático (rápido, hospedável no GitHub Pages)
e o banco MySQL é a fonte da verdade.

Uso:
    pip install mysql-connector-python
    # configure as variáveis de ambiente (ou edite os defaults abaixo)
    export DB_HOST=localhost DB_USER=root DB_PASS=senha DB_NAME=portfolio
    python scripts/export_projects.py
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date
from pathlib import Path

try:
    import mysql.connector
except ImportError:
    sys.exit("Instale o driver:  pip install mysql-connector-python")

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "data" / "projects.json"

DB = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", "3306")),
    "user":     os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", ""),
    "database": os.getenv("DB_NAME", "portfolio"),
}

JSON_COLUMNS = ("categories", "stack", "metrics")


def fetch_projects() -> list[dict]:
    conn = mysql.connector.connect(**DB)
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM v_portfolio_projects")
        rows = cur.fetchall()
    finally:
        conn.close()

    projects = []
    for row in rows:
        row.pop("id", None)
        for col in JSON_COLUMNS:  # MySQL devolve JSON como string
            value = row.get(col)
            row[col] = json.loads(value) if isinstance(value, (str, bytes)) else (value or [])
        row["is_featured"] = bool(row["is_featured"])
        # JSON_ARRAYAGG não garante ordem → ordena pelo display_order do banco
        row["stack"].sort(key=lambda t: t.get("order", 0))
        row["metrics"].sort(key=lambda m: m.get("order", 0))
        for tech in row["stack"]:
            tech["highlight"] = bool(tech.get("highlight"))
            tech.pop("order", None)
        for metric in row["metrics"]:
            metric.pop("order", None)
        projects.append(row)
    return projects


def main() -> None:
    projects = fetch_projects()
    payload = {"generated_at": date.today().isoformat(), "projects": projects}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(projects)} projeto(s) exportado(s) para {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
