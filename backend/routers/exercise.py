"""
routers/exercise.py — Exercise generation via LLM with fallback to exercise bank.
Uses asyncio.gather for parallel LLM calls (exercise + theory).
"""
import asyncio
import json
import os
import uuid
from fastapi import APIRouter, HTTPException
from models import ExerciseRequest
from llm import llm_json
from prompts import EXERCISE_PROMPT, ROTATION_PROMPT
from error_profile import get_weights, get_top_2_error_types
from database import get_conn

router = APIRouter()

# In-memory exercise cache (per session, keyed by topic+node_index)
_exercise_cache = {}


def _cache_key(session_id: int, topic: str, node_index: int, scaffold: int) -> str:
    # Adding 'v3' to force-clear any old corrupted cache
    return f"session_{session_id}:{topic}:node_{node_index}:scaffold_{scaffold}:v3"


def load_from_bank(topic: str, stream: str, node_index: int = 1) -> dict:
    """Load fallback exercise from exercise_bank/ directory."""
    # Map stream to prefix
    prefix_map = {"ML/AI": "ml", "DSA": "dsa", "LLMs": "llm"}
    prefix = prefix_map.get(stream, "ml")
    filename = f"{prefix}_{topic}_{node_index}.json"
    filepath = os.path.join(os.path.dirname(__file__), "..", "exercise_bank", filename)

    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)

    # Try without node_index
    filename2 = f"{prefix}_{topic}.json"
    filepath2 = os.path.join(os.path.dirname(__file__), "..", "exercise_bank", filename2)
    if os.path.exists(filepath2):
        with open(filepath2, "r") as f:
            return json.load(f)

    # Return a minimal fallback
    return {
        "problem_statement": f"Practice exercise for {topic}",
        "code_with_blanks": f"# {topic} exercise\nresult = ___",
        "blanks": [
            {
                "blank_id": 1,
                "expected_answer": "None",
                "error_type_tested": "logic",
                "line_context": "result = ___",
            }
        ],
        "intermediate_outputs": [],
        "semantic_tags": [{"line_range": [1, 2], "tag": "core_logic"}],
    }


@router.post("/exercise/generate")
async def generate_exercise(req: ExerciseRequest):
    print(f"DEBUG: ExerciseRequest received: {req}")
    # Determine scaffold level based on node state
    conn = get_conn()
    node_state = conn.execute(
        "SELECT attempts, dominant_error FROM node_progress WHERE session_id=? AND topic=? AND node_index=?",
        (req.session_id, req.topic, req.node_index)
    ).fetchone()
    conn.close()

    # Dynamic Fading Logic:
    scaffold_map = {1: 80, 2: 50, 3: 20}
    base_scaffold = scaffold_map.get(req.node_index, 80)
    
    if node_state and node_state["attempts"] > 1 and not node_state["dominant_error"]:
        base_scaffold = max(0, base_scaffold - 10)
    
    scaffold = req.scaffold_percent if req.scaffold_percent is not None else base_scaffold

    # Check cache AFTER determining scaffold
    key = _cache_key(req.session_id, req.topic, req.node_index, scaffold)
    if key in _exercise_cache:
        return _exercise_cache[key]

    # Get error profile for prompt
    weights = get_weights(req.session_id)
    top_2 = get_top_2_error_types(weights)
    error_profile_json = json.dumps(weights)

    # Check rotation
    rotation_context = "none"
    if req.rotation_flag:
        conn = get_conn()
        session = conn.execute(
            "SELECT rotation_context FROM session WHERE id=?", (req.session_id,)
        ).fetchone()
        if session and session["rotation_context"]:
            rotation_context = session["rotation_context"]
        conn.close()

    # Get session theme
    conn = get_conn()
    session = conn.execute(
        "SELECT stream, theme FROM session WHERE id=?", (req.session_id,)
    ).fetchone()
    conn.close()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    theme = session["theme"]
    stream = session["stream"]

    # Build prompts
    exercise_prompt = EXERCISE_PROMPT.format(
        stream=stream,
        theme=theme,
        topic=req.topic,
        node_index=req.node_index,
        scaffold_percent=scaffold,
        error_profile_json=error_profile_json,
        rotation_context=rotation_context,
        top_2_error_types=top_2,
    )

    import re
    exercise_data = None
    
    # Try up to 3 times to get a perfectly matched exercise
    for attempt in range(3):
        temp_data = await llm_json(exercise_prompt)
        if not temp_data or "blanks" not in temp_data:
            print(f"CRITICAL: Attempt {attempt + 1} - LLM failed to generate valid exercise structure.")
            continue
            
        code_lines = temp_data.get("code_with_blanks_lines", [])
        if not code_lines and "code_with_blanks" in temp_data:
            # Fallback if AI ignores rule 4
            code_lines = temp_data["code_with_blanks"].split("\n")
            
        actual_blanks_count = 0
        cleaned_lines = []
        for line in code_lines:
            # Sanitize numbered blanks
            line = re.sub(r'___\s*\(?\d+\)?\s*___', '___', line)
            line = re.sub(r'___\s*\(?\d+\)?', '___', line)
            line = re.sub(r'_{4,}', '___', line)
            cleaned_lines.append(line)
            actual_blanks_count += line.count("___")
            
        temp_data["code_with_blanks_lines"] = cleaned_lines

        provided_answers_count = len(temp_data.get("blanks", []))
        
        if actual_blanks_count != provided_answers_count:
            print(f"WARNING: Attempt {attempt + 1} - Mismatch! Code has {actual_blanks_count} blanks, AI provided {provided_answers_count} answers.")
            if attempt < 2:
                continue # Give the AI another chance
                
            print("CRITICAL: Auto-fixing mismatch to prevent user crash...")
            blanks_array = temp_data.get("blanks", [])
            # Pad if too many blanks in code
            while len(blanks_array) < actual_blanks_count:
                blanks_array.append({
                    "blank_id": len(blanks_array) + 1,
                    "expected_answer": "Fill in the blank",
                    "error_type_tested": "logic",
                    "line_context": "Missing context",
                    "theory_explanation": "System automatically added this blank. Try your best!",
                    "alternative_approaches": "null"
                })
            # Truncate if too few blanks in code
            blanks_array = blanks_array[:actual_blanks_count]
            temp_data["blanks"] = blanks_array
            
        # If we made it here, it's either perfect or auto-fixed!
        exercise_data = temp_data
        break
        
    if not exercise_data:
        raise HTTPException(status_code=500, detail="LLM failed to generate a valid response after 3 attempts.")

    # Add metadata
    exercise_data["exercise_id"] = str(uuid.uuid4())
    exercise_data["scaffold_percent"] = scaffold

    # Cache the exercise
    _exercise_cache[key] = exercise_data

    return exercise_data


@router.get("/exercise/cached")
def get_cached_exercise(session_id: int, topic: str, node_index: int, scaffold: int = 80):
    key = _cache_key(session_id, topic, node_index, scaffold)
    if key in _exercise_cache:
        return _exercise_cache[key]
    raise HTTPException(status_code=404, detail="No cached exercise found")
