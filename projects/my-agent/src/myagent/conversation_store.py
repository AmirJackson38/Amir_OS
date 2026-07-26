import sqlite3
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from .config import CONFIG_DIR


DB_PATH = CONFIG_DIR / "conversations.db"

_connection = None


def _get_conn():
    global _connection
    if _connection is None:
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        _connection = sqlite3.connect(str(DB_PATH))
        _connection.row_factory = sqlite3.Row
        _init_db()
    return _connection


def _init_db():
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'Untitled',
            route TEXT NOT NULL DEFAULT 'auto/best-chat',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('system','user','assistant')),
            content TEXT NOT NULL,
            metadata TEXT DEFAULT '{}',
            timestamp TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conversation
            ON messages(conversation_id, id);
    """)
    conn.commit()


def create_conversation(title="Untitled", route="auto/best-chat"):
    conn = _get_conn()
    cid = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO conversations (id, title, route, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (cid, title, route, now, now)
    )
    conn.commit()
    return cid


def delete_conversation(cid):
    conn = _get_conn()
    conn.execute("DELETE FROM messages WHERE conversation_id = ?", (cid,))
    conn.execute("DELETE FROM conversations WHERE id = ?", (cid,))
    conn.commit()


def rename_conversation(cid, title):
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", (title, now, cid))
    conn.commit()


def update_conversation_route(cid, route):
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("UPDATE conversations SET route = ?, updated_at = ? WHERE id = ?", (route, now, cid))
    conn.commit()


def add_message(conversation_id, role, content, metadata=None):
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()
    meta = json.dumps(metadata or {})
    conn.execute(
        "INSERT INTO messages (conversation_id, role, content, metadata, timestamp) VALUES (?, ?, ?, ?, ?)",
        (conversation_id, role, content, meta, now)
    )
    conn.execute(
        "UPDATE conversations SET updated_at = ? WHERE id = ?",
        (now, conversation_id)
    )
    conn.commit()


def get_conversation(conversation_id):
    conn = _get_conn()
    row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
    if row is None:
        return None
    return dict(row)


def get_messages(conversation_id):
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id",
        (conversation_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def list_conversations(limit=20):
    conn = _get_conn()
    rows = conn.execute(
        "SELECT id, title, route, created_at, updated_at, "
        "(SELECT COUNT(*) FROM messages WHERE conversation_id = id) as msg_count "
        "FROM conversations ORDER BY updated_at DESC LIMIT ?",
        (limit,)
    ).fetchall()
    return [dict(r) for r in rows]


def close():
    global _connection
    if _connection:
        _connection.close()
        _connection = None
