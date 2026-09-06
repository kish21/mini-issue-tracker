# Mini Issue Tracker (Smart Cluster & Prompt Orchestrator)

> An intelligent, lightweight issue tracker for solo developers and agile teams that automatically clusters related bugs/tasks and synthesizes them into actionable, high-context AI prompts and Pull Request specifications.

---

## Features
- **Zero-Friction Issue Management:** Lightning-fast local capture of bugs, features, and tasks with keyboard shortcuts.
- **Automated Semantic Clustering:** AI engine groups issues sharing the same root cause or component.
- **1-Click AI Coding Prompts & PR Specs:** Automatically synthesizes clustered tickets into structured prompts ready for Gemini, Cursor, or Copilot.
- **Local-First & Private:** Your data stays in your browser; optional API key for live Gemini clustering.

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env.local
```
Add your Gemini API Key in `.env.local` to enable live LLM clustering (or use the built-in mock mode without a key).

### 3. Run Dev Server
```bash
npm run dev
```

### 4. Run Tests & Verification
```bash
npm test
```

---

## Product Documentation
- [PRODUCT.md](file:///c:/Users/kishore/Downloads/mini-issue-tracker/PRODUCT.md) — Product Spine (Vision, Scope, Plan, Architecture, Contracts)
- [STRUCTURE.md](file:///c:/Users/kishore/Downloads/mini-issue-tracker/STRUCTURE.md) — Codebase Organization Map
- [DESIGN.md](file:///c:/Users/kishore/Downloads/mini-issue-tracker/DESIGN.md) — Design System Specification & Token Harness
- [design-preview.html](file:///c:/Users/kishore/Downloads/mini-issue-tracker/design-preview.html) — Interactive Theme Studio & Preview
