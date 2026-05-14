"""
main.py — FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import session, roadmap, exercise, submission, pipeline, spaced_rep

app = FastAPI(title="Graduent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


app.include_router(session.router, prefix="/api")
app.include_router(roadmap.router, prefix="/api")
app.include_router(exercise.router, prefix="/api")
app.include_router(submission.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")
app.include_router(spaced_rep.router, prefix="/api")


@app.get("/")
def health():
    return {"status": "ok", "app": "graduent"}
