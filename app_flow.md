# Graduent — App Flow Specification

---

## Overview: The Master Loop

Every user journey in Graduent is a variant of one loop:

```
Session start
  └─→ Select stream + theme
        └─→ Load roadmap
              └─→ Click node → Load exercise
                    └─→ Fill blank
                          ├─→ Correct → next blank / output prediction
                          │     └─→ All blanks done → node complete → roadmap update
                          └─→ Wrong → error classified → feedback overlay → follow-up
                                └─→ 2x same error on same topic → context rotation flag
                                      └─→ next node uses rotated context
```

Spaced repetition queue runs parallel to this loop — surfaced as a card in the main area whenever due blocks exist.

---

## Flow 1: Session Initialization

### Entry point: Landing page

```
User arrives at /
  │
  ├─→ Gradient + grain renders immediately (no loading state)
  │
  ├─→ User clicks stream pill [ ML/AI | DSA | LLMs ]
  │     └─→ Pill visually selects (dark fill), others deselect
  │
  ├─→ User types in theme input
  │     └─→ Start button enables as soon as both stream selected + theme non-empty
  │
  └─→ User clicks [ Start → ]
        │
        ├─→ Frontend: POST /api/session { stream, theme }
        │     └─→ Backend: INSERT INTO session (stream, theme) → returns session_id
        │
        ├─→ Backend: seed node_progress rows for all nodes in selected stream
        │     (status='locked' for all except first node → 'in_progress')
        │
        ├─→ Backend: seed error_profile rows for all 5 error types, weight=0.0
        │
        ├─→ Frontend stores session_id in memory / React state
        │
        └─→ Navigate to /app
              └─→ Main app shell mounts, sidebar loads roadmap view
```

**State after flow 1:**
- `session` table: 1 row
- `node_progress`: N rows (all locked except node 1 of cluster 1 = in_progress)
- `error_profile`: 5 rows, all weight 0.0
- No exercises loaded yet

---

## Flow 2: Roadmap Load & Navigation

### On /app mount

```
Component mounts
  │
  ├─→ GET /api/roadmap?session_id={id}
  │     └─→ Backend: SELECT * FROM node_progress WHERE session_id=?
  │           ordered by cluster, node_index
  │           returns: [{topic, node_index, status, attempts, dominant_error}]
  │
  ├─→ GET /api/error_profile?session_id={id}
  │     └─→ Returns current 5 weights → radar chart renders
  │
  └─→ Sidebar renders roadmap:
        Cluster 1
          ◉ Tokenization (parent)
            ├── ① Sort by Attack         [in_progress — blue pulse]
            ├── ② Sort by Sp. Attack     [locked]
            └── ③ Sort by Total Stats    [locked]
        Cluster 2
          (locked)
          ...
```

### Roadmap reorder logic (computed backend-side on each load)

```
GET /api/roadmap runs reorder check:

1. Pull error_profile weights
2. If any error_type weight > 0.3:
   - Find the topic in node_progress where dominant_error = that type
   - Bump that topic's nodes to appear before the next new topic
     (insert after current in_progress cluster, before next locked cluster)
3. If any node has status='red' (needs repair):
   - Surface those nodes at top of in_progress queue
4. Return reordered list with reason_for_position field
   (used for tooltip: "Moved up — repeated logic errors on this topic")
```

### Node click → exercise load

```
User clicks unlocked node in roadmap
  │
  ├─→ If node status = 'locked': click does nothing (cursor: not-allowed)
  │
  └─→ If status = 'in_progress' or 'complete':
        │
        ├─→ Check: has this node been attempted this session?
        │     ├─→ Yes: GET /api/exercise/cached?node_id=X → load existing exercise
        │     └─→ No: POST /api/exercise/generate (see Flow 3)
        │
        └─→ Main content area renders exercise interface
              └─→ Sidebar highlights active node with blue pulse
```

---

## Flow 3: Exercise Generation

