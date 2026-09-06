import { Issue, IssueCluster } from '../domain/types.ts';

export function generatePromptForCluster(cluster: IssueCluster, issues: Issue[]): string {
  const issueList = issues
    .map(
      (i, index) => `${index + 1}. **[${i.priority.toUpperCase()}] ${i.title}** (ID: ${i.id})
   - Description: ${i.description}
   - Tags: ${i.tags.join(', ')}`
    )
    .join('\n\n');

  return `### Task Context: Resolve Clustered Issues (${cluster.name})

**Root Cause & Cluster Analysis:**
${cluster.reasoning}

**Affected Components:**
${cluster.affectedComponents.map((c) => `- \`${c}\``).join('\n')}

**Associated Issues:**
${issueList}

---

### Implementation Requirements:
1. Address the shared root cause identified above across all associated issues.
2. Implement a clean, unified fix that satisfies each issue's individual symptoms.
3. Ensure no regressions in related components.
4. Add automated unit tests covering the edge cases reported in these issues.

### Acceptance Criteria:
${issues.map((i) => `- [ ] Issue resolved: ${i.title}`).join('\n')}
- [ ] Unit & regression tests pass.
- [ ] No breaking contract changes without backward compatibility.
`;
}

export function generatePRSpecForCluster(cluster: IssueCluster, issues: Issue[]): string {
  return `## Summary of Changes (${cluster.name})

### Clustered Problem & Root Cause
${cluster.reasoning}

### Closes Issues:
${issues.map((i) => `- Closes #${i.id}: ${i.title}`).join('\n')}

### Key Modifications:
${cluster.affectedComponents.map((c) => `- Updated \`${c}\``).join('\n')}

### Suggested Verification:
- Run test suite for affected modules.
- Verify reproduction cases reported in linked issues.
`;
}

/**
 * Format C — Plain-text triage summary.
 * Human-readable digest for standups, tickets and chat; no markdown headings
 * so it survives being pasted into plain-text fields.
 */
export function generateSummaryForCluster(cluster: IssueCluster, issues: Issue[]): string {
  const priorityRank: Record<Issue['priority'], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const ordered = [...issues].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  // No issues means no priority to report - never fabricate a default.
  const highest = ordered.length > 0 ? ordered[0].priority.toUpperCase() : 'n/a';

  return `Cluster: ${cluster.name}
Issues: ${issues.length} | Highest priority: ${highest}

Root cause:
${cluster.reasoning}

Suggested action:
${cluster.suggestedAction}

Issues in this cluster:
${ordered.map((i) => `- [${i.priority.toUpperCase()}] ${i.id}: ${i.title}`).join('\n')}

Affected components:
${cluster.affectedComponents.map((c) => `- ${c}`).join('\n')}
`;
}
