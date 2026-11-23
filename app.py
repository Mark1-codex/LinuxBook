import os
import json
import sqlite3
from pathlib import Path
from flask import Flask, jsonify, render_template, request

BASE = Path(__file__).resolve().parent
DATA_FILE = BASE / "data" / "distros.json"
DB_FILE = Path(os.environ.get("DB_PATH", BASE / "data" / "linuxbook.db"))

app = Flask(__name__)


def load_distros():
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    return []


def get_db():
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS distro_notes (
                distro_id TEXT PRIMARY KEY,
                note TEXT NOT NULL DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS distro_checklists (
                distro_id TEXT NOT NULL,
                step_index INTEGER NOT NULL,
                checked INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (distro_id, step_index)
            )
            """
        )


@app.route("/")
def index():
    distros = load_distros()
    return render_template("index.html", distros=distros, distro_count=len(distros))


@app.route("/distro/<distro_id>")
def distro_detail(distro_id):
    distros = load_distros()
    idx = next((i for i, d in enumerate(distros) if d["id"] == distro_id), None)
    if idx is None:
        return "Distribution not found", 404

    distro = distros[idx]
    prev_distro = distros[(idx - 1) % len(distros)]
    next_distro = distros[(idx + 1) % len(distros)]
    related_distros = [d for d in distros if d["id"] != distro_id and d["family"] == distro["family"]][:4]
    if len(related_distros) < 4:
        for d in distros:
            if d["id"] != distro_id and d not in related_distros:
                related_distros.append(d)
                if len(related_distros) == 4:
                    break

    with get_db() as conn:
        row = conn.execute(
            "SELECT note FROM distro_notes WHERE distro_id = ?",
            (distro_id,),
        ).fetchone()
        saved_note = row["note"] if row else ""

        rows = conn.execute(
            "SELECT step_index FROM distro_checklists WHERE distro_id = ? AND checked = 1",
            (distro_id,),
        ).fetchall()
        checked_items = [r["step_index"] for r in rows]

    template_path = f"distros/{distro_id}.html"
    return render_template(
        template_path,
        distro=distro,
        prev_distro=prev_distro,
        next_distro=next_distro,
        related_distros=related_distros,
        distro_count=len(distros),
        saved_note=saved_note,
        checked_items=checked_items,
    )


@app.post("/api/note/<distro_id>")
def save_note(distro_id):
    payload = request.get_json(silent=True) or {}
    note = str(payload.get("note", ""))
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO distro_notes (distro_id, note, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(distro_id) DO UPDATE SET
                note = excluded.note,
                updated_at = CURRENT_TIMESTAMP
            """,
            (distro_id, note),
        )
    return jsonify({"ok": True, "distro_id": distro_id, "note": note})


@app.post("/api/checklist/<distro_id>")
def save_checklist(distro_id):
    payload = request.get_json(silent=True) or {}
    step_index = int(payload.get("step_index", -1))
    checked = 1 if payload.get("checked") else 0
    if step_index < 0:
        return jsonify({"ok": False, "error": "Invalid step_index"}), 400

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO distro_checklists (distro_id, step_index, checked)
            VALUES (?, ?, ?)
            ON CONFLICT(distro_id, step_index) DO UPDATE SET
                checked = excluded.checked
            """,
            (distro_id, step_index, checked),
        )
    return jsonify({"ok": True, "distro_id": distro_id, "step_index": step_index, "checked": bool(checked)})


init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)