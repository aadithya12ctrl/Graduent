# Graduent — Technical Requirements

---

## 1. System Architecture

### 1.1 Topology

```
Browser (React SPA)
    │
    │  HTTP/JSON  (localhost:5173 → localhost:8000)
    ▼
FastAPI (Python, Uvicorn)
    │              │
    │              └──→ SQLite (graduent.db, local file)
    │
    └──→ LLM API  (POST https://api.aicredits.in/v1/chat/completions)
    └──→ SentenceTransformer  (in-process, local model)
```

No cloud services. No external DB. No auth layer. Everything runs on one machine.

### 1.2 Request Lifecycle

```
Frontend component needs data
  └─→ calls api/client.js function
        └─→ fetch(VITE_API_URL + '/api/...', { method, body })
              └─→ FastAPI router receives request
                    └─→ validates with Pydantic model
                          └─→ calls service (classifier / llm / db)
                                └─→ returns JSON response
                                      └─→ frontend updates React state
```

All API responses are JSON. All errors return `{ "detail": "..." }` with appropriate HTTP status.

---

## 2. Frontend Requirements

### 2.1 Gradient Engine

The cursor-reactive gradient is a core product feature. Requirements:

- **Must use `requestAnimationFrame`** — not CSS transitions or setTimeout. Lerp runs every frame.
- **Must not cause layout reflow** — gradient is applied to a `position: fixed` pseudo-element or the `body` background. Only `background` property changes; no width/height/transform changes.
- **Lerp factors:**
  - Orb 1 (warm peach, follows cursor): `lerp = 0.08`
  - Orb 2 (cool lavender, counter-follows): `lerp = 0.04`
- **Grain layer:** SVG `feTurbulence` filter rendered as a `data:` URI in a `position: fixed` pseudo-element. Opacity by zone: landing=0.08, app=0.06, exercise=0.04.
- **Performance:** gradient position stored in CSS custom properties on `:root`. No DOM writes other than `style.setProperty`.
- Implemented in `hooks/useGradient.js`, attached at `AppShell` level.

```js
// useGradient.js — canonical implementation
export function useGradient(intensity = 0.08) {
  useEffect(() => {
    let tx = 50, ty = 50, cx = 50, cy = 50
    let cx2 = 50, cy2 = 50
    const root = document.documentElement

    const onMove = e => {
      tx = (e.clientX / window.innerWidth) * 100
      ty = (e.clientY / window.innerHeight) * 100
    }
    window.addEventListener('mousemove', onMove)

    let raf
    const tick = () => {
      cx += (tx - cx) * 0.08
      cy += (ty - cy) * 0.08
      cx2 += ((100 - tx) - cx2) * 0.04
      cy2 += ((100 - ty) - cy2) * 0.04
      root.style.setProperty('--gx1', cx.toFixed(2) + '%')
      root.style.setProperty('--gy1', cy.toFixed(2) + '%')
      root.style.setProperty('--gx2', cx2.toFixed(2) + '%')
      root.style.setProperty('--gy2', cy2.toFixed(2) + '%')
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])
}
```

### 2.2 Glass Panel CSS

Canonical glass styles. Use these class names consistently; do not re-implement per-component.

```css
/* index.css */
.glass {
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 4px 24px rgba(26,24,20,0.06);
}
.glass-heavy {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
.glass-light {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.38);
}
```

### 2.3 API Client

All fetch calls must go through `api/client.js`. Components never call `fetch` directly.

