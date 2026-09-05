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

/* ------------------------------------------------------------------ *
 * FEAT-02: Semantic Clustering contracts
 * ------------------------------------------------------------------ */

/**
 * Minimal issue shape the clustering pipeline needs.
 * Deliberately narrower than IssueContract so providers never see
 * tenant keys, status or timestamps they have no business reading.
 */
export type ClusterableIssue = Pick<IssueContract, 'id' | 'title' | 'description' | 'tags'>;

/** Where a set of clusters actually came from. */
export type ClusteringSource = 'llm' | 'heuristic' | 'none';

/** Audit-friendly result of one clustering run. Never throws past the service. */
export interface ClusteringOutcome {
  clusters: IssueClusterContract[];
  unclusteredIssueIds: string[];
  source: ClusteringSource;
  degraded: boolean;                  // true when the primary provider failed
  degradedReason?: string;            // machine-ish reason code + message
  startedAt: string;                  // ISO-8601 UTC
  completedAt: string;                // ISO-8601 UTC
  durationMs: number;
}

/** A group of fewer than this many issues is not a cluster. */
export const MIN_CLUSTER_SIZE = 2;

/** Upper bound on any single free-text field copied out of an LLM response. */
export const MAX_LLM_TEXT_CHARS = 2000;

/** Bounds on how much structure a single response may claim (memory + render cost). */
export const MAX_CLUSTERS_PER_RESPONSE = 25;
export const MAX_COMPONENTS_PER_CLUSTER = 20;

const DEFAULT_CONFIDENCE = 0.5;

function coerceText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.length > MAX_LLM_TEXT_CHARS ? `${trimmed.slice(0, MAX_LLM_TEXT_CHARS)}…` : trimmed;
}

function coerceStringArray(value: unknown, maxEntries = Number.MAX_SAFE_INTEGER): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => coerceText(entry, ''))
    .filter(Boolean);
  return [...new Set(cleaned)].slice(0, maxEntries);
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_CONFIDENCE;
  return Math.min(1, Math.max(0, value));
}

/**
 * Validate and sanitize an untrusted LLM clustering payload.
 *
 * The model is treated as hostile-by-default: unknown/hallucinated issue IDs are
 * dropped, an ID may only appear in one cluster, undersized clusters are discarded,
 * confidence is clamped to the agreed 0..1 scale, and `unclusteredIssueIds` is
 * recomputed from `knownIssueIds` rather than trusted.
 *
 * @throws Error when the payload is structurally unusable (caller maps this to a fallback).
 */
export function parseLLMClusterResponse(
  raw: unknown,
  knownIssueIds: readonly string[],
): LLMClusterResponseSchema {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('LLM response validation failed: payload is not a JSON object.');
  }

  const rawClusters = (raw as { clusters?: unknown }).clusters;
  if (!Array.isArray(rawClusters)) {
    throw new Error('LLM response validation failed: "clusters" must be an array.');
  }

  const known = new Set(knownIssueIds);
  const alreadyClustered = new Set<string>();
  const clusters: LLMClusterResponseSchema['clusters'] = [];

  for (const entry of rawClusters) {
    if (clusters.length >= MAX_CLUSTERS_PER_RESPONSE) break;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const candidate = entry as Record<string, unknown>;

    const issueIds = coerceStringArray(candidate.issueIds).filter(
      (id) => known.has(id) && !alreadyClustered.has(id),
    );
    if (issueIds.length < MIN_CLUSTER_SIZE) continue;
    issueIds.forEach((id) => alreadyClustered.add(id));

    clusters.push({
      name: coerceText(candidate.name, 'Untitled cluster'),
      reasoning: coerceText(candidate.reasoning, 'No reasoning supplied by the model.'),
      suggestedAction: coerceText(candidate.suggestedAction, 'Resolve related issues together.'),
      affectedComponents: coerceStringArray(candidate.affectedComponents, MAX_COMPONENTS_PER_CLUSTER),
      issueIds,
      confidenceScore_0_1: clampConfidence(candidate.confidenceScore_0_1),
    });
  }

  return {
    clusters,
    unclusteredIssueIds: knownIssueIds.filter((id) => !alreadyClustered.has(id)),
  };
}
