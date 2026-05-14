"""
error_profile.py — Exponential decay weight update for error tracking.
"""
import math
from datetime import datetime
from database import get_conn

LAMBDA = 0.1  # decay rate
ERROR_TYPES = ["syntax", "logic", "typo", "scope", "state"]


def update_weight(session_id: int, error_type: str):
    """Increment weight for an error type with exponential decay applied."""
    conn = get_conn()
    row = conn.execute(
        "SELECT weight, last_updated FROM error_profile WHERE session_id=? AND error_type=?",
        (session_id, error_type),
    ).fetchone()

    now = datetime.utcnow()

    if row:
        last = datetime.fromisoformat(row["last_updated"])
        days_since = max((now - last).total_seconds() / 86400, 0)
        decayed = row["weight"] * math.exp(-LAMBDA * days_since)
        new_weight = decayed + 1.0
        conn.execute(
            "UPDATE error_profile SET weight=?, last_updated=? WHERE session_id=? AND error_type=?",
            (new_weight, now.isoformat(), session_id, error_type),
        )
    else:
        conn.execute(
            "INSERT INTO error_profile (session_id, error_type, weight, last_updated) VALUES (?,?,?,?)",
            (session_id, error_type, 1.0, now.isoformat()),
        )

    conn.commit()
    conn.close()


def reduce_weight(session_id: int, error_type: str, amount: float = 0.15):
    """Reduce weight for an error type (used for Alt Way bonus)."""
    conn = get_conn()
    conn.execute(
        "UPDATE error_profile SET weight = MAX(0, weight - ?) WHERE session_id=? AND error_type=?",
        (amount, session_id, error_type),
    )
    conn.commit()
    conn.close()


def get_weights(session_id: int) -> dict:
    """Get all error type weights for a session."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT error_type, weight FROM error_profile WHERE session_id=?",
        (session_id,),
    ).fetchall()
    conn.close()

    weights = {et: 0.0 for et in ERROR_TYPES}
    for row in rows:
        weights[row["error_type"]] = round(row["weight"], 2)
    return weights


def get_dominant(weights: dict) -> tuple:
    """Get dominant error type and its percentage."""
    total = sum(weights.values())
    if total == 0:
        return None, 0
    dominant = max(weights, key=weights.get)
    percent = int((weights[dominant] / total) * 100)
    return dominant, percent


def get_top_2_error_types(weights: dict) -> str:
    """Get top 2 error types as comma-separated string for prompts."""
    sorted_types = sorted(weights.items(), key=lambda x: x[1], reverse=True)
    top = [t[0] for t in sorted_types[:2] if t[1] > 0]
    return ", ".join(top) if top else "all types equally"


def seed_error_profile(session_id: int):
    """Seed error profile with all 5 error types at weight 0.0."""
    conn = get_conn()
    now = datetime.utcnow().isoformat()
    for et in ERROR_TYPES:
        conn.execute(
            "INSERT OR IGNORE INTO error_profile (session_id, error_type, weight, last_updated) VALUES (?,?,?,?)",
            (session_id, et, 0.0, now),
        )
    conn.commit()
    conn.close()