```js
// api/client.js
const BASE = import.meta.env.VITE_API_URL  // http://localhost:8000

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  createSession: (stream, theme) =>
    request('/api/session', { method: 'POST', body: { stream, theme } }),
  getRoadmap: (session_id) =>
    request(`/api/roadmap?session_id=${session_id}`),
  getErrorProfile: (session_id) =>
    request(`/api/error_profile?session_id=${session_id}`),
  generateExercise: (body) =>
    request('/api/exercise/generate', { method: 'POST', body }),
  submitBlank: (body) =>
    request('/api/submission', { method: 'POST', body }),
  completeNode: (body) =>
    request('/api/node/complete', { method: 'POST', body }),
  submitStitch: (body) =>
    request('/api/stitch/submit', { method: 'POST', body }),
  getDueBlocks: (session_id) =>
    request(`/api/spaced_rep/due?session_id=${session_id}`),
  updateSpacedRep: (body) =>
    request('/api/spaced_rep/update', { method: 'POST', body }),
}
```

### 2.4 Session Context

```jsx
// context/SessionContext.jsx
const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null)
  // session = { id, stream, theme }

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
```

Session ID is the only global state. Everything else (roadmap, error profile, current exercise) is fetched per-component and stored locally.

### 2.5 Routing

```jsx
// App.jsx
<Routes>
  <Route path="/"    element={<LandingPage />} />
  <Route path="/app" element={<AppShell />}>
    <Route index      element={<RoadmapCTA />} />
    <Route path="exercise/:nodeId" element={<ExerciseShell />} />
  </Route>
</Routes>
```

Navigation from landing → `/app` happens programmatically after session creation:
```js
const navigate = useNavigate()
navigate('/app', { replace: true })
```

---

## 3. Backend Requirements

### 3.1 Database Init

`database.py` runs `init_db()` on every backend start. For the hackathon, this drops and recreates all tables (clean slate each demo). Schema is in `database.py` as a constant string.

```python
# database.py
import sqlite3, os
from dotenv import load_dotenv
load_dotenv()

DB_PATH = os.getenv('DB_PATH', './graduent.db')

SCHEMA = """
CREATE TABLE IF NOT EXISTS session ( ... );
CREATE TABLE IF NOT EXISTS error_log ( ... );
CREATE TABLE IF NOT EXISTS error_profile ( ... );
CREATE TABLE IF NOT EXISTS node_progress ( ... );
CREATE TABLE IF NOT EXISTS spaced_repetition ( ... );
CREATE TABLE IF NOT EXISTS pipeline_progress ( ... );
CREATE TABLE IF NOT EXISTS output_predictions ( ... );
"""

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # rows as dicts
    return conn

def init_db():
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()
```

Every router function calls `get_conn()`, uses it, closes it. No connection pooling.

### 3.2 LLM Client

All LLM interactions go through `llm.py`. No router imports httpx directly.

```python
# llm.py
import httpx, os, json
from dotenv import load_dotenv
load_dotenv()

API_KEY  = os.getenv('LLM_API_KEY')
BASE_URL = os.getenv('LLM_BASE_URL')   # https://api.aicredits.in/v1
MODEL    = os.getenv('LLM_MODEL')       # meta-llama/llama-3-8b-instruct

async def llm_call(prompt: str, temperature: float = 0.3, max_tokens: int = 1200) -> str:
    """Returns raw text content from the model."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

def extract_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON. Raises JSONDecodeError on failure."""
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    return json.loads(clean.strip())

async def llm_json(prompt: str, temperature: float = 0.3) -> dict:
    """Call LLM, parse JSON. Retries once with lower temp on parse failure."""
    raw = await llm_call(prompt, temperature)
    try:
        return extract_json(raw)
    except json.JSONDecodeError:
        raw2 = await llm_call(prompt + "\n\nIMPORTANT: Return ONLY valid JSON, no markdown.", 0.1)
        try:
            return extract_json(raw2)
        except json.JSONDecodeError:
            return None   # caller loads from exercise bank
```

### 3.3 Error Classifier

