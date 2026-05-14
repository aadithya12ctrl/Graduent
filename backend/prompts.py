"""
prompts.py — All LLM prompt templates.
No prompt logic in routers. All prompts are f-string templates here.
"""

EXERCISE_PROMPT = """You are an expert coding educator.

Student profile:
- Stream: {stream}
- Theme: {theme}
- Topic: {topic}
- Node: {node_index} of 3
- Scaffold level: {scaffold_percent}%
- Error profile: {error_profile_json}
- Context rotation: {rotation_context}

SCALING RULES FOR {scaffold_percent}% SCAFFOLD (IMPORTANT: {scaffold_percent}% is the amount of code PROVIDED):
- 80% (Level 1): Training wheels ON. Provide 80% of the total code. Only blank out 2-3 specific operations.
- 50% (Level 2): Medium challenge. Provide 50% of the code. Blank out logic blocks like loop bodies or multiple lines (use 4-5 blanks).
- 20% (Level 3): Hard mode. Provide only 20% of the code (just the signature and comments). You MUST still use `___` to represent the missing code! Use 1 large blank `___` for each missing section, and ensure you have at least 3-4 blanks.
- 0% (Level 4): Absolute blank canvas. Only a comment description followed by a single `___`.

Generate a fill-in-the-blank exercise where:
1. All variable names and context use the {theme} world
2. At least 60% of blanks target: {top_2_error_types}
3. STRICT JSON FORMATTING: To completely avoid JSON parsing errors, you MUST return the code as an array of strings in `code_with_blanks_lines`, where each item is one line of code. NEVER use literal newlines or multiline strings.
4. BLANK MARKERS: You MUST use exactly `___` (three underscores) for every blank in the code. 
   - CORRECT: `sorted_heroes = ___`
   - WRONG: `sorted_heroes = ___1___`
   - WRONG: `sorted_heroes = ______`
   - WRONG: `___ (1) ___`
5. LANGUAGE ENFORCEMENT: You MUST write the code strictly in Python 3. Do not use JavaScript, C, or any other language.
6. JSON SAFETY: To avoid breaking the JSON schema, NEVER use double quotes (`"`) inside your Python code. Use single quotes (`'`) for all Python strings.
7. ALGORITHM IMPLEMENTATION: If the topic is an algorithm (like sorting or searching), you MUST implement it from scratch (e.g., Bubble Sort, Merge Sort, Linear Search). DO NOT use built-in functions like `.sort()` or `sorted()`.
8. PERFECT BLANK PARITY: The number of `___` markers in your `code_with_blanks_lines` MUST EXACTLY MATCH the number of items in your `blanks` JSON array. If you put 5 `___` markers in the code, you MUST provide exactly 5 items in the `blanks` array. Count them carefully!
9. INLINE THEORY: For EACH blank, you must provide a `theory_explanation` (why this line does what it does in 1 plain English sentence) and `alternative_approaches` (an alternative way to write this specific line, or `null` if none exists).

Return ONLY valid JSON matching this exact schema (REPLACE the example placeholders below with your ACTUAL generated exercise for {topic} and {theme}!):
{{
  "problem_statement": "string (the problem description)",
  "code_with_blanks_lines": [
    "def example_function(data):",
    "  # logic here",
    "  return ___"
  ],
  "blanks": [
    {{
      "blank_id": 1, 
      "expected_answer": "data", 
      "error_type_tested": "logic", 
      "line_context": "return ___",
      "theory_explanation": "This line returns the final computed value so it can be used elsewhere in the application.",
      "alternative_approaches": "You could also assign it to a variable first, like `result = data; return result`."
    }}
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

PIPELINE_MISSION_PROMPT = """You are a senior systems architect. 
User is stitching two code modules in a {cluster} pipeline.
Module A: {source_name}
Module B: {target_name}

Source Code A:
{source_code}

Target Code B:
{target_code}

Generate a "Stitch Mission" (2 sentences max) explaining how to connect the output of A to the input of B. 
Ensure the explanation stays within the {theme} world.
The mission should involve a small data transformation (e.g., reshaping, converting types, or reversing order).
Return ONLY the mission text."""

MOCK_CODE_PROMPT = """Generate a high-quality, CONCISE Python implementation of {topic}.
Theme: {theme}

Instructions:
- Keep the code under 20 lines. 
- Deeply embed the {theme} world into ALL variable names, logic, and comments.
- Focus on the core algorithmic logic, not boilerplate.
- Return ONLY the raw python code."""