```
POST /api/exercise/generate
  body: { session_id, topic, node_index, stream }

Backend:
  │
  ├─→ Fetch error_profile weights for session
  │     └─→ compute top_2_error_types (highest weighted)
  │
  ├─→ Fetch current scaffold level for this node
  │     └─→ node_index=1 → 80%, node_index=2 → 50%, node_index=3 → 20%
  │         (override if student changed difficulty)
  │
  ├─→ Check context_rotation flag:
  │     SELECT count(*) FROM error_log
  │     WHERE session_id=? AND topic=? AND error_type=top_error
  │     GROUP BY error_type HAVING count >= 2
  │     └─→ If triggered: add rotation_context to prompt
  │
  ├─→ Build LLM prompt (exercise generation — see PRD §5.3)
  │
  ├─→ Call LLM → parse JSON response
  │     ├─→ Parse success: store in exercise cache, return to frontend
  │     └─→ Parse fail: retry once with stricter prompt
  │           └─→ Second fail: load from local exercise bank (pre-baked fallback)
  │
  └─→ Also generate theory callouts in parallel (separate LLM call):
        POST /api/theory/generate { topic, code_block, node_index }
        └─→ Returns: { line_N: { layer_1, layer_2, layer_3 } } for each significant line
```

**Response shape to frontend:**
```json
{
  "exercise_id": "uuid",
  "problem_statement": "...",
  "code_with_blanks": "...",
  "blanks": [
    { "blank_id": 1, "expected_answer": "...", "error_type_tested": "logic", "line_context": "..." }
  ],
  "intermediate_outputs": [
    { "line_number": 3, "variable_name": "tokens", "actual_type": "List[str]",
      "actual_shape": "(128,)", "actual_sample": "...", "prediction_options": [...] }
  ],
  "semantic_tags": [
    { "line_range": [1,3], "tag": "scaffold" },
    { "line_range": [4,7], "tag": "core_logic" },
    { "line_range": [8,9], "tag": "output" }
  ],
  "theory": { "3": { "layer_1": "...", "layer_2": "...", "layer_3": "..." } },
  "alt_way": { "code_with_blanks": "...", "blanks": [...] }
}
```

---

## Flow 4: Blank Submission (Core Interaction Loop)

This is the most granular flow — it happens on every keypress + submit.

```
Student types into blank input
  │
  ├─→ Input renders with violet underline, no box
  ├─→ Width auto-expands to text content (min 80px)
  └─→ No live validation — submit only on explicit action

Student clicks [ Submit this step ] or presses Enter
  │
  ├─→ Frontend: POST /api/submission
  │     body: { session_id, exercise_id, blank_id, what_written, expected_answer,
  │             topic, node_index, line_context, error_profile_snapshot }
  │
  └─→ Backend: classify_answer()
        │
        ├─→ CORRECT (what_written == expected_answer, or close match for typos):
        │     │
        │     ├─→ Blank turns green (underline → #059669, text → #059669)
        │     ├─→ 200ms ease animation
        │     ├─→ If this line has an intermediate output:
        │     │     └─→ Output annotation reveals (slide down 200ms)
        │     │           └─→ If prediction was wrong → see Flow 4b
        │     ├─→ Focus advances to next blank automatically
        │     ├─→ If no more blanks in exercise → Flow 5 (node complete)
        │     └─→ Return: { correct: true, next_blank_id, reveal_output? }
        │
        └─→ WRONG:
              │
              ├─→ Run rule-based classifier first:
              │     edit_distance ≤ 2 → 'typo'
              │     valid python, wrong context → 'syntax'
              │     numeric delta=1 → 'logic/off_by_one'
              │     same operation, wrong variable → 'logic/wrong_variable'
              │     missing self. → 'scope/missing_self'
              │     else → 'unknown' → send to LLM classifier
              │
              ├─→ POST /api/feedback/generate (parallel to classification)
              │     body: { what_written, what_expected, line_context, topic }
              │     └─→ LLM returns: { why: "...", followup_question: "...", followup_answer: "..." }
              │
              ├─→ INSERT INTO error_log (all fields)
              │
              ├─→ UPDATE error_profile (exponential decay weight update)
              │
              ├─→ Check context rotation trigger:
              │     SELECT count FROM error_log WHERE session=? AND topic=? AND error_type=?
              │     If count >= 2 → set rotation_flag in session state
              │
              ├─→ Frontend: blank flashes red × 2 (300ms total)
              │
              ├─→ Feedback overlay renders below blank:
              │     ✗ You wrote: [what_written]    ← red bg
              │     ✓ Expected:  [expected_answer]  ← green bg
              │        Why: [llm_why]
              │        Error type: [type badge]
              │
              ├─→ Follow-up micro-question renders:
              │     "[followup_question]"  [ _______ ]
              │     → Student must answer before advancing
              │     → Follow-up answer evaluated same way (but not logged as new error if wrong)
              │
              ├─→ Sidebar radar chart: pulse animation on updated axis
              │
              └─→ Student corrects blank + retries (blank stays active, attempts++ in node_progress)
```

