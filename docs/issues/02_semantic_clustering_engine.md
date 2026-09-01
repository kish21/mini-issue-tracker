# [FEAT-02]: Automated Semantic Clustering Engine with Gemini & Mock Fallback (M2)

### 🎯 Feature Overview & User Goal
Enable developers to click "Auto-Cluster (AI)" to automatically detect semantic relationships, common root causes, and duplicate components across open issues, grouping them into cohesive clusters with similarity explanations.

---

### 📁 Target Modules & Exact File Names
- [x] **Domain / Contracts:** `src/domain/contracts.ts` *(IssueClusterContract, LLMClusterResponseSchema)*
- [ ] **AI Providers / Adapters:** `src/providers/llm/llmProvider.ts` *(GeminiLLMProvider, MockLLMProvider)*
- [ ] **Prompt Engine:** `src/prompts/clusteringPrompt.ts` *(Structured JSON schema prompt)*
- [ ] **Services / Logic:** `src/services/clusterService.ts` *(Orchestrates clustering and issue association)*
- [ ] **UI Components:** `src/components/features/ClusterCard.tsx` *(Displays cluster reasoning and target files)*
- [ ] **Automated Tests:** `tests/unit/clustering.test.ts` *(Validates JSON schema parsing and fallback heuristics)*

---

### 🛠️ Step-by-Step Implementation Tasks
- [ ] 1. Define `clusteringPrompt.ts` with strict JSON schema output formatting.
- [ ] 2. Implement `GeminiLLMProvider` using `fetch` with 10s timeout and error handling.
- [ ] 3. Implement `MockLLMProvider` with deterministic tag-based heuristic clustering.
- [ ] 4. Build `ClusterCard` sidebar component showing affected files and issue counts.
- [ ] 5. Write unit test verifying clustering response parsing and resilient error fallbacks.

---

### 🔒 Definition of Done (DoD) & Security Checks
- [ ] Prompt injection defense: untrusted issue descriptions wrapped in isolated `<user_issue>` tags.
- [ ] Fail-soft AI: network/API failures automatically fallback to local heuristic clustering without crashing UI.
- [ ] Test command passes: `npm test`.
