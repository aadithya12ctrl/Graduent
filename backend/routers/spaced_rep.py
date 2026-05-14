"""
routers/spaced_rep.py — Spaced repetition queue endpoints.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from database import get_conn
from models import SpacedRepUpdateRequest
from spaced_rep import sm2_update

router = APIRouter()


@router.get("/spaced_rep/due")
def get_due_blocks(session_id: int = Query(...)):
    conn = get_conn()
    try:
        now = datetime.utcnow().isoformat()
        rows = conn.execute(
            """SELECT id, topic, display_name, node_index, block_code, due_date,
                      ease_factor, interval_days, times_correct
               FROM spaced_repetition
               WHERE session_id=? AND due_date <= ?
               ORDER BY due_date ASC""",
            (session_id, now),
        ).fetchall()

        return {
            "due_count": len(rows),
            "blocks": [
                {
                    "sr_id": row["id"],
                    "topic": row["topic"],
                    "display_name": row["display_name"],
                    "node_index": row["node_index"],
                    "block_code": row["block_code"],
                    "due_date": row["due_date"],
                    "times_correct": row["times_correct"],
                }
                for row in rows
            ],
        }
    finally:
        conn.close()


@router.post("/spaced_rep/update")
def update_spaced_rep(req: SpacedRepUpdateRequest):
    conn = get_conn()
    try:
        # Get current SR entry
        row = conn.execute(
            "SELECT ease_factor, interval_days, times_correct FROM spaced_repetition WHERE id=? AND session_id=?",
            (req.sr_id, req.session_id),
        ).fetchone()

        if not row:
            return {"error": "SR entry not found"}

        # Run SM-2 update
        result = sm2_update(
            quality=req.quality,
            ease_factor=row["ease_factor"],
            interval_days=row["interval_days"],
            times_correct=row["times_correct"],
        )

        # Calculate new due date
        new_due = (datetime.utcnow() + timedelta(days=result["interval_days"])).isoformat()

        conn.execute(
            """UPDATE spaced_repetition
               SET ease_factor=?, interval_days=?, times_correct=?, due_date=?
               WHERE id=?""",
            (result["ease_factor"], result["interval_days"], result["times_correct"], new_due, req.sr_id),
        )
        conn.commit()

        return {
            "updated": True,
            "new_due_date": new_due,
            "interval_days": result["interval_days"],
            "ease_factor": result["ease_factor"],
            "times_correct": result["times_correct"],
        }
    finally:
        conn.close()