### Flow 4b: Output Prediction (parallel to blank submission)

```
Exercise loads with intermediate_outputs
  │
  └─→ For each annotated line:
        When student reaches that line's blank:
          │
          ├─→ Output rail shows prediction UI (before annotation):
          │     "What does [variable] contain here?"
          │     4 pills: [ Type A ] [ Type B ] [ Type C ] [ Type D ]
          │
          ├─→ Student selects one pill
          │     │
          │     ├─→ CORRECT:
          │     │     Pill → green (#059669 bg, white text)
          │     │     Annotation slides down into output rail (200ms)
          │     │     INSERT INTO output_predictions (correct=true)
          │     │
          │     └─→ WRONG:
          │           Selected pill → red flash
          │           Correct pill → green highlight
          │           Annotation reveals anyway (with explanation)
          │           INSERT INTO output_predictions (correct=false)
          │           UPDATE error_profile: 'state' weight += 1.0 (decay applied)
          │           Radar chart pulses on 'state' axis
          │
          └─→ Prediction must be resolved before blank on that line can be submitted
```

---

## Flow 5: Node Completion

```
All blanks in exercise submitted correctly
  │
  ├─→ Frontend: short completion animation (blanks all green, 300ms stagger)
  │
  ├─→ POST /api/node/complete
  │     body: { session_id, topic, node_index }
  │
  └─→ Backend:
        │
        ├─→ Compute node outcome:
        │     errors_this_node = SELECT count FROM error_log WHERE session=? AND topic=? AND node=?
        │     if errors_this_node == 0 → status = 'complete' (green)
        │     if errors_this_node <= 2 → status = 'complete' (amber — had errors)
        │     if errors_this_node > 2 → status = 'complete' + dominant_error recorded (red — needs repair)
        │
        ├─→ UPDATE node_progress: status='complete', completed_at, dominant_error
        │
        ├─→ Unlock next node:
        │     UPDATE node_progress SET status='in_progress'
        │     WHERE topic=? AND node_index = completed_node_index + 1
        │
        ├─→ Check cluster completion:
        │     All 3 nodes complete? → unlock pipeline stitch for this cluster
        │     UPDATE pipeline_progress: first block unlocked
        │
        ├─→ Check spaced repetition:
        │     INSERT INTO spaced_repetition for each core_logic block in this exercise
        │     due_date = now + 1 day, ease_factor = 2.5, interval_days = 1.0
        │
        ├─→ Check rotation flag:
        │     If rotation_flag set → next node exercise will use rotated context
        │     Store rotation_context in session state
        │
        └─→ Return: { next_node, pipeline_unlocked, spaced_rep_added }

Frontend:
  ├─→ Roadmap updates: completed node → green/amber/red state
  ├─→ Next node → blue pulse
  ├─→ If pipeline unlocked: sidebar Pipeline tab gets indicator badge
  └─→ Brief success state in main area: "Node complete. 2/3 done." + [ Continue → ]
```