```python
# classifier.py
import ast
from difflib import edit_distance   # or Levenshtein

def classify_error(written: str, expected: str, line_context: str) -> tuple[str, str | None]:
    written, expected = written.strip(), expected.strip()

    # Typo: edit distance ≤ 2
    if edit_distance(written, expected) <= 2:
        return 'typo', detect_typo_subtype(written, expected)

    # Syntax: valid python but wrong in context
    if is_valid_python(written) and not is_valid_python(expected.replace(written, '')):
        return 'syntax', None

    # Off-by-one
    try:
        if abs(int(written) - int(expected)) == 1:
            return 'logic', 'off_by_one'
    except ValueError:
        pass

    # Wrong variable: same operator tokens, different names
    if same_operators(written, expected) and different_names(written, expected):
        return 'logic', 'wrong_variable'

    # Missing self
    if 'self.' in expected and 'self.' not in written:
        return 'scope', 'missing_self'

    return 'unknown', None

def is_valid_python(code: str) -> bool:
    try:
        ast.parse(code)
        return True
    except SyntaxError:
        return False
```

`'unknown'` → router calls `llm_json(CLASSIFY_PROMPT.format(...))` to get error_type.

### 3.4 Error Profile Update

```python
# error_profile.py
import math
from datetime import datetime
from database import get_conn

LAMBDA = 0.1  # decay rate

def update_weight(session_id: int, error_type: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT weight, last_updated FROM error_profile WHERE session_id=? AND error_type=?",
        (session_id, error_type)
    ).fetchone()

    now = datetime.utcnow()

    if row:
        days_since = (now - datetime.fromisoformat(row['last_updated'])).days
        decayed = row['weight'] * math.exp(-LAMBDA * days_since)
        new_weight = decayed + 1.0
        conn.execute(
            "UPDATE error_profile SET weight=?, last_updated=? WHERE session_id=? AND error_type=?",
            (new_weight, now.isoformat(), session_id, error_type)
        )
    else:
        conn.execute(
            "INSERT INTO error_profile (session_id, error_type, weight, last_updated) VALUES (?,?,?,?)",
            (session_id, error_type, 1.0, now.isoformat())
        )

    conn.commit()
    conn.close()
```

### 3.5 Pydantic Models

All request and response shapes are defined in `models.py`. Routers import from here only.

```python
# models.py (excerpt)
from pydantic import BaseModel
from typing import Optional

class SessionCreate(BaseModel):
    stream: str        # 'ML' | 'DSA' | 'LLMs'
    theme: str

class SessionResponse(BaseModel):
    session_id: int
    stream: str
    theme: str

class SubmissionRequest(BaseModel):
    session_id: int
    exercise_id: str
    blank_id: int
    what_written: str
    expected_answer: str
    topic: str
    node_index: int
    line_context: str

class SubmissionResponse(BaseModel):
    correct: bool
    error_type: Optional[str]
    error_subtype: Optional[str]
    feedback: Optional[dict]   # { why, followup_question, followup_answer }
    updated_weights: dict      # { syntax, logic, typo, scope, state }
    rotation_triggered: bool

class ExerciseRequest(BaseModel):
    session_id: int
    topic: str
    node_index: int
    stream: str
    scaffold_percent: int = 80
    rotation_flag: bool = False

class StitchRequest(BaseModel):
    session_id: int
    cluster_name: str
    block_index: int
    stitch_attempt: str
```

### 3.6 FastAPI App Setup

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import session, roadmap, exercise, submission, pipeline, spaced_rep

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

app.include_router(session.router,     prefix="/api")
app.include_router(roadmap.router,     prefix="/api")
app.include_router(exercise.router,    prefix="/api")
app.include_router(submission.router,  prefix="/api")
app.include_router(pipeline.router,    prefix="/api")
app.include_router(spaced_rep.router,  prefix="/api")
```

### 3.7 Parallel LLM Calls

Exercise generation fires two LLM calls simultaneously: exercise generation + theory generation. Use `asyncio.gather`.

```python
# routers/exercise.py (excerpt)
import asyncio
from llm import llm_json
from prompts import EXERCISE_PROMPT, THEORY_PROMPT

