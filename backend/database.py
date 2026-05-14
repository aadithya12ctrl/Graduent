"""
database.py — SQLite connection and schema initialization.
Raw sqlite3 only. No ORM.
"""
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "./graduent.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stream TEXT NOT NULL,
    theme TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    rotation_flag INTEGER NOT NULL DEFAULT 0,
    rotation_context TEXT
);

CREATE TABLE IF NOT EXISTS error_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    exercise_id TEXT,
    blank_id INTEGER,
    what_written TEXT,
    expected TEXT,
    error_type TEXT,
    error_subtype TEXT,
    topic TEXT,
    node_index INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES session(id)
);

CREATE TABLE IF NOT EXISTS error_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    error_type TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 0.0,
    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES session(id),
    UNIQUE(session_id, error_type)
);

CREATE TABLE IF NOT EXISTS node_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    display_name TEXT NOT NULL,
    node_index INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'locked',
    attempts INTEGER NOT NULL DEFAULT 0,
    dominant_error TEXT,
    completed_at TEXT,
    reason_for_position TEXT,
    cluster_name TEXT,
    FOREIGN KEY (session_id) REFERENCES session(id),
    UNIQUE(session_id, topic, node_index)
);

CREATE TABLE IF NOT EXISTS spaced_repetition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    display_name TEXT NOT NULL,
    node_index INTEGER NOT NULL,
    block_code TEXT,
    due_date TEXT NOT NULL,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days REAL NOT NULL DEFAULT 1.0,
    times_correct INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES session(id)
);

CREATE TABLE IF NOT EXISTS pipeline_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    cluster_name TEXT NOT NULL,
    block_index INTEGER NOT NULL,
    stitch_complete INTEGER NOT NULL DEFAULT 0,
    unlocked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES session(id),
    UNIQUE(session_id, cluster_name, block_index)
);

CREATE TABLE IF NOT EXISTS output_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    exercise_id TEXT,
    line_number INTEGER,
    predicted TEXT,
    actual TEXT,
    correct INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES session(id)
);
"""


def get_conn():
    """Get a new SQLite connection with Row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Drop and recreate all tables. Clean slate for hackathon demos."""
    conn = get_conn()
    # Drop all tables for clean demo
    tables = [
        "output_predictions", "pipeline_progress", "spaced_repetition",
        "node_progress", "error_profile", "error_log", "session"
    ]
    for table in tables:
        conn.execute(f"DROP TABLE IF EXISTS {table}")
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
    print(f"[database] Initialized DB at {DB_PATH}")