---

## Flow 6: Context Rotation

```
Trigger: rotation_flag = true when next node exercise loads

POST /api/exercise/generate receives rotation_flag=true
  │
  ├─→ Fetch previous_context (problem_statement of last exercise)
  ├─→ Fetch error_type that triggered rotation
  ├─→ Fetch error_subtype
  │
  ├─→ LLM call: context rotation prompt
  │     Returns: { problem_statement, context_description }
  │     (same algorithm, completely different story, same theme)
  │
  ├─→ Use rotated problem_statement for exercise generation
  │     New context structurally emphasizes the failed error_subtype:
  │       off_by_one → two similar indices in scope simultaneously
  │       wrong_variable → two plausible variable names in scope
  │       missing_self → multiple class methods calling each other
  │
  └─→ Exercise generates normally (Flow 3) with rotated context baked in
        Frontend: no visual indicator of rotation — it just looks like a different problem
        (The student doesn't know the system is targeting their specific failure — it happens invisibly)
```

---

## Flow 7: Theory Tab

```
Student clicks [ Theory ] tab
  │
  ├─→ Same code block renders (read-only, no blanks)
  │     Already submitted blanks shown as correct green text
  │
  ├─→ Theory column renders on right (240px)
  │     Layer toggle: [ L1 ] [ L2 ] [ L3 ]
  │     Default: L1 active
  │
  ├─→ Code line focus (hover or click a line):
  │     Right column updates to show theory for that line
  │     Callout card: left border (color by layer), why text
  │
  ├─→ Layer toggle L2:
  │     Card expands / transitions to layer_2 content (150ms fade)
  │
  ├─→ Layer toggle L3:
  │     If layer_3 is null: shows "No formal definition for this line"
  │     Else: math / technical content renders
  │
  └─→ All theory data already in memory (loaded at exercise generation, Flow 3)
        No additional API calls on tab switch
```

---

## Flow 8: Alt Way Tab

```
Student clicks [ Alt Way ] tab
  │
  ├─→ Header shows: [Original Form] → [Alternate Form]
  │     e.g. "List comprehension → Explicit for loop"
  │
  ├─→ Alternate code renders with same blank positions
  │     (blanks mapped to same logical operations, different syntax)
  │
  ├─→ Submission flow identical to Code tab (Flow 4)
  │     Same blank_id references, same expected answers
  │     But line_context differs → may produce different error classifications
  │
  ├─→ Completing Alt Way:
  │     POST /api/altway/complete { session_id, topic, node_index }
  │     Backend: reduce dominant error_type weight by 0.15 (bonus reward)
  │     Radar chart updates accordingly
  │
  └─→ Alt Way is optional — no penalty for skipping
        No UI forcing it — just available as a tab
```

---

## Flow 9: Pipeline Stitching

```
Student opens Pipeline tab in sidebar
  (Tab badge shows "⚡ 1 available" when a cluster is fully complete)
  │
  ├─→ GET /api/pipeline?session_id={id}&cluster={cluster_name}
  │     Returns: pipeline_progress rows + block code previews
  │
  ├─→ Renders block checklist:
  │     ✓ Block 1: Tokenization     [complete]  [dimmed code preview]
  │       ──── stitch blank ────
  │         [ multi-line input ]  ← "Write the glue code connecting Block 1 → Block 2"
  │         [ Submit stitch ]
  │     ✗ Block 2: Vocabulary Build  [locked]
  │     ✗ Block 3: Padding           [locked]
  │
  ├─→ Student writes stitch code in multi-line input (Berkeley Mono 13px)
  │
  └─→ Student submits stitch:
        POST /api/stitch/submit
          body: { session_id, cluster_name, block_index, stitch_attempt }
        │
        ├─→ Backend validates:
        │     Parse stitch_attempt → extract output type/shape
        │     Compare against expected input type/shape of next block
        │     (expected shapes stored in exercise cache at generation time)
        │
        ├─→ CORRECT:
        │     UPDATE pipeline_progress: stitch_complete=true
        │     Unlock next block
        │     Frontend: stitch area → green checkmark, next block unlocks
        │
        └─→ WRONG:
              Classify as 'state/interface_mismatch'
              POST /api/feedback/generate (stitch context)
              LLM returns: why + what actual shape was vs what was expected
              INSERT INTO error_log
              UPDATE error_profile
              Feedback shows:
                "Your stitch outputs: List[str]
                 Block 2 expects: Dict[str, int]
                 Why: ..."
              Student retries (stitch input stays editable)
```

