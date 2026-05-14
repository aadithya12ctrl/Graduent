"""
routers/roadmap.py — Roadmap loading with dynamic reorder logic.
"""
from fastapi import APIRouter, Query
from database import get_conn
from error_profile import get_weights

router = APIRouter()


@router.get("/roadmap")
def get_roadmap(session_id: int = Query(...)):
    conn = get_conn()
    try:
        # Fetch all nodes for this session
        rows = conn.execute(
            """SELECT topic, display_name, node_index, status, attempts, dominant_error,
                      completed_at, reason_for_position, cluster_name
               FROM node_progress
               WHERE session_id=?
               ORDER BY id""",
            (session_id,),
        ).fetchall()

        if not rows:
            return {"clusters": []}

        # Get error weights for reorder logic
        weights = get_weights(session_id)

        # Group by cluster
        clusters = {}
        for row in rows:
            cname = row["cluster_name"] or "Default"
            if cname not in clusters:
                clusters[cname] = {
                    "cluster_name": cname,
                    "nodes": [],
                    "pipeline_unlocked": False,
                }
            clusters[cname]["nodes"].append({
                "topic": row["topic"],
                "display_name": row["display_name"],
                "node_index": row["node_index"],
                "status": row["status"],
                "attempts": row["attempts"],
                "dominant_error": row["dominant_error"],
                "reason_for_position": row["reason_for_position"],
            })

        # Check pipeline unlock per cluster
        for cname, cluster in clusters.items():
            all_complete = all(n["status"] == "complete" for n in cluster["nodes"])
            cluster["pipeline_unlocked"] = all_complete

        # Apply reorder logic: if any error_type weight > 0.3, bump related nodes
        high_error_types = [et for et, w in weights.items() if w > 0.3]
        if high_error_types:
            # Find nodes with matching dominant_error and mark them
            for cname, cluster in clusters.items():
                for node in cluster["nodes"]:
                    if node["dominant_error"] in high_error_types and node["status"] != "complete":
                        node["reason_for_position"] = (
                            f"Moved up — repeated {node['dominant_error']} errors"
                        )

        cluster_list = list(clusters.values())
        return {"clusters": cluster_list}

    finally:
        conn.close()


@router.get("/error_profile")
def get_error_profile(session_id: int = Query(...)):
    weights = get_weights(session_id)
    total = sum(weights.values())
    dominant = max(weights, key=weights.get) if total > 0 else None
    dominant_percent = int((weights.get(dominant, 0) / total) * 100) if total > 0 else 0

    return {
        "weights": weights,
        "dominant": dominant,
        "dominant_percent": dominant_percent,
    }


@router.get("/error_log")
def get_error_log(session_id: int = Query(...)):
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM error_log WHERE session_id=? ORDER BY created_at DESC",
            (session_id,),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
