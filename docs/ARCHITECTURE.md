# Architecture & System Design (HLD)

## 1. System Overview
The **Mini Issue Tracker** is a local-first web application designed to accelerate the developer triage loop. It automatically clusters related issues using semantic analysis (Google Gemini API / Heuristic Mock) and synthesizes multi-issue clusters into high-context prompts and PR specs for AI coding agents.

## 2. Core Layers
1. **Presentation Layer (`src/components/`):** React components styled with design tokens (`src/styles/`).
2. **Domain Layer (`src/domain/`):** Pure TypeScript data models and validation logic.
3. **Provider Layer (`src/providers/`):** Adapters isolating external IO (`LocalStorageAdapter`, `GeminiLLMProvider`, `MockLLMProvider`).
4. **Service Layer (`src/services/`):** Business workflows (clustering, prompt generation).
5. **Prompt Engine (`src/prompts/`):** Version-controlled prompts and JSON schemas.

## 3. Resilience & Security
- **Data Protection:** All issue data stays in the user's browser unless an AI clustering request is explicitly initiated.
- **Key Safety:** API keys are stored in client-side memory/local storage and never hardcoded in repository files.
- **Fail-Soft AI:** If the LLM call times out or fails, the application falls back gracefully to deterministic keyword/tag grouping.
