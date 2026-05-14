# Graduent — Product Requirements Document (PRD)

**Version:** 1.0  
**Stream:** ML/AI · DSA · LLMs  
**Status:** Pre-build, Hackathon MVP  

---

## 1. Product Overview

### 1.1 What Graduent Is

Graduent is an adaptive coding learning platform that diagnoses *why* you fail, not just *that* you failed. It is built around one insight: the gap between a beginner and an intermediate programmer is not knowledge — it is diagnosis. Existing platforms measure outcomes. Graduent measures understanding.

Every session runs on a single loop:

```
Attempt exercise → failure diagnosed → error profile updated →
next exercise targets exact weakness → repeat
```

### 1.2 The Core Differentiators

**Error-adaptive exercise generation** — the system classifies every mistake into a typed taxonomy (syntax / logic / typo / scope / state-assumption) and uses that fingerprint to directly control where blanks appear in the next exercise. Not topic-level adaptation. Error-type-level adaptation.

**Intermediate output prediction** — every significant line of code has an output annotation (type · shape · sample). Before revealing it, the student predicts it. Wrong predictions are classified as state-assumption errors and feed the error profile. This is the only mechanism that catches the most common ML bug: not knowing what data structure you're holding at a given line.

**Context rotation on repeated failure** — when the same error type occurs twice on the same concept, the system generates a new exercise with a completely different application context (same algorithm, new Pokémon scenario / F1 scenario) so the student cannot pattern-match their way through the retry.

**Semantic tagging** — every block of code is tagged as `[scaffold]`, `[core logic]`, or `[output]`. Blanks start in core logic only. Scaffold fades in as difficulty increases. Students can also be asked to identify which block is core logic — a skill in itself.

**Pipeline stitching** — after completing all 3 node exercises in a topic cluster, the student earns access to the stitching layer: filling in the glue code that connects Block 1 → Block 2 → Block 3. Interface mismatches (wrong output shape feeding the next block) are caught and classified as state-assumption errors.

### 1.3 Target User

Primary: ML/AI students at the intermediate-beginner level who are learning to implement models from scratch (PyTorch, transformers, fine-tuning) and keep making the same class of errors without knowing why.

Secondary: DSA students who want to understand algorithms rather than memorize solutions.

### 1.4 Deployment Context

Hackathon demo. No authentication layer. No user accounts. State is stored in SQLite locally. LLM calls go through the provided API endpoint.

---

## 2. Technical Stack

### 2.1 LLM

```
LLM_API_KEY    = sk-live-02a2d375f09d2f74770fdf6c8efb3cb8c8472de52a7002d69bfdbdf716826007
LLM_BASE_URL   = https://api.aicredits.in/v1
LLM_MODEL      = meta-llama/llama-3-8b-instruct
EMBEDDING_MODEL = all-MiniLM-L6-v2
```

All LLM interactions are prompt-engineering based. The model is called for:

- Exercise generation (fill-in-the-blank from a code block + error profile)
- Context rotation (rewrite problem in new theme context)
- Feedback generation (what you wrote · what it should be · why)
- Theory callout generation (layer 1/2/3 for each line)
- Stitch blank generation (glue code between pipeline blocks)

### 2.2 Database

**SQLite** — local, no server required, zero config for hackathon.

### 2.3 Frontend

React + Tailwind. Grainy gradient background (white + yellow + pink), cursor-reactive. Glassmorphism panels. MacBook-style pill tabs on exercise screen.

### 2.4 Backend

FastAPI (Python). Handles LLM calls, SQLite reads/writes, exercise generation logic, error classification logic.

---

## 3. Database Schema

### 3.1 `session`

Stores the current session state. Since there's no auth, one active session at a time.

