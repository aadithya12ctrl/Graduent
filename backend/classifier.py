"""
classifier.py — Rule-based error classifier.
Classifies student answer errors before falling back to LLM.
"""
import ast


def classify_error(written: str, expected: str, line_context: str) -> tuple:
    """
    Classify a student error.
    Returns (error_type, error_subtype) tuple.
    error_type: 'typo' | 'syntax' | 'logic' | 'scope' | 'unknown'
    """
    written = written.strip()
    expected = expected.strip()

    # Exact match → not an error
    if written == expected:
        return None, None

    # Typo: edit distance ≤ 2
    dist = _edit_distance(written, expected)
    if dist <= 2 and dist > 0:
        subtype = _detect_typo_subtype(written, expected)
        return "typo", subtype

    # Syntax: written is valid python but semantically wrong
    if _is_valid_python(written) and not _is_valid_python(
        line_context.replace("___", written)
    ):
        return "syntax", None

    # Off-by-one: numeric values differ by 1
    try:
        if abs(int(written) - int(expected)) == 1:
            return "logic", "off_by_one"
    except (ValueError, TypeError):
        pass

    # Wrong variable: same operators, different names
    if _same_operators(written, expected) and _different_names(written, expected):
        return "logic", "wrong_variable"

    # Missing self
    if "self." in expected and "self." not in written:
        return "scope", "missing_self"

    # Scope: wrote local instead of instance
    if written.replace("self.", "") == expected.replace("self.", ""):
        return "scope", "missing_self"

    return "unknown", None


def _edit_distance(s1: str, s2: str) -> int:
    """Simple Levenshtein distance."""
    if len(s1) < len(s2):
        return _edit_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    prev_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row

    return prev_row[-1]


def _detect_typo_subtype(written: str, expected: str) -> str:
    """Detect specific typo type."""
    if len(written) != len(expected):
        return "char_insertion" if len(written) > len(expected) else "char_deletion"
    # Same length, must be substitution or transposition
    diffs = [(i, w, e) for i, (w, e) in enumerate(zip(written, expected)) if w != e]
    if len(diffs) == 2:
        i1, w1, e1 = diffs[0]
        i2, w2, e2 = diffs[1]
        if w1 == e2 and w2 == e1 and i2 == i1 + 1:
            return "transposition"
    return "char_substitution"


def _is_valid_python(code: str) -> bool:
    """Check if code is syntactically valid Python."""
    try:
        ast.parse(code)
        return True
    except SyntaxError:
        return False


def _same_operators(s1: str, s2: str) -> bool:
    """Check if two expressions use the same operators."""
    ops = set("+-*/=<>!&|^~%@")
    ops1 = {c for c in s1 if c in ops}
    ops2 = {c for c in s2 if c in ops}
    return ops1 == ops2 and len(ops1) > 0


def _different_names(s1: str, s2: str) -> bool:
    """Check if two expressions have different variable names."""
    import re
    names1 = set(re.findall(r"[a-zA-Z_]\w*", s1))
    names2 = set(re.findall(r"[a-zA-Z_]\w*", s2))
    return names1 != names2
