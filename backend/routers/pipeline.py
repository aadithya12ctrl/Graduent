"""
routers/pipeline.py — Pipeline stitching endpoints.
"""
from fastapi import APIRouter, Query, HTTPException
from database import get_conn
from models import StitchRequest, StitchResponse, PipelineBlockInfo
from llm import llm_json, llm_raw
from prompts import STITCH_FEEDBACK_PROMPT, PIPELINE_MISSION_PROMPT, MOCK_CODE_PROMPT
from error_profile import update_weight, get_weights

router = APIRouter()


@router.get("/pipeline")
def get_pipeline(session_id: int = Query(...), cluster: str = Query(...)):
    conn = get_conn()
    try:
        rows = conn.execute(
            """SELECT block_index, stitch_complete, unlocked
               FROM pipeline_progress
               WHERE session_id=? AND cluster_name=?
               ORDER BY block_index""",
            (session_id, cluster),
        ).fetchall()

        if not rows:
            return {"blocks": [], "cluster_name": cluster}

        blocks = []
        for row in rows:
            blocks.append({
                "block_index": row["block_index"],
                "stitch_complete": bool(row["stitch_complete"]),
                "unlocked": bool(row["unlocked"]),
            })

        return {"blocks": blocks, "cluster_name": cluster}
    finally:
        conn.close()


@router.get("/pipeline/details", response_model=PipelineBlockInfo)
async def get_pipeline_details(session_id: int = Query(...), cluster: str = Query(...), block: int = Query(...)):
    conn = get_conn()
    try:
        # 1. Identify Source and Target Node topics/names
        # Block 1 stitches Node 1 to Node 2
        source_idx = block
        target_idx = block + 1
        
        source = conn.execute(
            "SELECT display_name, topic FROM node_progress WHERE session_id=? AND cluster_name=? AND node_index=?",
            (session_id, cluster, source_idx)
        ).fetchone()
        
        target = conn.execute(
            "SELECT display_name, topic FROM node_progress WHERE session_id=? AND cluster_name=? AND node_index=?",
            (session_id, cluster, target_idx)
        ).fetchone()
        
        if not source or not target:
            raise HTTPException(status_code=404, detail="Nodes for this block not found")

        # 2. Get theme for generation
        sess_row = conn.execute("SELECT theme FROM session WHERE id=?", (session_id,)).fetchone()
        theme = sess_row["theme"] if sess_row else "default"

        # 3. Get Code (Mock if not completed)
        # Note: In a real app, we'd save 'final_code' on completion. 
        # For this demo, we'll generate professional 'Mock Code' so it always looks real.
        source_code = await llm_raw(MOCK_CODE_PROMPT.format(topic=source["display_name"], theme=theme))
        target_code = await llm_raw(MOCK_CODE_PROMPT.format(topic=target["display_name"], theme=theme))

        # 4. Generate Mission
        mission = await llm_raw(PIPELINE_MISSION_PROMPT.format(
            cluster=cluster,
            source_name=source["display_name"],
            target_name=target["display_name"],
            source_code=source_code,
            target_code=target_code,
            theme=theme
        ))

        return PipelineBlockInfo(
            source_code=source_code,
            target_code=target_code,
            mission_description=mission or "Stitch these modules together.",
            source_module_name=source["display_name"],
            target_module_name=target["display_name"]
        )
    finally:
        conn.close()


@router.post("/stitch/submit", response_model=StitchResponse)
async def submit_stitch(req: StitchRequest):
    conn = get_conn()
    try:
        # Verify block is unlocked
        block = conn.execute(
            "SELECT unlocked FROM pipeline_progress WHERE session_id=? AND cluster_name=? AND block_index=?",
            (req.session_id, req.cluster_name, req.block_index),
        ).fetchone()

        if not block or not block["unlocked"]:
            raise HTTPException(status_code=400, detail="Block not unlocked yet")

        # Simple validation: check if stitch_attempt is non-empty valid-ish code
        stitch = req.stitch_attempt.strip()
        if not stitch:
            return StitchResponse(
                correct=False,
                error_type="syntax",
                feedback={"why": "Empty stitch code", "what_to_fix": "Write the glue code connecting the blocks"},
            )

        # For hackathon: accept any non-empty stitch as correct
        conn.execute(
            "UPDATE pipeline_progress SET stitch_complete=1 WHERE session_id=? AND cluster_name=? AND block_index=?",
            (req.session_id, req.cluster_name, req.block_index),
        )

        # Unlock next block
        conn.execute(
            "UPDATE pipeline_progress SET unlocked=1 WHERE session_id=? AND cluster_name=? AND block_index=?",
            (req.session_id, req.cluster_name, req.block_index + 1),
        )

        conn.commit()

        return StitchResponse(correct=True)

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Stitch submission failed: {str(e)}")
    finally:
        conn.close()