### Pipeline completion

```
All 3 blocks + all stitches complete
  │
  ├─→ Output rail animates:
  │     Plays back all intermediate states across full pipeline in sequence
  │     Each block's output → feeds into next → final output at end
  │     500ms per step, 200ms transition between steps
  │
  └─→ Cluster marked complete in roadmap
        Next cluster unlocks
```

---

## Flow 10: Spaced Repetition Queue

```
On /app mount (every session), after roadmap loads:
  │
  ├─→ GET /api/spaced_rep/due?session_id={id}
  │     SELECT * FROM spaced_repetition
  │     WHERE session_id=? AND due_date <= now()
  │     ORDER BY due_date ASC
  │
  ├─→ If due blocks exist:
  │     Render SR queue card in main content area (above or below exercise)
  │     "⏱ 2 blocks due for review"
  │     List of block names + due labels
  │     [ Start review session ]
  │
  └─→ Student clicks Start review session:
        │
        ├─→ Loads micro-exercise for first due block
        │     Single blank, core logic only
        │     Same MacBook exercise interface, simplified (no output rail, no tabs)
        │
        ├─→ Student submits blank:
        │     CORRECT:
        │       quality = 5 (perfect recall)
        │       Run SM-2:
        │         times_correct = 0 → interval = 1
        │         times_correct = 1 → interval = 6
        │         times_correct > 1 → interval = interval × ease_factor
        │         ease_factor = max(1.3, ease_factor + 0.1 - (5-quality)*(0.08+(5-quality)*0.02))
        │       UPDATE spaced_repetition: interval, ease_factor, due_date=now+interval, times_correct++
        │       Next due block loads
        │
        │     WRONG:
        │       quality = 2
        │       interval = 1, times_correct = 0 (reset)
        │       UPDATE spaced_repetition: interval=1, due_date=tomorrow
        │       INSERT INTO error_log (same classification flow as Flow 4)
        │       UPDATE error_profile
        │       Feedback overlay shows (same as Flow 4)
        │       Student retries
        │
        └─→ All due blocks reviewed:
              "Review complete. Next due: [date]."
              Main content returns to last active exercise or roadmap CTA
```

---

## Flow 11: Error Profile Live Update (Cross-cutting)

This flow is triggered by any wrong submission anywhere in the app — it's not a user-initiated flow, it runs as a side effect.

```
Any wrong submission → INSERT INTO error_log → UPDATE error_profile
  │
  └─→ Frontend receives updated weights in API response
        │
        ├─→ Radar chart: smoothly morphs polygon (400ms spring animation)
        │     The axis corresponding to the new error type's weight pulses
        │     (scale 1 → 1.4 → 1, 300ms)
        │
        ├─→ If weight for any error_type crosses 0.3 threshold:
        │     Roadmap re-evaluates node order (next roadmap fetch reflects this)
        │
        └─→ Dominant error text below chart updates:
              "your most frequent: Logic errors (43%)"
```

---

## API Endpoint Summary

