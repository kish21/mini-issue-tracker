# [FEAT-01]: Issue CRUD, Local Storage & Manual Prompt Synthesis (M1)

### 🎯 Feature Overview & User Goal
Provide a lightning-fast issue management interface where solo developers can capture bug reports, view issues in a clean dark-mode board, manually multi-select related issues, and generate a high-context AI coding prompt with 1-click clipboard export.

---

### 📁 Target Modules & Exact File Names
- [x] **Domain / Contracts:** `src/domain/contracts.ts` *(IssueContract, validateIssue)*
- [ ] **Data / Providers:** `src/providers/storage/storageAdapter.ts` *(LocalStorageAdapter)*
- [ ] **Services / Logic:** `src/services/issueService.ts` *(IssueService CRUD & validation)*
- [ ] **UI Components:** 
  - `src/components/features/IssueCard.tsx` *(Interactive issue card with checkboxes)*
  - `src/components/features/NewIssueModal.tsx` *(Fast keyboard-driven issue creation)*
  - `src/components/features/PromptModal.tsx` *(Copy-ready prompt modal)*
- [x] **Automated Tests:** `tests/unit/promptSynthesis.test.ts` & `tests/unit/contracts.test.ts`

---

### 🛠️ Step-by-Step Implementation Tasks
- [ ] 1. Implement `IssueService` with local storage persistence and CRUD methods.
- [ ] 2. Build `IssueCard` with status dot indicators, priority badges, and multi-select checkboxes.
- [ ] 3. Build `NewIssueModal` with keyboard shortcut support (`Ctrl+Enter` save).
- [ ] 4. Connect selection state to `PromptModal` to generate structured AI coding prompts.
- [ ] 5. Verify unit tests and live clipboard copy functionality.

---

### 🔒 Definition of Done (DoD) & Security Checks
- [ ] Sanitized text inputs (defense against XSS and markdown injection).
- [ ] Zero raw API keys or hardcoded credentials.
- [ ] Responsive UI verified on mobile (375px) and desktop.
- [ ] All unit tests pass: `npm test`.
