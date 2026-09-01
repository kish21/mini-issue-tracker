/**
 * Strict Typed Contracts for Mini Issue Tracker
 * Version: 1.0.0
 */

export type IssueStatus = 'open' | 'clustered' | 'resolved';
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

export interface IssueContract {
  id: string;                         // Idempotency Key (e.g. ISSUE-101 or uuid)
  title: string;                      // 1-200 chars, non-empty
  description: string;                // Detailed markdown context
  status: IssueStatus;                // 'open' | 'clustered' | 'resolved'
  priority: IssuePriority;            // 4-level severity enum
  tags: string[];                     // Normalized lowercase tags (e.g. ['ui', 'navbar'])
  clusterId?: string;                 // Linked cluster identifier if grouped
  tenantId: string;                   // Tenant/workspace isolation key ('default_local')
  createdAt: string;                  // ISO-8601 UTC timestamp
  updatedAt: string;                  // ISO-8601 UTC timestamp
}

export interface IssueClusterContract {
  id: string;                         // Unique cluster ID (e.g. cluster-1725192000-0)
  name: string;                       // Short descriptive title (e.g. "Navbar Hover Bounds Synergy")
  reasoning: string;                  // Why these issues share root causes
  suggestedAction: string;            // Strategic patch/refactor recommendation
  affectedComponents: string[];       // Codebase file paths (e.g. ['src/components/Navbar.tsx'])
  issueIds: string[];                 // Array of referenced Issue IDs
  confidenceScore_0_1: number;        // Float 0.0 - 1.0 (agreed scale)
  createdAt: string;                  // ISO-8601 UTC timestamp
}

export interface GeneratedPromptSpecContract {
  clusterId: string;
  title: string;
  agentPrompt: string;                // Formatted for Gemini / Cursor / Copilot
  prDescription: string;              // GitHub PR markdown body
  summary: string;
  generatedAt: string;                // ISO-8601 UTC timestamp
}

/**
 * LLM Structured Output Schema Definition
 */
export interface LLMClusterResponseSchema {
  clusters: Array<{
    name: string;
    reasoning: string;
    suggestedAction: string;
    affectedComponents: string[];
    issueIds: string[];
    confidenceScore_0_1?: number;
  }>;
  unclusteredIssueIds: string[];
}

/**
 * Storage Schema & Migration Contracts
 */
export interface StorageDatabaseSchema {
  version: number;                    // Schema version integer (e.g. 1)
  issues: IssueContract[];
  clusters: IssueClusterContract[];
  lastMigratedAt: string;
}

export const CURRENT_SCHEMA_VERSION = 1;

export function validateIssue(issue: Partial<IssueContract>): IssueContract {
  if (!issue.title || !issue.title.trim()) {
    throw new Error('Contract validation failed: Issue title is required and cannot be blank.');
  }
  return {
    id: issue.id || `ISSUE-${Math.floor(100 + Math.random() * 900)}`,
    title: issue.title.trim(),
    description: issue.description?.trim() || '',
    status: issue.status || 'open',
    priority: issue.priority || 'medium',
    tags: (issue.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean),
    clusterId: issue.clusterId,
    tenantId: issue.tenantId || 'default_local',
    createdAt: issue.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
