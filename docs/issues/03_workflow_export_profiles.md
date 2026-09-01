# [FEAT-03]: Status Lifecycle Transitions & Multi-Format Export Profiles (M3)

### 🎯 Feature Overview & User Goal
Complete the triage loop by providing status lifecycle management (transitioning issues between `Open` $\rightarrow$ `Clustered` $\rightarrow$ `Resolved`), export presets (Coding Agent Prompt, GitHub PR Description, Markdown Summary), and global keyboard shortcuts.

---

### 📁 Target Modules & Exact File Names
- [x] **Domain / Contracts:** `src/domain/contracts.ts` *(GeneratedPromptSpecContract)*
- [ ] **Prompt Templates:** `src/prompts/promptSynthesis.ts` *(Multi-format markdown templates)*
- [ ] **Services / Logic:** `src/services/exportService.ts` *(Format generator & clipboard engine)*
- [ ] **Hooks:** `src/hooks/useKeyboardShortcuts.ts` *(Global keyboard hotkeys)*
- [ ] **UI Components:** `src/components/features/PromptModal.tsx` *(Multi-tab export selector)*
- [ ] **Automated Tests:** `tests/unit/exportProfiles.test.ts`

---

### 🛠️ Step-by-Step Implementation Tasks
- [ ] 1. Add status update methods in `IssueService` to batch-move clustered issues to `Resolved`.
- [ ] 2. Build multi-format export templates:
  - Format A: AI Coding Agent Prompt (Gemini/Cursor/Copilot)
  - Format B: GitHub PR Description with `Closes #...` tags
  - Format C: Plain text summary
- [ ] 3. Implement keyboard shortcuts: `N` for new issue, `C` for auto-cluster, `Esc` to close modals.
- [ ] 4. Write unit tests for all export formatting options.

---

### 🔒 Definition of Done (DoD) & Security Checks
- [ ] No clipboard data leaks; clean clipboard API handling with user feedback.
- [ ] Full regression test suite passes: `npm test`.
- [ ] Production build passes: `npm run build`.