@router.post("/exercise/generate")
async def generate_exercise(req: ExerciseRequest):
    exercise_prompt = EXERCISE_PROMPT.format(...)
    theory_prompt   = THEORY_PROMPT.format(...)

    exercise_data, theory_data = await asyncio.gather(
        llm_json(exercise_prompt),
        llm_json(theory_prompt),
    )

    if exercise_data is None:
        exercise_data = load_from_bank(req.topic, req.stream)

    return { **exercise_data, "theory": theory_data }
```

### 3.8 Prompts File

All prompts are f-string templates in `prompts.py`. No prompt logic in routers.

```python
# prompts.py

EXERCISE_PROMPT = """You are an expert coding educator.

Student profile:
- Stream: {stream}
- Theme: {theme}
- Topic: {topic}
- Node: {node_index} of 3
- Scaffold level: {scaffold_percent}%
- Error profile: {error_profile_json}
- Context rotation: {rotation_context}

Generate a fill-in-the-blank exercise where:
1. All variable names and context use the {theme} world
2. At least 60% of blanks target: {top_2_error_types}
3. Each blank is tagged with the error_type it tests
4. Scaffold code ({scaffold_percent}% of non-core-logic) is pre-filled
5. Core logic blocks always have blanks

Return ONLY valid JSON:
{{
  "problem_statement": "string",
  "code_with_blanks": "string (use ___ for blanks)",
  "blanks": [
    {{"blank_id": 1, "expected_answer": "string", "error_type_tested": "string", "line_context": "string"}}
  ],
  "intermediate_outputs": [
    {{"line_number": 3, "variable_name": "string", "actual_type": "string",
      "actual_shape": "string", "actual_sample": "string",
      "prediction_options": ["string","string","string","string"]}}
  ],
  "semantic_tags": [
    {{"line_range": [1,3], "tag": "scaffold|core_logic|output"}}
  ]
}}"""

THEORY_PROMPT = """You are an expert coding educator.

For this code block on topic {topic} in theme {theme}:
{code_block}

For each significant line, generate 3 explanation layers.
Return ONLY valid JSON:
{{
  "line_N": {{
    "layer_1": "one sentence, plain english, no jargon",
    "layer_2": "the concept — why this approach, what alternatives exist",
    "layer_3": "formal definition or math if applicable, else null"
  }}
}}"""

FEEDBACK_PROMPT = """Student wrote: {what_written}
Correct answer: {what_expected}
Line context: {line_context}
Topic: {topic}
Theme: {theme}

Return ONLY valid JSON:
{{"why": "one sentence explaining the concept violation in {theme} context",
  "followup_question": "one targeted question testing only that concept",
  "followup_answer": "the correct answer to the followup"}}"""

CLASSIFY_PROMPT = """Classify this coding error:
Written: {written}
Expected: {expected}
Line context: {line_context}

Return ONLY valid JSON:
{{"error_type": "syntax|logic|typo|scope|state",
  "error_subtype": "string or null"}}"""

ROTATION_PROMPT = """Algorithm: {algorithm}
Theme: {theme}
Previous context: {previous_context}
Error type that triggered rotation: {error_type}
Error subtype: {error_subtype}

Generate a new problem context where:
- The same algorithm applies
- The story is completely different from the previous context
- The {error_subtype} operation is structurally prominent and unavoidable
- All variable names use the {theme} world

Return ONLY valid JSON:
{{"problem_statement": "string", "context_description": "string"}}"""

ALTWAY_PROMPT = """Rewrite this code block in the alternate representation.
Original ({original_form}):
{code_block}

Target representation: {alt_form}
Theme: {theme}

Keep the same logical structure. Generate as fill-in-the-blank with the same blank positions.
Return ONLY valid JSON matching the exercise schema."""

