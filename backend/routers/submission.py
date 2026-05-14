"""
routers/submission.py — Blank submission, feedback, node completion, alt way.
Core interaction loop: classify → log → update profile → generate feedback.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from database import get_conn
from models import (
    SubmissionRequest, SubmissionResponse,
    NodeCompleteRequest, NodeCompleteResponse,
    AltWayCompleteRequest, FeedbackRequest,
)
from classifier import classify_error
from error_profile import update_weight, get_weights, reduce_weight
from llm import llm_json
from prompts import FEEDBACK_PROMPT, CLASSIFY_PROMPT

router = APIRouter()


@router.post("/submission", response_model=SubmissionResponse)
async def submit_blank(req: SubmissionRequest):
    # Check correctness
    is_correct = req.what_written.strip() == req.expected_answer.strip()

    if is_correct:
        weights = get_weights(req.session_id)
        return SubmissionResponse(
            correct=True,
            updated_weights=weights,
            rotation_triggered=False,
        )

    # WRONG path: classify the error
    error_type, error_subtype = classify_error(
        req.what_written, req.expected_answer, req.line_context
    )

    # If unknown, use LLM classifier
    if error_type == "unknown":
        llm_result = await llm_json(
            CLASSIFY_PROMPT.format(
                written=req.what_written,
                expected=req.expected_answer,
                line_context=req.line_context,
            )
        )
        if llm_result:
            error_type = llm_result.get("error_type", "logic")
            error_subtype = llm_result.get("error_subtype")
        else:
            error_type = "logic"  # default fallback

    # Log the error
    conn = get_conn()
    try:
        conn.execute(
            """INSERT INTO error_log
               (session_id, exercise_id, blank_id, what_written, expected,
                error_type, error_subtype, topic, node_index)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                req.session_id, req.exercise_id, req.blank_id,
                req.what_written, req.expected_answer,
                error_type, error_subtype, req.topic, req.node_index,
            ),
        )
        # Increment attempts on node_progress
        conn.execute(
            "UPDATE node_progress SET attempts = attempts + 1 WHERE session_id=? AND topic=? AND node_index=?",
            (req.session_id, req.topic, req.node_index),
        )
        conn.commit()
    finally:
        conn.close()

    # Update error profile weight
    update_weight(req.session_id, error_type)

    # Check context rotation trigger: ≥2 same error on same topic
    rotation_triggered = False
    conn = get_conn()
    try:
        count_row = conn.execute(
            """SELECT COUNT(*) as cnt FROM error_log
               WHERE session_id=? AND topic=? AND error_type=?""",
            (req.session_id, req.topic, error_type),
        ).fetchone()
        if count_row and count_row["cnt"] >= 2:
            rotation_triggered = True
            conn.execute(
                "UPDATE session SET rotation_flag=1 WHERE id=?",
                (req.session_id,),
            )
            conn.commit()
    finally:
        conn.close()

    # Generate feedback via LLM
    conn = get_conn()
    session = conn.execute("SELECT theme FROM session WHERE id=?", (req.session_id,)).fetchone()
    conn.close()
    theme = session["theme"] if session else "default"

    feedback = None
    try:
        feedback = await llm_json(
            FEEDBACK_PROMPT.format(
                what_written=req.what_written,
                what_expected=req.expected_answer,
                line_context=req.line_context,
                topic=req.topic,
                theme=theme,
            )
        )
    except Exception:
        feedback = {
            "why": f"Expected '{req.expected_answer}' but got '{req.what_written}'.",
            "followup_question": f"What should the correct value be for this blank?",
            "followup_answer": req.expected_answer,
        }

    if feedback is None:
        feedback = {
            "why": f"Expected '{req.expected_answer}' but got '{req.what_written}'.",
            "followup_question": f"What should the correct value be for this blank?",
            "followup_answer": req.expected_answer,
        }

    weights = get_weights(req.session_id)

    return SubmissionResponse(
        correct=False,
        error_type=error_type,
        error_subtype=error_subtype,
        feedback=feedback,
        updated_weights=weights,
        rotation_triggered=rotation_triggered,
    )


