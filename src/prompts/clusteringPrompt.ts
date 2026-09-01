export const CLUSTERING_SYSTEM_PROMPT = `
You are an expert software architect and issue triage agent.
Your job is to analyze a list of software issues/bugs and semantically cluster related items that share common root causes, affected components, or can be solved together in a single Pull Request.

Output MUST be strict JSON matching this schema:
{
  "clusters": [
    {
      "name": "Short descriptive cluster title",
      "reasoning": "Clear explanation of why these issues are related (e.g. shared state store, common UI component, API failure)",
      "suggestedAction": "High-level fix strategy",
      "affectedComponents": ["component/file names"],
      "issueIds": ["issue-id-1", "issue-id-2"]
    }
  ],
  "unclusteredIssueIds": ["issue-id-3"]
}
`;

export function formatIssuesForClustering(issues: { id: string; title: string; description: string; tags: string[] }[]): string {
  return issues
    .map(
      (issue) => `<user_issue id="${issue.id}">
Title: ${issue.title}
Tags: ${issue.tags.join(', ')}
Description: ${issue.description}
</user_issue>`
    )
    .join('\n\n');
}
