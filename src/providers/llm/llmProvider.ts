import { Issue, IssueCluster } from '../../domain/types.ts';
import { CLUSTERING_SYSTEM_PROMPT, formatIssuesForClustering } from '../../prompts/clusteringPrompt.ts';

export interface ILLMProvider {
  clusterIssues(issues: Issue[]): Promise<IssueCluster[]>;
}

export class MockLLMProvider implements ILLMProvider {
  async clusterIssues(issues: Issue[]): Promise<IssueCluster[]> {
    // Intelligent heuristic mock clustering for local/testing mode
    if (issues.length < 2) return [];

    const tagGroups: Record<string, Issue[]> = {};
    issues.forEach((issue) => {
      const primaryTag = issue.tags[0] || 'general';
      if (!tagGroups[primaryTag]) tagGroups[primaryTag] = [];
      tagGroups[primaryTag].push(issue);
    });

    const clusters: IssueCluster[] = [];
    Object.entries(tagGroups).forEach(([tag, groupedIssues], index) => {
      if (groupedIssues.length >= 2) {
        clusters.push({
          id: `cluster-${Date.now()}-${index}`,
          name: `${tag.toUpperCase()} Component Synergy`,
          reasoning: `Issues share common functional context around the "${tag}" module.`,
          suggestedAction: `Refactor and patch "${tag}" handlers in a unified update.`,
          affectedComponents: [`src/modules/${tag}`],
          issueIds: groupedIssues.map((i) => i.id),
          createdAt: new Date().toISOString(),
        });
      }
    });

    return clusters;
  }
}

export class GeminiLLMProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async clusterIssues(issues: Issue[]): Promise<IssueCluster[]> {
    if (!this.apiKey) {
      console.warn('No Gemini API key provided. Falling back to Mock clustering.');
      return new MockLLMProvider().clusterIssues(issues);
    }

    const promptText = formatIssuesForClustering(issues);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${CLUSTERING_SYSTEM_PROMPT}\n\nHere are the issues to analyze:\n\n${promptText}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(rawText);
    return (parsed.clusters || []).map((c: any, idx: number) => ({
      id: `cluster-${Date.now()}-${idx}`,
      name: c.name,
      reasoning: c.reasoning,
      suggestedAction: c.suggestedAction || 'Resolve related issues',
      affectedComponents: c.affectedComponents || [],
      issueIds: c.issueIds || [],
      createdAt: new Date().toISOString(),
    }));
  }
}