```sql
CREATE TABLE session (
    id              INTEGER PRIMARY KEY,
    stream          TEXT NOT NULL,        -- 'ML' | 'DSA' | 'LLMs'
    theme           TEXT NOT NULL,        -- user-entered e.g. 'pokemon'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 `error_log`

Every mistake the student makes, fully classified.

```sql
CREATE TABLE error_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER REFERENCES session(id),
    topic           TEXT NOT NULL,        -- e.g. 'tokenization'
    node_index      INTEGER NOT NULL,     -- which of the 3 questions (1/2/3)
    line_context    TEXT,                 -- the line of code the blank was on
    what_written    TEXT NOT NULL,        -- what the student typed
    what_expected   TEXT NOT NULL,        -- correct answer
    error_type      TEXT NOT NULL,        -- 'syntax'|'logic'|'typo'|'scope'|'state'
    error_subtype   TEXT,                 -- e.g. 'off_by_one', 'wrong_variable'
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 `error_profile`

Aggregated weighted fingerprint per error type. Updated after every submission.

```sql
CREATE TABLE error_profile (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER REFERENCES session(id),
    error_type      TEXT NOT NULL,        -- 'syntax'|'logic'|'typo'|'scope'|'state'
    weight          REAL NOT NULL DEFAULT 0.0,  -- exponential decay weighted frequency
    last_updated    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 `node_progress`

Tracks which nodes are complete, in progress, or locked.

```sql
CREATE TABLE node_progress (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER REFERENCES session(id),
    topic           TEXT NOT NULL,
    node_index      INTEGER NOT NULL,     -- 1, 2, or 3
    status          TEXT NOT NULL,        -- 'locked'|'in_progress'|'complete'
    attempts        INTEGER DEFAULT 0,
    dominant_error  TEXT,                 -- most frequent error type on this node
    completed_at    TIMESTAMP
);
```

### 3.5 `spaced_repetition`

Tracks each core logic block's retention schedule.

```sql
CREATE TABLE spaced_repetition (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER REFERENCES session(id),
    block_name      TEXT NOT NULL,        -- e.g. 'dijkstra_relaxation_step'
    topic           TEXT NOT NULL,
    interval_days   REAL DEFAULT 1.0,     -- current review interval
    ease_factor     REAL DEFAULT 2.5,     -- SM-2 ease factor
    due_date        TIMESTAMP,
    last_reviewed   TIMESTAMP,
    times_correct   INTEGER DEFAULT 0,
    times_wrong     INTEGER DEFAULT 0
);
```

### 3.6 `pipeline_progress`

Tracks pipeline stitching state per topic cluster.

```sql
CREATE TABLE pipeline_progress (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER REFERENCES session(id),
    cluster_name    TEXT NOT NULL,        -- e.g. 'text_preprocessing_pipeline'
    block_index     INTEGER NOT NULL,     -- 1, 2, 3
    block_complete  BOOLEAN DEFAULT FALSE,
    stitch_complete BOOLEAN DEFAULT FALSE,
    stitch_attempt  TEXT,                 -- what the student wrote for the stitch
    stitch_error    TEXT                  -- classified error if stitch was wrong
);
```

### 3.7 `output_predictions`

Tracks per-line output predictions for the intermediate output feature.

```sql
CREATE TABLE output_predictions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER REFERENCES session(id),
    topic           TEXT NOT NULL,
    node_index      INTEGER NOT NULL,
    line_number     INTEGER NOT NULL,
    predicted_type  TEXT,
    predicted_shape TEXT,
    actual_type     TEXT,
    actual_shape    TEXT,
    correct         BOOLEAN,
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Feature Requirements

### 4.1 Landing Page

**Purpose:** First impression. No auth friction. Get the student into the product in under 10 seconds.

**Requirements:**

- Full viewport, white + yellow + pink grainy gradient, cursor-reactive (gradient subtly shifts toward cursor position)
- Product name `GRADUENT` centered, large
- Tagline: "learn to understand code. not recognize it."
- Stream selector: pill buttons `[ ML/AI ]  [ DSA ]  [ LLMs ]` — one must be selected
- Theme input: free text field, placeholder "enter your theme (e.g. pokemon, formula 1, marvel)"
- `[ Start → ]` button — disabled until both stream and theme are filled
- On Start: writes a new row to `session` table, navigates to main app
- Gradient grain texture at ~8% opacity over the gradient
- No scrolling, no feature showcase, no nav

**LLM involvement:** None on this screen.

---

### 4.2 Main App Layout

