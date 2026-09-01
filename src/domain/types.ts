export type IssueStatus = 'open' | 'clustered' | 'resolved';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  tags: string[];
  clusterId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueCluster {
  id: string;
  name: string;
  reasoning: string;
  suggestedAction: string;
  affectedComponents: string[];
  issueIds: string[];
  createdAt: string;
}

export interface GeneratedPromptSpec {
  title: string;
  clusterId?: string;
  promptContent: string;
  prSpecContent: string;
  summary: string;
  generatedAt: string;
}
