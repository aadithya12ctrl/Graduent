# Graduent — Tech Stack

> Single source of truth. Every file in this codebase uses exactly these technologies. No substitutions.

---

## Frontend

| Concern | Choice | Version |
|---|---|---|
| Framework | React | 18.x |
| Build tool | Vite | 5.x |
| Styling | Tailwind CSS | 3.x |
| Routing | React Router | 6.x |
| HTTP client | fetch (native) | — |
| Charts | Recharts | 2.x |
| Code highlighting | Prism.js | 1.x |
| Font: display/code | Berkeley Mono | local / @font-face |
| Font: UI | Geist Sans | local / @font-face |

**No Redux. No Zustand. No external state library.**
State lives in React useState / useReducer + Context for session_id and error_profile. Everything else is prop-drilled or fetched on mount.

**No CSS-in-JS.** Tailwind utility classes only. Custom CSS via `index.css` for gradient, grain, and glassmorphism (these can't be expressed in Tailwind utilities cleanly).

---

## Backend

| Concern | Choice | Version |
|---|---|---|
| Framework | FastAPI | 0.111.x |
| Language | Python | 3.11.x |
| ASGI server | Uvicorn | 0.29.x |
| Database ORM | Raw sqlite3 (stdlib) | — |
| Database | SQLite | 3.x (file: graduent.db) |
| HTTP client (LLM calls) | httpx | 0.27.x |
| JSON validation | Pydantic | 2.x |
| CORS | FastAPI CORSMiddleware | built-in |

**No SQLAlchemy. No Alembic.** Raw sqlite3 with manual SQL. Schema is small enough; an ORM adds no value here.

**No Redis. No Celery. No task queue.** LLM calls are synchronous within the request. For hackathon scope this is fine — two parallel LLM calls (exercise + theory) use asyncio.gather.

---

## LLM

```
API_KEY    = sk-live-02a2d375f09d2f74770fdf6c8efb3cb8c8472de52a7002d69bfdbdf716826007
BASE_URL   = https://api.aicredits.in/v1
MODEL      = meta-llama/llama-3-8b-instruct
ENDPOINT   = POST {BASE_URL}/chat/completions   ← OpenAI-compatible format
```

**All LLM calls use the OpenAI chat completions format:**
```python
{
    "model": "meta-llama/llama-3-8b-instruct",
    "messages": [{"role": "user", "content": "..."}],
    "temperature": 0.3,          # low — we want consistent structured output
    "max_tokens": 1200,
    "response_format": None      # plain text, JSON extracted manually
}
```

**No LangChain. No LlamaIndex. No prompt framework.** Raw httpx POST to the endpoint. Prompts are Python f-strings in `prompts.py`.

**JSON extraction strategy:** All prompts instruct the model to return only valid JSON. Backend strips markdown fences (` ```json `) before parsing. On JSONDecodeError → retry once with temperature=0.1 and stricter system message. On second failure → load from fallback exercise bank.

---

## Embeddings

```
MODEL = all-MiniLM-L6-v2
```

Run locally via `sentence-transformers` library. Used only for semantic similarity in context rotation (checking new context is sufficiently different from previous). Not used for retrieval or vector DB — no vector DB in this project.

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
```

---

## Environment

```
# .env (root of project)
LLM_API_KEY=sk-live-02a2d375f09d2f74770fdf6c8efb3cb8c8472de52a7002d69bfdbdf716826007
LLM_BASE_URL=https://api.aicredits.in/v1
LLM_MODEL=meta-llama/llama-3-8b-instruct
EMBEDDING_MODEL=all-MiniLM-L6-v2
DB_PATH=./graduent.db
FRONTEND_URL=http://localhost:5173
```

Loaded via `python-dotenv` on backend. Vite exposes `VITE_API_URL=http://localhost:8000` to frontend.

---

## Project Structure

```
graduent/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── landing/
│   │   │   │   └── LandingPage.jsx
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   ├── sidebar/
│   │   │   │   ├── RoadmapPanel.jsx
│   │   │   │   ├── ErrorLogPanel.jsx
│   │   │   │   ├── WeightsPanel.jsx
│   │   │   │   └── PipelinePanel.jsx
│   │   │   ├── exercise/
│   │   │   │   ├── ExerciseShell.jsx
│   │   │   │   ├── CodeTab.jsx
│   │   │   │   ├── TheoryTab.jsx
│   │   │   │   ├── AltWayTab.jsx
│   │   │   │   ├── BlankInput.jsx
│   │   │   │   ├── OutputRail.jsx
│   │   │   │   ├── FeedbackOverlay.jsx
│   │   │   │   └── PredictionUI.jsx
│   │   │   └── shared/
│   │   │       ├── GlassCard.jsx
│   │   │       ├── ErrorTypeBadge.jsx
│   │   │       └── RadarChart.jsx
│   │   ├── hooks/
│   │   │   ├── useGradient.js       ← cursor-reactive gradient logic
│   │   │   └── useSession.js
│   │   ├── context/
│   │   │   └── SessionContext.jsx
│   │   ├── api/
│   │   │   └── client.js            ← all fetch calls in one file
│   │   ├── styles/
│   │   │   └── index.css            ← gradient, grain, glass CSS vars
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/
│   ├── main.py                      ← FastAPI app, router includes
│   ├── database.py                  ← sqlite3 connection, schema init
│   ├── models.py                    ← Pydantic request/response models
│   ├── prompts.py                   ← all LLM prompt strings
│   ├── llm.py                       ← httpx LLM client, retry logic
│   ├── classifier.py                ← rule-based error classifier
│   ├── error_profile.py             ← exponential decay weight update
│   ├── spaced_rep.py                ← SM-2 algorithm
│   ├── exercise_bank/               ← fallback pre-baked exercises
│   │   ├── ml_tokenization.json
│   │   ├── dsa_sorting.json
│   │   └── ...
│   └── routers/
│       ├── session.py
│       ├── roadmap.py
│       ├── exercise.py
│       ├── submission.py
│       ├── pipeline.py
│       └── spaced_rep.py
│
├── .env
├── requirements.txt
└── README.md
```

---

## Dependencies

### frontend/package.json
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "vite": "^5.3.1"
  }
}
```

### backend/requirements.txt
```
fastapi==0.111.0
uvicorn==0.29.0
httpx==0.27.0
pydantic==2.7.4
python-dotenv==1.0.1
sentence-transformers==3.0.1
```

---

## Dev Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev          # starts on http://localhost:5173

# DB init (auto-runs on backend start via database.py)
# No migration tool — schema dropped and recreated on each start for hackathon
```

---

## Hard Rules for AI Codegen

1. **Never import from langchain, llama_index, openai SDK, or anthropic SDK.** LLM calls use raw httpx only.
2. **Never use SQLAlchemy.** All DB calls are `conn = sqlite3.connect(DB_PATH)` with raw SQL strings.
3. **Never use axios.** Frontend HTTP is native `fetch` wrapped in `api/client.js`.
4. **Never use styled-components or emotion.** Tailwind + `index.css` only.
5. **Never add a new npm package without a comment explaining why Tailwind/Recharts couldn't cover it.**
6. **All LLM calls go through `llm.py`.** No inline httpx calls in routers.
7. **All prompts live in `prompts.py`.** No inline f-strings in routers or services.
8. **SQLite DB file is `graduent.db` at project root.** Never hardcode a different path; always read `DB_PATH` from env.
9. **Session ID is the only auth primitive.** No JWT, no cookies, no auth headers.
10. **Frontend talks to backend only via `api/client.js`.** No direct fetch calls in components.
