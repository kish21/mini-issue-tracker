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
