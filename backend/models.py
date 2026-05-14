"""
models.py — Pydantic request/response models.
All request and response shapes are defined here. Routers import from here only.
"""
from pydantic import BaseModel
from typing import Optional


# --- Session ---
class SessionCreate(BaseModel):
    stream: str   # 'ML/AI' | 'DSA' | 'LLMs'
    theme: str


class SessionResponse(BaseModel):
    session_id: int
    stream: str
    theme: str


# --- Exercise ---
class ExerciseRequest(BaseModel):
    session_id: int
    topic: str
    node_index: int
    stream: str
    scaffold_percent: int = 80
    rotation_flag: bool = False


# --- Submission ---
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
    error_type: Optional[str] = None
    error_subtype: Optional[str] = None
    feedback: Optional[dict] = None
    updated_weights: dict
    rotation_triggered: bool = False


# --- Node ---
class NodeCompleteRequest(BaseModel):
    session_id: int
    topic: str
    node_index: int


class NodeCompleteResponse(BaseModel):
    next_node: Optional[dict] = None
    pipeline_unlocked: bool = False
    spaced_rep_added: bool = False


# --- Alt Way ---
class AltWayCompleteRequest(BaseModel):
    session_id: int
    topic: str
    node_index: int


# --- Pipeline ---
class StitchRequest(BaseModel):
    session_id: int
    cluster_name: str
    block_index: int
    stitch_attempt: str


class StitchResponse(BaseModel):
    correct: bool
    error_type: Optional[str] = None
    feedback: Optional[dict] = None

class PipelineBlockInfo(BaseModel):
    source_code: str
    target_code: str
    mission_description: str
    source_module_name: str
    target_module_name: str


# --- Spaced Repetition ---
class SpacedRepUpdateRequest(BaseModel):
    session_id: int
    sr_id: int
    quality: int  # 0-5, SM-2 quality rating


# --- Feedback ---
class FeedbackRequest(BaseModel):
    what_written: str
    what_expected: str
    line_context: str
    topic: str
    theme: str


# --- Output Prediction ---
class OutputPredictionRequest(BaseModel):
    session_id: int
    exercise_id: str
    line_number: int
    predicted: str
    actual: str