STITCH_FEEDBACK_PROMPT = """Student wrote glue code:
{stitch_attempt}

Block {block_index} outputs: {actual_output_type} shape {actual_output_shape}
Block {next_block} expects: {expected_input_type} shape {expected_input_shape}
Theme: {theme}

Return ONLY valid JSON:
{{"why": "string", "what_to_fix": "string"}}"""
```

---

## 4. Data Contract: Frontend ↔ Backend

### Key response shapes

**POST /api/session → 201**
```json
{ "session_id": 1, "stream": "ML", "theme": "pokemon" }
```

**GET /api/roadmap → 200**
```json
{
  "clusters": [
    {
      "cluster_name": "Text Preprocessing",
      "nodes": [
        { "topic": "tokenization", "node_index": 1, "status": "complete",
          "attempts": 2, "dominant_error": "logic", "reason_for_position": null },
        { "topic": "tokenization", "node_index": 2, "status": "in_progress",
          "attempts": 0, "dominant_error": null, "reason_for_position": null },
        { "topic": "tokenization", "node_index": 3, "status": "locked",
          "attempts": 0, "dominant_error": null, "reason_for_position": null }
      ],
      "pipeline_unlocked": false
    }
  ]
}
```

**GET /api/error_profile → 200**
```json
{
  "weights": { "syntax": 0.0, "logic": 1.83, "typo": 0.45, "scope": 0.0, "state": 0.92 },
  "dominant": "logic",
  "dominant_percent": 43
}
```

**POST /api/submission → 200**
```json
{
  "correct": false,
  "error_type": "logic",
  "error_subtype": "wrong_variable",
  "feedback": {
    "why": "The DataLoader passed to training must use train_loader, not test_loader.",
    "followup_question": "Which split should be iterated during the training loop?",
    "followup_answer": "train_loader"
  },
  "updated_weights": { "syntax": 0.0, "logic": 2.83, "typo": 0.45, "scope": 0.0, "state": 0.92 },
  "rotation_triggered": false
}
```

---

## 5. Performance Requirements

| Concern | Requirement |
|---|---|
| LLM call timeout | 30 seconds. If exceeded → load from exercise bank |
| Exercise load time | < 5s p95 (two parallel LLM calls at ~2-3s each) |
| Blank submission response | < 500ms for rule-based path, < 4s for LLM-classified path |
| Gradient animation | Locked to rAF, never drops below 30fps |
| SQLite reads | < 20ms (local file, tiny dataset) |
| DB writes (submission) | < 50ms |

---

## 6. Error Handling

| Scenario | Behavior |
|---|---|
| LLM parse fails twice | Load from `exercise_bank/{stream}_{topic}.json` |
| LLM timeout | Same as parse fail — exercise bank fallback |
| SQLite write fails | Return 500 with `{ "detail": "DB write failed" }` — no silent failure |
| Unknown error type after LLM classify | Default to `'logic'` with subtype `null` |
| Stitch validation: cannot parse student code | Return `{ "correct": false, "error_type": "syntax" }` — no crash |
| Frontend fetch fails | `api/client.js` throws; component catches and shows inline error text (no full-page error) |

---

## 7. Exercise Bank (Fallback)

Pre-baked exercises stored as JSON files in `backend/exercise_bank/`. Minimum required for demo:

```
exercise_bank/
├── ml_tokenization_1.json    ← node 1
├── ml_tokenization_2.json    ← node 2
├── ml_tokenization_3.json    ← node 3
├── dsa_sorting_1.json
├── dsa_sorting_2.json
├── dsa_sorting_3.json
└── llm_tokenization_1.json
```

Each file matches the exercise JSON schema exactly. `load_from_bank(topic, stream, node_index)` selects the right file.

---

## 8. Not In Scope

The following must not be implemented — any AI-generated code that adds these should be removed:

- User authentication (JWT, sessions, cookies, OAuth)
- Cloud database (PostgreSQL, MySQL, Supabase, Firebase)
- Vector database (Pinecone, Weaviate, Chroma)
- Real-time (WebSockets, SSE, socket.io)
- File uploads
- Email / notifications
- Mobile layout / responsive CSS
- Docker / containerization
- CI/CD pipeline
- Unit tests (not required for hackathon)
