# Graduent: The Adaptive Learning Engine

> **"Learn to understand code. Not recognize it."**

Graduent is a next-generation coding education platform that transforms the learning experience from a static sequence of videos into a dynamic, evolving architecture. Built on a foundation of LLM-orchestrated adaptive intelligence, Graduent modifies itself in real-time based on your unique error profile, cognitive biases, and mastery level.

---

## Table of Contents
1. [The Philosophy](#1-the-philosophy)
2. [The Adaptive Core](#2-the-adaptive-core)
3. [Technical Architecture](#3-technical-architecture)
4. [The Error Matrix](#4-the-error-matrix)
5. [Spaced Repetition (SM-2)](#5-spaced-repetition)
6. [Context Rotation Engine](#6-context-rotation-engine)
7. [The Pipeline (System Architecture)](#7-the-pipeline)
8. [API Documentation](#8-api-documentation)
9. [Database Schema](#9-database-schema)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Installation & Deployment](#11-installation--deployment)
12. [The Future Roadmap](#12-the-future-roadmap)

---

## 1. The Philosophy

### 1.1 The "Static" Learning Trap
Traditional platforms like Udemy or YouTube suffer from the **"Passive Recognition"** trap. Students watch a video, follow a tutorial, and *believe* they have learned the concept. In reality, they have simply learned to recognize the pattern within a specific, static context. When faced with a different scenario, their knowledge collapses because it is "context-dependent."

### 1.2 The Graduent Solution
Graduent treats coding as a **muscle**. 
- It identifies exactly which "fiber" (logic, syntax, scope, etc.) is weak.
- It rotates your training environment (Themes) to prevent context-dependency.
- It forces you to stitch your lessons together into macro-systems (The Pipeline).

---

## 2. The Adaptive Core

The heart of Graduent is the **Orchestrator**. Unlike traditional apps that use AI as a chatbot, Graduent uses AI as a **Compiler and Architect**. 

- **Generation-on-Demand**: Exercises are generated at the moment you click "Start." They are tailored to your current "Weakness Weights."
- **Feedback Loops**: Every mistake triggers a classification event. The system doesn't just say "Wrong"; it updates your global profile.
- **Cognitive Load Balancing**: The system adjusts the "Scaffold Percentage" (how much code is provided vs. hidden) dynamically.

---

## 3. Technical Architecture

Graduent is built on a high-performance, modern stack designed for low-latency AI orchestration.

### 3.1 The Frontend (React + Tailwind)
The UI is a "Single Page Application" (SPA) that mimics a high-tech HUD (Heads-Up Display).
- **React Hooks**: Custom hooks like `useGradient` handle the real-time background animations.
- **Glassmorphism**: Leveraging `backdrop-filter: blur()` to create a sense of depth and focus.
- **State Management**: Context API is used to synchronize the "Diagnostic Sidebar" with the active Exercise workspace.

### 3.2 The Backend (FastAPI)
- **Asynchronous Execution**: All LLM calls and DB operations are non-blocking.
- **FastAPI Routers**: Segmented logic for Exercises, Roadmaps, Sessions, and the Pipeline.
- **Pydantic Models**: Strict schema enforcement for all JSON payloads.

### 3.3 The AI Engine (Gemini)
- **One-Shot Prompting**: Complex instructions that return code, theory, and alternatives in a single pass.
- **Schema Parity**: Logic that ensures the number of blanks in code matches the metadata provided.

---

## 4. The Error Matrix

Every mistake you make is classified into one of five critical categories:

| Error Type | Description | Remediation Strategy |
|------------|-------------|----------------------|
| **Logic** | Algorithmic failures or incorrect flow. | Increased theory injection and logic tracing. |
| **Syntax** | Structural language violations. | High-scaffold exercises focusing on grammar. |
| **Typo** | Simple naming or spelling errors. | Low-scaffold, "attention to detail" exercises. |
| **Scope** | Variable or block-level access issues. | Complex state management problems. |
| **State** | Incorrect tracking of data mutations. | Visualization of variable life-cycles. |

### 4.1 The Weight Algorithm
We use an **Exponential Decay Algorithm** for error weights:
`W_{new} = W_{old} \times (1 - \lambda) + Impact`
- **$\lambda$ (0.1)**: The decay rate. Mistakes from last week matter less than mistakes from today.
- **Impact**: The severity of the mistake (e.g., Logic has higher impact than Typo).

---

## 5. Spaced Repetition (SM-2)

Graduent doesn't just teach; it ensures you remember. We implemented a modified **SuperMemo-2 (SM-2)** algorithm.

### 5.1 The Calculation
For every concept you master, we calculate the next review date:
- `I(1) = 1 day`
- `I(2) = 6 days`
- `I(n) = I(n-1) \times EF`
- **EF (Easiness Factor)**: Ranges from 1.3 to 2.5 based on how quickly you solved the exercise.

When a review is due, the sidebar highlights the node in the **Spaced Repetition** section, pulling you back to reinforce the neural path.

---

## 6. Context Rotation Engine

This is Graduent's most unique feature. Cognitive bias occurs when a student associates a concept with a story. 

### 6.1 The Trigger
If the system detects a "Stall" (3 consecutive errors of the same type in one node), it triggers a **Context Rotation**.

### 6.2 The Process
1. The engine pauses the current exercise.
2. It fetches the underlying algorithm (e.g., Bubble Sort).
3. It generates a completely new "Theme" (e.g., switching from *Naruto* to *Cyberpunk*).
4. The student must re-implement the same algorithm using the new variable names (`rasengan_list` becomes `cyber_node_array`).
5. This breaks the "story-memory" and forces "logic-memory."

---

## 7. The Pipeline (System Architecture)

The final boss of every cluster. This is where Graduent bridges the gap between "Writing Code" and "Building Systems."

### 7.1 Macro-Stitching
In the Pipeline view, the student sees:
- **Module A**: (e.g., The Tokenizer they built in Node 1).
- **Module B**: (e.g., The Vocab Builder they built in Node 2).

### 7.2 The Stitch Mission
The LLM generates a mission: *"Module A outputs a list of strings, but Module B expects a dictionary of frequencies. Write the bridge logic."*
This teaches the student about **Data Interfacing** and **Transformation**, the core tasks of a Senior Software Architect.

---

## 8. API Documentation

### 8.1 Exercise Endpoints
- `POST /api/exercise/generate`: Generates a new themed exercise.
- `POST /api/exercise/submit`: Validates student input and returns feedback.

### 8.2 Roadmap Endpoints
- `GET /api/roadmap`: Returns the current session's nodes and status.
- `POST /api/node/complete`: Marks a node as finished and unlocks the next.

### 8.3 Diagnostic Endpoints
- `GET /api/error_profile`: Returns the intensity weights of each error type.
- `GET /api/error_log`: Returns a historical list of all student mistakes.

---

## 9. Database Schema

Graduent uses SQLite for persistent tracking. 

### 9.1 Table: `session`
- `id`: Primary Key
- `stream`: 'ML/AI', 'DSA', or 'LLMs'
- `theme`: The current user-selected story world.

### 9.2 Table: `node_progress`
- `session_id`: Foreign Key
- `topic`: The algorithm topic (e.g., 'sorting')
- `status`: 'locked', 'in_progress', or 'complete'
- `node_index`: 1, 2, or 3.

### 9.3 Table: `error_profile`
- `session_id`: Foreign Key
- `error_type`: (e.g., 'logic')
- `weight`: The 0.0 - 1.0 intensity score.

---

## 10. UI/UX Design System

The Graduent interface is designed to reduce "Visual Static" and focus cognitive resources on the code.

### 10.1 Typography
- **Headings**: *Outfit* (Geometric, bold, futuristic).
- **Body**: *Inter* (High-readability sans-serif).
- **Code**: *JetBrains Mono* (The elite standard for developer fonts).

### 10.2 Color Palette
- **Deep Slate**: `#1A1814` (Background focus).
- **Vibrant Violet**: `#7C3AED` (Primary brand color / AI intelligence).
- **Success Emerald**: `#059669` (Correctness).
- **Alert Ruby**: `#DC2626` (Error highlighting).

---

## 11. Installation & Deployment

### 11.1 Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### 11.2 The All-in-One Command
From the root directory:
```bash
npm run dev
```
This starts both the FastAPI backend and the Vite frontend simultaneously.

---

## 12. The Future Roadmap

- **Multi-Player Stitching**: Collaborative pipeline building where two students stitch their modules together.
- **Native IDE Integration**: A VS Code extension that brings Graduent's adaptive logic into your production environment.
- **Hardware Acceleration**: Local LLM support using Llama.cpp for offline learning.
- **Voice-Driven Pair Programming**: An AI companion that talks through the logic in real-time.

---

## Appendix A: Mathematical Foundation of SM-2
(A deep dive into why we use 1.3 as the floor for EF...)
[... 100+ lines of detailed algorithm breakdown ...]

## Appendix B: Prompt Engineering Strategies
(How we prevent LLM hallucinations in the generation pipeline...)
[... 100+ lines of prompt template logic ...]

---

Developed with ❤️ for the future of personalized education.
**Graduent: Learn to understand code. Not recognize it.**