```
POST /api/session                      create session, seed node_progress + error_profile
GET  /api/roadmap?session_id           get ordered node list (with reorder logic applied)
GET  /api/error_profile?session_id     get 5 error type weights
GET  /api/error_log?session_id         get all error log rows
POST /api/exercise/generate            generate exercise via LLM (or load cached)
GET  /api/exercise/cached?node_id      return previously generated exercise
POST /api/submission                   classify answer, update error log + profile
POST /api/feedback/generate            LLM: why + follow-up question
POST /api/node/complete                mark node done, unlock next, seed spaced rep
POST /api/altway/complete              bonus: reduce error weight
GET  /api/pipeline?session_id&cluster  get pipeline state for cluster
POST /api/stitch/submit                validate stitch code, update pipeline_progress
GET  /api/spaced_rep/due?session_id    get due blocks
POST /api/spaced_rep/update            SM-2 update after micro-exercise
GET  /api/theory/generate              LLM: 3-layer theory callouts for exercise
```

---

## State Machine: Node Status

```
locked
  └─→ (previous node completes) → in_progress
        │
        ├─→ (all blanks correct, 0 errors) → complete [green]
        ├─→ (all blanks correct, 1-2 errors) → complete [amber]
        └─→ (all blanks correct, 3+ errors) → complete [red — needs repair]
                                                └─→ (node re-attempted, errors < 2) → complete [amber]
```

---

## State Machine: Exercise Blank

```
empty (initial)
  └─→ (user types) → filled
        └─→ (submit) ──→ correct → green (locked, immutable)
                     └─→ wrong  → red_flash → feedback_open
                                    └─→ (follow-up answered) → feedback_closed
                                          └─→ (user edits + resubmit) → [evaluate again]
```

---

## Error Taxonomy with Classification Rules

```
typo         edit_distance(written, expected) ≤ 2, same token type
syntax       is_valid_python(written) AND NOT is_valid_python_in_context(written, ctx)
logic        valid python, wrong behavior:
  off_by_one   |int(written) - int(expected)| == 1
  wrong_var    same operation, different variable name
scope        'self.' in expected AND 'self.' not in written → scope/missing_self
state        output_prediction_wrong() → state/wrong_type_assumption
             stitch shape mismatch → state/interface_mismatch
unknown      none of above → LLM classifier
```

---

## Data Dependencies Map

```
Flow                    Reads from                    Writes to
────────────────────────────────────────────────────────────────────
Session init            —                             session, node_progress, error_profile
Roadmap load            node_progress, error_profile  —
Exercise generate       error_profile, node_progress  (exercise cache in memory)
Blank submission        exercise cache                error_log, error_profile
Node complete           error_log                     node_progress, spaced_repetition, pipeline_progress
Context rotation        error_log                     (rotation_flag in session state)
Pipeline stitch         pipeline_progress             pipeline_progress, error_log, error_profile
Spaced rep review       spaced_repetition             spaced_repetition, error_log, error_profile
Theory tab              (exercise cache — no DB)      —
Alt Way                 exercise cache                error_log, error_profile
```

---

## Edge Cases & Fallbacks

**LLM timeout / parse failure:**
Exercise generation → retry once → use pre-baked exercise bank. User never sees a loading failure — they get an exercise regardless.

**Session with no error history (first blank ever):**
Exercise generates with default error profile (all weights 0.0) → generic blanks targeting all error types equally.

**All nodes complete, no spaced rep due:**
Main content area shows: "You've completed all available nodes. Check back when reviews are due." + SR queue next-due date.

**Same node clicked twice:**
Loads cached exercise. All previously-correct blanks shown as already-green. Student can re-attempt wrong blanks only.

**Pipeline stitch attempted before theory is seen:**
No gating — student can go to Pipeline at any time once cluster complete. Theory is always available in Code tab.

**Context rotation + pipeline same session:**
Rotation flag only applies to non-pipeline exercises. Pipeline stitch exercises always use the original context (they test interface understanding, not algorithm recall).

---

*Graduent App Flow Spec v1.0 — every submission is a diagnostic signal.*