**Purpose:** Persistent shell that holds sidebar + main content area.

**Requirements:**

- Gradient running behind everything at all times (same white/yellow/pink grain, cursor-reactive but subtler than landing — less movement so it doesn't distract from learning)
- Left sidebar: glass panel, white ~65% opacity, 1px soft border, 20px border radius
- Main content area: glass panel, white ~75% opacity, slightly more opaque than sidebar
- Sidebar always visible, not collapsible (too important for demo)
- Sidebar width: ~260px fixed
- Main area: fills remaining width

---

### 4.3 Sidebar — Roadmap View

**Purpose:** Show the student where they are, where they've been, where they're going. The roadmap reorders itself based on the error profile.

**Requirements:**

**Structure:**

- Vertical node graph
- Each topic is a parent node with 3 child nodes beneath it
- Child nodes = the 3 questions for that topic

**Node states:**

- `green` — completed, no significant errors
- `amber` — completed, had errors (error profile flagged)
- `red` — needs repair (error profile says revisit before moving on)
- `gray` — locked (previous node not complete)
- `blue pulse` — currently active

**Node display:**

```
◉ Selection Sort
├── ① Sort by Attack         ✓  [green]
├── ② Sort by Sp. Attack     ◑  [amber — in progress]
└── ③ Sort by Total Stats    ○  [gray — locked]
```

**Progress bar** under each parent topic: `2 / 3 complete`

**Roadmap reordering logic:**

- If error profile shows `logic.wrong_variable` weight > 0.3, surface the topic where that error was first made — bump it before the next new topic
- If a node is marked `red`, it appears at the top of the queue regardless of original sequence
- New topics only unlock after current topic's 3 nodes are all `green` or `amber`

**Clicking a node:** loads that node's exercise in the main content area

**LLM involvement:** None. Roadmap order is computed from SQLite data.

---

### 4.4 Sidebar — Error Log View

**Purpose:** Running log of every classified mistake. Student can see exactly what they got wrong, what it should be, and why.

**Requirements:**

**Table columns:**

```
| Error (what written) | Correct (what expected) | Type | Topic |
```

**Behavior:**

- Sorted by most recent first
- Color-coded rows by error type:
  - `syntax` → soft yellow row
  - `logic` → soft pink row
  - `typo` → soft gray row
  - `scope` → soft lavender row
  - `state` → soft coral row
- Clicking a row expands it to show: full line context + the `why` explanation generated by LLM at time of error
- All data read from `error_log` table in SQLite

---

### 4.5 Sidebar — Weightage View

**Purpose:** Visual representation of the student's error fingerprint. The radar chart is the core diagnostic artifact of the product.

**Requirements:**

**Radar chart — 5 axes:**

- Syntax
- Logic
- Typo
- Scope
- State-assumption

**Behavior:**

- Updates live after every submission (re-fetches from `error_profile` table)
- Pulse animation when a weight increases
- Dominant error type shown below chart in text: `"your most frequent: Logic errors (43%)"`
- All weights computed using exponential decay: recent errors weighted more heavily than old ones
- Decay formula: `weight = Σ (error_count_i × e^(-λ × days_since_i))` where λ = 0.1

---

### 4.6 Sidebar — Pipeline Stitching View

**Purpose:** Boss-level exercise. After completing all 3 nodes in a topic cluster, the student stitches the blocks together with glue code.

**Requirements:**

**Structure:**

- Checklist of blocks, vertical
- Each block has:
  - Checkbox (☑ complete / ☐ locked)
  - Block name and brief description
  - Dimmed code preview of the block's content
  - Stitch blank between it and the next block

**Unlock logic:**

- Block 1 stitch: unlocks after all 3 nodes of Block 1 topic complete
- Block 2 stitch: unlocks after Block 1 stitch correct
- Block 3 stitch: unlocks after Block 2 stitch correct

**Stitch blank behavior:**

- Multi-line text input
- Student writes the glue code that connects Block N output to Block N+1 input
- On submit: backend validates that output shape of Block N is compatible with input expectation of Block N+1
- If wrong: classified as `state.interface_mismatch` error, feedback shows actual shape vs expected shape
- If correct: block unlocks, progress moves forward

**Final state:**

- All blocks + stitches complete → full pipeline runs top to bottom
- Output rail animates showing every intermediate data state across the entire pipeline in sequence

**LLM involvement:**

- Generating the stitch blank prompt ("connect the output of tokenization to the positional embedding layer")
- Generating feedback when stitch is wrong
- All in theme context

---

### 4.7 Exercise Interface — Main Screen

**Purpose:** The core learning loop. Student fills blanks, predicts outputs, gets feedback, moves forward.

**Requirements:**

**Triggered by:** clicking any unlocked node in the roadmap

**MacBook window aesthetic:**

- Rounded corners (20px+)
- `○ ○ ○` traffic light dots top left (decorative, non-functional)
- Glass panel with gradient behind it

**Pill tabs at top:**

```
[ Code ]  [ Theory ]  [ Alt Way ]  [ Error Log ]
```

**Difficulty selector below tabs:**

```
[ Easy — 80% scaffold ]  [ Med — 50% scaffold ]  [ Hard — 20% scaffold ]
```

- Default: Easy for first node of a new topic, Med for second, Hard for third
- Student can override
- Scaffold percentage = how much of the non-core-logic code is pre-filled

**Semantic tag above code block:**

```
░ SCAFFOLD ░     (muted, gray)
▓ CORE LOGIC ▓   (highlighted, pink accent)
── OUTPUT ──     (subtle, yellow accent)
```

---

### 4.8 Exercise Interface — Code Tab

**Purpose:** Fill in the blanks. Submit line by line / block by block.

**Requirements:**

**Code display:**

- Syntax-highlighted code
- Blanks rendered as soft underline inputs with warm accent on focus
- Scaffold code visible but visually muted (lower opacity) at Easy/Med
- Core logic blanks always present regardless of difficulty

**Intermediate output — per line:**

- Small arrow annotation beside each significant line
- Before reveal: prediction UI

  ```
  What is `encoded` after this line?
  ○ List[str]
  ○ List[List[int]]   
  ○ torch.Tensor
  ○ Dict[str, int]
  ```

- After correct blank submission: reveal animates in

  ```
  Type   → List[List[int]]
  Size   → 800 sequences
  Sample → [[2, 15, 43, 0, 0], [2, 8, 91, 33, 0], ...]
  ```

- Wrong prediction → logged to `output_predictions` table as `state-assumption` error

**Submit behavior:**

- `[ Submit this step ]` — submits current blank or current block
- Not submit-all-at-once — step by step
- On correct: green flash, move to next blank
- On wrong: red flash, inline feedback below blank, retry

**LLM involvement:**

- Generating the exercise (code block + blanks + expected answers) from topic + theme + error profile
- Prompt structure:

  ```
  Given topic: {topic}
  Theme: {theme}
  Error profile: {error_profile_json}
  Scaffold level: {scaffold_percent}
  
  Generate a fill-in-the-blank exercise where:
  - blanks are biased toward these error types: {top_2_error_types}
  - each blank has an expected_answer and error_type_being_tested tag
  - code uses {theme}-specific variable names and context
  - output a JSON object with: code_with_blanks, blanks[], intermediate_outputs[]
  ```

---

### 4.9 Exercise Interface — Theory Tab

**Purpose:** Concept explanation anchored to the current line. Theory and code always in the same view.

**Requirements:**

**Per-line callout structure:**

- Layer 1 (default, always visible): one sentence plain English — what this line does
- Layer 2 (tap to expand): the concept behind it — why this approach
- Layer 3 (tap again): math / formal definition if relevant

**Behavior:**

- Callout updates as student moves through blanks — always shows theory for the current active line
- Student controls depth, not the system
- All three layers pre-generated by LLM when exercise loads

**LLM involvement:**

- Generating theory callouts for each line at exercise load time
- Prompt:

  ```
  For this line of code: {line}
  In the context of topic: {topic}
  Generate 3 layers of explanation:
  layer_1: one sentence, plain english, no jargon
  layer_2: the concept — why this specific approach, what alternatives exist
  layer_3: formal definition or math if applicable, else null
  Output as JSON.
  ```

---

### 4.10 Exercise Interface — Alt Way Tab

**Purpose:** Anti-memorization mechanic. Same logic, different representation. Tests whether understanding is portable across syntax.

**Requirements:**

**Behavior:**

- Shows the same code block rewritten in an alternate representation
- Examples:
  - List comprehension ↔ nested `for` loops
  - `.items()` iteration ↔ explicit key lookup
  - `enumerate()` ↔ manual index counter
- Student fills the same logical blanks but in the alternate form
- Completing Alt Way is optional but rewards bonus weight reduction on the corresponding error type in the profile

**LLM involvement:**

- Generating the alternate representation at exercise load time
- Prompt:

  ```
  Rewrite this code block: {code_block}
  In this alternate representation: {alt_form}
  Keep the same logical structure and variable names where possible.
  Generate as fill-in-the-blank with the same blank positions as the original.
  ```

---

### 4.11 Feedback Screen

**Purpose:** Triggered on wrong submission. Explains what went wrong, why, and what concept was violated.

**Requirements:**

**Display (inline overlay below the blank, not a new page):**

```
✗  What you wrote:   word2idx[token] = i+3
✓  Should be:        word2idx[word] = i+4  (start=4)
   Why:              Special tokens occupy indices 0–3.
                     Regular vocabulary must start at index 4.
   Error type:       Logic — off_by_one
   Follow-up:        How many special tokens are defined above?
```

**Behavior:**

- Error logged to `error_log` table
- Error profile weights updated in `error_profile` table
- Radar chart in sidebar pulses to reflect update
- Follow-up micro-question appears — student must answer it before moving to next blank
- If same error type occurs twice on same topic: flag for context rotation on next node

**LLM involvement:**

- Generating the `Why` explanation and `Follow-up` question
- Prompt:

  ```
  Student wrote: {what_written}
  Correct answer: {what_expected}
  Line context: {line_context}
  Topic: {topic}
  
  Generate:
  why: one sentence explaining the concept violation
  followup: one targeted question testing only that concept
  Output as JSON.
  ```

---

### 4.12 Context Rotation

**Purpose:** When the same error type occurs twice on the same concept, generate a new exercise in a completely different application context. Forces the student to reason from understanding rather than pattern-matching.

**Requirements:**

**Trigger condition:** `error_log` shows same `error_type` + same `topic` + `node_index` different → 2 occurrences within a session

**Behavior:**

- Next node exercise loads with a rotated context
- Same algorithm, same topic, different story within the theme
- Rotation is designed to make the previously-failed error type structurally prominent

**Example (Pokémon / Dijkstra's):**

- Node 1: "find shortest route between Pokémon gyms in Kanto"
- Node 2 (rotated): "find optimal battle sequence to reach Elite Four with minimum fainting"
  - If previous error was on edge relaxation → new problem makes relaxation the central unavoidable step

**LLM involvement:**

- Generating the rotated context
- Prompt:

  ```
  Algorithm: {algorithm}
  Theme: {theme}
  Previous context: {previous_context}
  Error type that triggered rotation: {error_type}
  Error subtype: {error_subtype}
  
  Generate a new problem context where:
  - same algorithm applies
  - the context is completely different from the previous one
  - the {error_subtype} operation is structurally prominent and unavoidable
  - all variable names and story use {theme} world
  Output: problem_statement, context_description
  ```

---

### 4.13 Spaced Repetition Queue

**Purpose:** Resurface core logic blocks before they're forgotten. Micro-exercises, 60 seconds each.

**Requirements:**

**Sidebar display:**

```
3 blocks due for review
  ▸ Dijkstra relaxation step     due today
  ▸ Tokenization flatten loop    due today
  ▸ LoRA forward pass            due in 2 days
```

**Micro-exercise:**

- Single blank, core logic block only
- Same MacBook exercise interface, simplified
- On correct: interval extends (SM-2 algorithm)
- On wrong: interval resets, error logged

**SM-2 algorithm:**

```python
if correct:
    if times_correct == 0:
        interval = 1
    elif times_correct == 1:
        interval = 6
    else:
        interval = interval * ease_factor
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
else:
    interval = 1
    times_correct = 0
```

**LLM involvement:**

- Generating micro-exercise blank from stored block
- Same format as regular exercise but single blank only

---

## 5. LLM Prompt Architecture

### 5.1 Prompt Patterns

All prompts follow this structure:

1. **Role**: "You are an expert coding educator building exercises for a student."
2. **Context**: theme, stream, topic, difficulty, error profile
3. **Task**: specific generation task
4. **Constraints**: output format (always JSON), length limits, error type targeting
5. **Output schema**: explicit JSON schema the model must follow

### 5.2 Output Format Enforcement

All LLM outputs are requested as JSON. The backend parses and validates before using. If parse fails, retry once with stricter prompt. If second parse fails, fall back to pre-baked exercise from local exercise bank.

### 5.3 Exercise Generation Prompt (full)

```
You are an expert coding educator.

Student profile:
- Stream: {stream}
- Theme: {theme}  
- Topic: {topic}
- Node: {node_index} of 3
- Scaffold level: {scaffold_percent}%
- Error profile: {error_profile_json}
- Context rotation: {rotation_context if rotating else 'none'}

Generate a fill-in-the-blank coding exercise where:
1. All variable names, dataset names, and problem context use the {theme} world
2. At least 60% of blanks target these error types: {top_2_error_types}
3. Each blank is tagged with the error_type it is designed to catch
4. Scaffold code ({scaffold_percent}% of non-core-logic) is pre-filled
5. Core logic blocks always have blanks regardless of scaffold level

Return ONLY valid JSON matching this schema:
{{
  "problem_statement": "string",
  "code_with_blanks": "string (use ___ for blanks)",
  "blanks": [
    {{
      "blank_id": "int",
      "expected_answer": "string",
      "error_type_tested": "string",
      "line_context": "string"
    }}
  ],
  "intermediate_outputs": [
    {{
      "line_number": "int",
      "variable_name": "string",
      "actual_type": "string",
      "actual_shape": "string",
      "actual_sample": "string",
      "prediction_options": ["string", "string", "string", "string"]
    }}
  ],
  "semantic_tags": [
    {{
      "line_range": [int, int],
      "tag": "scaffold|core_logic|output"
    }}
  ]
}}
```

---

## 6. Error Classification Logic

### 6.1 Classification Flow

When a student submits a wrong answer:

```
1. diff(what_written, what_expected)
2. run rule-based classifier first (fast, deterministic)
3. if rule-based returns 'unknown' → send to LLM classifier
4. store result in error_log
5. update error_profile weights
```

### 6.2 Rule-Based Classifier

```python
def classify_error(written, expected, line_context):
    # Typo check — edit distance ≤ 2, same token type
    if edit_distance(written, expected) <= 2:
        return 'typo', detect_subtype(written, expected)
    
    # Syntax check — valid Python but wrong structure
    if is_valid_python(written) and not is_valid_python_in_context(written, line_context):
        return 'syntax', detect_syntax_subtype(written, expected)
    
    # Off-by-one check
    if is_numeric_delta(written, expected, delta=1):
        return 'logic', 'off_by_one'
    
    # Wrong variable check — correct operation, wrong variable name
    if same_operation(written, expected) and different_variable(written, expected):
        return 'logic', 'wrong_variable'
    
    # Missing self check
    if 'self.' in expected and 'self.' not in written:
        return 'scope', 'missing_self'
    
    # State assumption — wrong type/shape assumption
    if output_prediction_wrong(written, expected):
        return 'state', 'wrong_type_assumption'
    
    return 'unknown', None
```

### 6.3 Error Profile Weight Update

```python
def update_error_profile(session_id, error_type, timestamp):
    # Exponential decay: recent errors weighted more
    # λ = 0.1, decay over days
    existing = db.get_error_profile(session_id, error_type)
    
    # Add new error with weight 1.0
    # Decay all existing weights
    lambda_ = 0.1
    for entry in existing:
        days_since = (now - entry.last_updated).days
        entry.weight *= exp(-lambda_ * days_since)
    
    new_weight = sum(e.weight for e in existing) + 1.0
    db.upsert_error_profile(session_id, error_type, new_weight)
```

---

## 7. Roadmap Content

### 7.1 ML/AI Track

```
Cluster 1 — Text Preprocessing
  Node 1: Tokenization (pokemon descriptions)
  Node 2: Vocabulary building & encoding
  Node 3: Padding & tensor conversion
  Pipeline stitch: preprocessing → embedding input

Cluster 2 — RNNs
  Node 1: Embedding layer
  Node 2: RNN forward pass
  Node 3: Training loop
  Pipeline stitch: embedding → RNN → output

Cluster 3 — Attention & Transformers
  Node 1: Attention score computation
  Node 2: Multi-head attention
  Node 3: Positional encoding
  Pipeline stitch: attention → feedforward → layer norm

Cluster 4 — Fine-tuning
  Node 1: LoRA implementation
  Node 2: Dataset & DataLoader
  Node 3: Training with frozen base model
  Pipeline stitch: LoRA model → training loop → eval

Cluster 5 — Prefix Tuning
  Node 1: Prefix encoder
  Node 2: Past key values injection
  Node 3: Full prefix-tuned model
  Pipeline stitch: prefix → base model → generation
```

### 7.2 DSA Track

```
Cluster 1 — Sorting
  Node 1: Selection Sort
  Node 2: Bubble Sort
  Node 3: Merge Sort

Cluster 2 — Graph Algorithms
  Node 1: BFS
  Node 2: DFS
  Node 3: Dijkstra's

Cluster 3 — Dynamic Programming
  Node 1: Fibonacci (memoization)
  Node 2: 0/1 Knapsack
  Node 3: Longest Common Subsequence
```

### 7.3 LLMs Track

```
Cluster 1 — Tokenization & Embeddings
  (same as ML Cluster 1 + embedding concepts)

Cluster 2 — Transformer Architecture
  (same as ML Cluster 3)

Cluster 3 — Fine-tuning Methods
  Node 1: Full fine-tuning
  Node 2: LoRA
  Node 3: Prefix Tuning
  Pipeline stitch: data → tokenizer → model → training

Cluster 4 — Inference & Generation
  Node 1: Greedy decoding
  Node 2: Beam search
  Node 3: Sampling (temperature, top-k, top-p)
```

---

## 8. Screen-by-Screen Requirements Summary

| Screen | Key Components | LLM Used | DB Tables |
|--------|---------------|----------|-----------|
| Landing | Stream picker, theme input, gradient | No | session |
| Main app shell | Sidebar + main area, gradient | No | session |
| Sidebar: Roadmap | Node graph, color states, progress | No | node_progress |
| Sidebar: Error Log | Table, color rows, expandable | No | error_log |
| Sidebar: Weightage | Radar chart, dominant error | No | error_profile |
| Sidebar: Pipeline | Checklist, stitch blanks | Yes | pipeline_progress |
| Exercise: Code | Blanks, output rail, predictions | Yes | error_log, output_predictions |
| Exercise: Theory | Layered callouts | Yes | (cached at load) |
| Exercise: Alt Way | Alternate representation blanks | Yes | error_log |
| Feedback overlay | Why, follow-up | Yes | error_log, error_profile |
| Spaced rep queue | Due blocks, micro-exercise | Yes | spaced_repetition |

---

## 9. Success Metrics (Hackathon Demo)

- Judge can complete one full exercise loop (attempt → error → feedback → next exercise) within 2 minutes
- Error fingerprint radar visibly updates after a wrong submission
- Context rotation demonstrably produces a different Pokémon scenario after 2 same-type errors
- Intermediate output prediction UI works on at least 3 consecutive lines
- Pipeline stitching shows at least 2 blocks with a stitch blank between them
- Roadmap shows at least 5 nodes with varying color states

---

## 10. Out of Scope for Hackathon MVP

- User authentication and accounts
- Multi-user sessions
- Cloud database (use SQLite only)
- Mobile responsive layout
- Streak tracking and XP system
- Custom theme generation beyond text substitution
- Voice input
- Collaborative features

---

*Graduent PRD v1.0 — built for people who want to understand code, not just recognize it.*