@router.post("/node/complete", response_model=NodeCompleteResponse)
def complete_node(req: NodeCompleteRequest):
    conn = get_conn()
    try:
        # Count errors for this node
        err_count = conn.execute(
            "SELECT COUNT(*) as cnt FROM error_log WHERE session_id=? AND topic=? AND node_index=?",
            (req.session_id, req.topic, req.node_index),
        ).fetchone()["cnt"]

        # Determine dominant error for the node
        dominant = conn.execute(
            """SELECT error_type, COUNT(*) as cnt FROM error_log
               WHERE session_id=? AND topic=? AND node_index=?
               GROUP BY error_type ORDER BY cnt DESC LIMIT 1""",
            (req.session_id, req.topic, req.node_index),
        ).fetchone()
        dominant_error = dominant["error_type"] if dominant else None

        # Mark node complete
        now = datetime.utcnow().isoformat()
        conn.execute(
            "UPDATE node_progress SET status='complete', completed_at=?, dominant_error=? WHERE session_id=? AND topic=? AND node_index=?",
            (now, dominant_error, req.session_id, req.topic, req.node_index),
        )

        # Unlock next node
        next_node = None
        next_row = conn.execute(
            "SELECT topic, node_index FROM node_progress WHERE session_id=? AND topic=? AND node_index=? AND status='locked'",
            (req.session_id, req.topic, req.node_index + 1),
        ).fetchone()

        if next_row:
            conn.execute(
                "UPDATE node_progress SET status='in_progress' WHERE session_id=? AND topic=? AND node_index=?",
                (req.session_id, req.topic, req.node_index + 1),
            )
            next_node = {"topic": next_row["topic"], "node_index": next_row["node_index"]}

        # Check cluster completion (all 3 nodes)
        pipeline_unlocked = False
        cluster_row = conn.execute(
            "SELECT cluster_name FROM node_progress WHERE session_id=? AND topic=? LIMIT 1",
            (req.session_id, req.topic),
        ).fetchone()
        if cluster_row:
            cluster_name = cluster_row["cluster_name"]
            all_complete = conn.execute(
                "SELECT COUNT(*) as cnt FROM node_progress WHERE session_id=? AND cluster_name=? AND status != 'complete'",
                (req.session_id, cluster_name),
            ).fetchone()["cnt"]
            if all_complete == 0:
                pipeline_unlocked = True
                # Unlock first pipeline block
                conn.execute(
                    "UPDATE pipeline_progress SET unlocked=1 WHERE session_id=? AND cluster_name=? AND block_index=1",
                    (req.session_id, cluster_name),
                )

                # Unlock first node of next cluster
                next_cluster = conn.execute(
                    """SELECT DISTINCT cluster_name FROM node_progress
                       WHERE session_id=? AND cluster_name != ? AND status='locked'
                       LIMIT 1""",
                    (req.session_id, cluster_name),
                ).fetchone()
                if next_cluster:
                    conn.execute(
                        """UPDATE node_progress SET status='in_progress'
                           WHERE session_id=? AND cluster_name=? AND node_index=1""",
                        (req.session_id, next_cluster["cluster_name"]),
                    )

        # Seed spaced repetition
        display_name_row = conn.execute(
            "SELECT display_name FROM node_progress WHERE session_id=? AND topic=? AND node_index=?",
            (req.session_id, req.topic, req.node_index)
        ).fetchone()
        display_name = display_name_row["display_name"] if display_name_row else req.topic

        due_date = (datetime.utcnow() + timedelta(days=1)).isoformat()
        conn.execute(
            """INSERT INTO spaced_repetition (session_id, topic, display_name, node_index, due_date)
               VALUES (?,?,?,?,?)""",
            (req.session_id, req.topic, display_name, req.node_index, due_date),
        )

        conn.commit()

        return NodeCompleteResponse(
            next_node=next_node,
            pipeline_unlocked=pipeline_unlocked,
            spaced_rep_added=True,
        )

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Node completion failed: {str(e)}")
    finally:
        conn.close()


@router.post("/altway/complete")
def complete_altway(req: AltWayCompleteRequest):
    """Bonus: reduce dominant error weight by 0.15 for completing alt way."""
    conn = get_conn()
    try:
        dominant = conn.execute(
            """SELECT error_type, COUNT(*) as cnt FROM error_log
               WHERE session_id=? AND topic=? AND node_index=?
               GROUP BY error_type ORDER BY cnt DESC LIMIT 1""",
            (req.session_id, req.topic, req.node_index),
        ).fetchone()

        if dominant:
            reduce_weight(req.session_id, dominant["error_type"], 0.15)

        weights = get_weights(req.session_id)
        return {"updated_weights": weights, "bonus_applied": True}
    finally:
        conn.close()
