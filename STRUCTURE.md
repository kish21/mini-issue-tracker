# Project Structure & Architecture Map

This document explains the organization and responsibility of every folder in the codebase.

```
mini-issue-tracker/
├── src/
│   ├── components/            # React UI components
│   │   ├── ui/                # Low-level reusable design system primitives (Button, Card, Badge, Modal, Input)
│   │   ├── features/          # Feature-specific UI (IssueCard, ClusterGroup, PromptPreview, NewIssueModal)
│   │   └── layout/            # Layout shells (Header, Sidebar, Container)
│   ├── domain/                # Core types, entities, and business validation rules (Issue, Cluster, Spec)
│   ├── providers/             # Adapter implementations (StorageAdapter, GeminiLLMProvider, MockLLMProvider)
│   ├── services/              # Pure domain orchestration services (ClusterService, PromptSynthesisService)
│   ├── prompts/               # Version-controlled prompt templates & JSON schemas (externalized from code)
│   ├── config/                # Layered configuration loader (reads .env with typed defaults)
│   ├── hooks/                 # Reusable React hooks (useIssues, useClusters, useKeyboardShortcuts)
│   ├── styles/                # Design system tokens, color variables, reset, and global styles
│   ├── App.tsx                # Main application orchestrator
│   └── main.tsx               # Application entrypoint
├── tests/                     # Automated test suites
│   ├── unit/                  # Unit tests for domain logic, adapters, and prompt generators
│   └── fixtures/              # Mock issues and sample prompt datasets for testing
├── docs/                      # Project documentation and feature specifications
├── .env.example               # Template for environment variables (secrets/keys)
├── .gitignore                 # Strict ignore rules for secrets and build artifacts
├── .gitleaks.toml             # Secret scanner rules
├── .pre-commit-config.yaml    # Pre-commit hook definitions
├── CHANGELOG.md               # Version release changelog
├── index.html                 # HTML shell with typography and SEO metadata
├── package.json               # Dependencies and scripts manifest
├── PRODUCT.md                 # Product Playbook spine (Vision, Scope, Plan, Architecture)
├── README.md                  # Quickstart and overview documentation
├── SECURITY.md                # Vulnerability disclosure policy
├── STRUCTURE.md               # This folder map
├── tsconfig.json              # Strict TypeScript compiler options
└── vite.config.ts             # Vite build configuration
```

---

## Folder Responsibilities

| Folder | Responsibility & Why |
| :--- | :--- |
| **`src/components/ui/`** | Primitive components (buttons, badges, inputs, dialogs). Must have zero business logic and strictly adhere to design system CSS tokens. |
| **`src/components/features/`** | Domain-aware UI blocks that assemble primitives (e.g., `IssueList`, `ClusterCard`, `PromptOutputModal`). |
| **`src/components/layout/`** | Global page shells, headers, toolbars, and responsive containers. |
| **`src/domain/`** | TypeScript contracts and pure entities (`Issue`, `Cluster`, `PromptSpec`, `FilterOptions`). |
| **`src/providers/`** | The Adapter layer: isolates all external APIs (browser storage, Gemini API, Mock AI) behind clean interfaces. |
| **`src/services/`** | Orchestration layer: coordinates between providers and domain models to perform clustering and prompt synthesis. |
| **`src/prompts/`** | Externalized, versioned prompt definitions and JSON Schemas so prompts are never hardcoded inside logic. |
| **`src/config/`** | Typed configuration loader that safely reads environment variables and provides sensible fallbacks. |
| **`src/hooks/`** | State management and keyboard interaction hooks (`useIssues`, `useKeyboardShortcuts`). |
| **`src/styles/`** | Design tokens (HSL colors, elevation, glassmorphism, spacing, typography) adhering to `/design-system`. |
| **`tests/`** | Vitest unit and integration suites verifying prompt generation, clustering logic, and storage migration. |
