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

/**
 * ---------------------------------------------------------------------------
 * FEAT-03 — Status Lifecycle State Machine
 * ---------------------------------------------------------------------------
 * The allowed-transition table is the single source of truth for issue status
 * movement. Services (IssueService/UI) must route every status change through
 * `transitionIssueStatus` so that illegal moves fail closed and `updatedAt` is
 * always stamped consistently.
 */
export const ALLOWED_STATUS_TRANSITIONS: Readonly<Record<IssueStatus, readonly IssueStatus[]>> = {
  open: ['clustered', 'resolved'],
  clustered: ['resolved', 'open'],
  resolved: ['open'],
} as const;

export interface StatusTransitionResult {
  ok: boolean;
  issue: IssueContract;
  reason?: string;
}

export function canTransitionStatus(from: IssueStatus, to: IssueStatus): boolean {
  if (from === to) return false;
  // Fail closed on statuses outside the enum (e.g. legacy data read from storage).
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Pure transition. Never mutates the input; returns the original issue
 * untouched (ok: false) when the move is not permitted.
 */
export function transitionIssueStatus(
  issue: IssueContract,
  to: IssueStatus,
  now: string = new Date().toISOString(),
  clusterId?: string
): StatusTransitionResult {
  if (!canTransitionStatus(issue.status, to)) {
    return {
      ok: false,
      issue,
      reason: `Illegal status transition: '${issue.status}' -> '${to}'.`,
    };
  }

  if (to === 'clustered' && !clusterId && !issue.clusterId) {
    return {
      ok: false,
      issue,
      reason: `Cannot move '${issue.id}' to 'clustered' without a clusterId linkage.`,
    };
  }

  const next: IssueContract = { ...issue, status: to, updatedAt: now };

  // Entering a grouped state records the linkage; leaving it releases the linkage.
  if (to === 'clustered' && clusterId) next.clusterId = clusterId;
  if (to === 'open') delete next.clusterId;

  return { ok: true, issue: next };
}

export interface BatchTransitionResult {
  issues: IssueContract[];
  transitionedIds: string[];
  skipped: Array<{ id: string; reason: string }>;
}

/**
 * Batch-move every issue belonging to a cluster into a target status
 * (the triage loop's "mark cluster resolved" action). Issues outside the
 * cluster are returned untouched; illegal moves are skipped, not thrown.
 */
export function batchTransitionClusterIssues(
  issues: IssueContract[],
  clusterId: string,
  to: IssueStatus,
  now: string = new Date().toISOString()
): BatchTransitionResult {
  const transitionedIds: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  const next = issues.map((issue) => {
    if (issue.clusterId !== clusterId) return issue;

    const result = transitionIssueStatus(issue, to, now);
    if (result.ok) {
      transitionedIds.push(issue.id);
    } else {
      skipped.push({ id: issue.id, reason: result.reason ?? 'Unknown transition failure.' });
    }
    return result.issue;
  });

  return { issues: next, transitionedIds, skipped };
}

/**
 * ---------------------------------------------------------------------------
 * FEAT-03 — Export Profile Contracts
 * ---------------------------------------------------------------------------
 */
export type ExportFormatId = 'agent_prompt' | 'pr_description' | 'summary';

export interface ExportProfileContract {
  id: ExportFormatId;
  label: string;                      // Tab label shown in the export modal
  description: string;                // One-line "what this is for"
  fileExtension: string;              // Suggested extension on download (e.g. '.md')
}

export interface ExportRenderResult {
  formatId: ExportFormatId;
  content: string;
  generatedAt: string;                // ISO-8601 UTC timestamp
}

export interface ClipboardWriteResult {
  ok: boolean;
  formatId: ExportFormatId;
  bytesWritten: number;               // Length only — content is never logged
  error?: string;
}
