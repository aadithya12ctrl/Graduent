"""
routers/session.py — Session creation endpoint.
Creates session, seeds node_progress and error_profile.
"""
from fastapi import APIRouter, HTTPException
from database import get_conn
from models import SessionCreate, SessionResponse
from error_profile import seed_error_profile

router = APIRouter()

# Default roadmap topics per stream
STREAM_ROADMAP = {
    "ML/AI": [
        {"cluster": "Text Preprocessing", "topic": "tokenization", "display_names": ["Basic Tokenization", "Vocab Building", "Padding Sequences"]},
        {"cluster": "Model Building", "topic": "layers", "display_names": ["Linear Layers", "Activation Functions", "Loss Calculation"]},
        {"cluster": "Training Loop", "topic": "training", "display_names": ["Forward Pass", "Backpropagation", "Optimizer Step"]},
    ],
    "DSA": [
        {"cluster": "Sorting", "topic": "sorting", "display_names": ["Bubble Sort", "Merge Sort", "Quick Sort"]},
        {"cluster": "Searching", "topic": "searching", "display_names": ["Linear Search", "Binary Search", "DFS/BFS"]},
        {"cluster": "Graph Traversal", "topic": "graphs", "display_names": ["Adjacency Matrix", "Dijkstra's Algorithm", "A* Search"]},
    ],
    "LLMs": [
        {"cluster": "Tokenization", "topic": "tokenization", "display_names": ["BPE Core", "WordPiece Setup", "SentencePiece Rules"]},
        {"cluster": "Prompt Engineering", "topic": "prompting", "display_names": ["Zero-Shot Design", "Few-Shot Examples", "Chain of Thought"]},
        {"cluster": "Fine-tuning", "topic": "finetuning", "display_names": ["LoRA Adapters", "Data Preparation", "Trainer Setup"]},
    ],
}


@router.post("/session", status_code=201, response_model=SessionResponse)
def create_session(req: SessionCreate):
    conn = get_conn()
    try:
        # Create session
        cursor = conn.execute(
            "INSERT INTO session (stream, theme) VALUES (?, ?)",
            (req.stream, req.theme),
        )
        session_id = cursor.lastrowid

        # Seed node_progress — 3 nodes per cluster, 3 clusters per stream
        roadmap = STREAM_ROADMAP.get(req.stream, STREAM_ROADMAP["ML/AI"])
        first = True
        for cluster_info in roadmap:
            for node_idx, display_name in enumerate(cluster_info["display_names"], start=1):
                status = "in_progress" if first and node_idx == 1 else "locked"
                conn.execute(
                    "INSERT INTO node_progress (session_id, topic, display_name, node_index, status, cluster_name) VALUES (?,?,?,?,?,?)",
                    (session_id, cluster_info["topic"], display_name, node_idx, status, cluster_info["cluster"]),
                )
            first = False

        # Seed pipeline_progress — 1 entry per cluster with 3 blocks
        for cluster_info in roadmap:
            for block_idx in range(1, 4):
                # FOR DEMO: Unlock first block (index 1) by default
                unlocked = 1 if block_idx == 1 else 0
                conn.execute(
                    "INSERT INTO pipeline_progress (session_id, cluster_name, block_index, unlocked) VALUES (?,?,?,?)",
                    (session_id, cluster_info["cluster"], block_idx, unlocked),
                )

        conn.commit()

        # Seed error profile (5 types at weight 0.0)
        seed_error_profile(session_id)

        return SessionResponse(session_id=session_id, stream=req.stream, theme=req.theme)

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Session creation failed: {str(e)}")
    finally:
        conn.close()
