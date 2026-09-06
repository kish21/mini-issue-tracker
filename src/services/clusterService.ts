import {
  ClusterableIssue,
  ClusteringOutcome,
  IssueClusterContract,
  MIN_CLUSTER_SIZE,
} from '../domain/contracts.ts';
import { ILLMProvider, LLMProviderError, MockLLMProvider } from '../providers/llm/llmProvider.ts';
import { logger } from './logger.ts';

/**
 * Clustering orchestration.
 *
 * Owns the fail-soft policy: if the primary (LLM) provider errors out for any
 * reason, the run degrades to the local heuristic provider instead of surfacing an
 * exception to the UI. `cluster()` is total - it never throws - so a clustering
 * failure can never crash the board.
 */

const LOG_CONTEXT = 'ClusterService';

/** Anything with a status can be filtered; resolved issues are not worth clustering. */
export interface ClusterableIssueWithStatus extends ClusterableIssue {
  status?: string;
  clusterId?: string;
}

export interface ClusterServiceDependencies {
  /** Primary provider (typically Gemini). */
  primary: ILLMProvider;
  /** Offline fallback. Defaults to the deterministic heuristic provider. */
  fallback?: ILLMProvider;
  now?: () => Date;
}

export class ClusterService {
  private readonly primary: ILLMProvider;
  private readonly fallback: ILLMProvider;
  private readonly now: () => Date;

  constructor(dependencies: ClusterServiceDependencies) {
    this.primary = dependencies.primary;
    this.fallback = dependencies.fallback ?? new MockLLMProvider();
    this.now = dependencies.now ?? (() => new Date());
  }

  /**
   * Cluster the supplied issues. Resolved issues are excluded. Returns an audit-shaped
   * outcome describing which provider actually produced the result.
   */
  async cluster(issues: readonly ClusterableIssueWithStatus[]): Promise<ClusteringOutcome> {
    const startedAt = this.now();
    const candidates = issues.filter((issue) => issue.status !== 'resolved');
    const candidateIds = candidates.map((issue) => issue.id);

    if (candidates.length < MIN_CLUSTER_SIZE) {
      return this.finish(startedAt, [], candidateIds, 'none', undefined);
    }

    try {
      const clusters = await this.primary.clusterIssues(candidates);
      logger.info(LOG_CONTEXT, 'Clustering succeeded', {
        provider: this.primary.name,
        issueCount: candidates.length,
        clusterCount: clusters.length,
      });
      return this.finish(startedAt, clusters, candidateIds, 'llm', undefined);
    } catch (error) {
      const reason = describeError(error);
      logger.warn(LOG_CONTEXT, 'Primary provider failed, degrading to local heuristic', {
        provider: this.primary.name,
        reason,
      });

      try {
        const clusters = await this.fallback.clusterIssues(candidates);
        return this.finish(startedAt, clusters, candidateIds, 'heuristic', reason);
      } catch (fallbackError) {
        logger.error(LOG_CONTEXT, 'Fallback provider also failed; returning empty result', {
          provider: this.fallback.name,
          reason: describeError(fallbackError),
        });
        return this.finish(startedAt, [], candidateIds, 'none', reason);
      }
    }
  }

  private finish(
    startedAt: Date,
    clusters: IssueClusterContract[],
    candidateIds: readonly string[],
    source: ClusteringOutcome['source'],
    degradedReason: string | undefined,
  ): ClusteringOutcome {
    const completedAt = this.now();
    const clustered = new Set(clusters.flatMap((cluster) => cluster.issueIds));
    return {
      clusters,
      unclusteredIssueIds: candidateIds.filter((id) => !clustered.has(id)),
      source,
      degraded: degradedReason !== undefined,
      degradedReason,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }
}

/**
 * Associate issues with the clusters they landed in.
 *
 * Pure: returns a new array. Issues inside a cluster become `clustered`; issues that
 * were previously clustered but dropped out of this run are released back to `open`.
 * Resolved issues are never touched.
 */
export function applyClustersToIssues<T extends ClusterableIssueWithStatus>(
  issues: readonly T[],
  clusters: readonly IssueClusterContract[],
  updatedAt: string = new Date().toISOString(),
): T[] {
  const clusterByIssueId = new Map<string, string>();
  for (const cluster of clusters) {
    for (const issueId of cluster.issueIds) {
      if (!clusterByIssueId.has(issueId)) clusterByIssueId.set(issueId, cluster.id);
    }
  }

  return issues.map((issue) => {
    if (issue.status === 'resolved') return issue;

    const clusterId = clusterByIssueId.get(issue.id);
    if (clusterId) {
      return { ...issue, clusterId, status: 'clustered', updatedAt };
    }
    if (issue.status === 'clustered') {
      const { clusterId: _dropped, ...rest } = issue;
      return { ...(rest as T), status: 'open', updatedAt };
    }
    return issue;
  });
}

/** Look up the issues belonging to a cluster, preserving the cluster's own ordering. */
export function issuesInCluster<T extends ClusterableIssue>(
  cluster: IssueClusterContract,
  issues: readonly T[],
): T[] {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  return cluster.issueIds
    .map((id) => byId.get(id))
    .filter((issue): issue is T => issue !== undefined);
}

function describeError(error: unknown): string {
  if (error instanceof LLMProviderError) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return 'unknown_error';
}
