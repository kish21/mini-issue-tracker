import React from 'react';
import { Code2, FileCode2, ShieldAlert } from 'lucide-react';
import type { ClusterableIssue, IssueClusterContract } from '../../domain/contracts.ts';

/**
 * Sidebar card for one semantic cluster: why these issues belong together, what to
 * do about it, which files it touches, and how confident the source was.
 *
 * Presentational only - no data fetching, no clustering logic. All text is rendered
 * as React children (escaped), never via dangerouslySetInnerHTML.
 */

export interface ClusterCardProps {
  cluster: IssueClusterContract;
  /** Issues resolved for this cluster; used for the count and the ID chips. */
  issues?: readonly ClusterableIssue[];
  /** True when this cluster came from the offline heuristic rather than the LLM. */
  degraded?: boolean;
  onGeneratePrompt?: (cluster: IssueClusterContract) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  color: 'var(--color-text-muted)',
};

const monoStyle: React.CSSProperties = {
  fontFamily: 'var(--font-family-mono)',
  fontSize: 'var(--font-size-xs)',
  color: 'var(--color-text-primary)',
};

function confidenceTone(score: number): string {
  if (score >= 0.75) return 'var(--color-success)';
  if (score >= 0.45) return 'var(--color-warning)';
  return 'var(--color-text-muted)';
}

export const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  issues,
  degraded = false,
  onGeneratePrompt,
}) => {
  const issueCount = issues ? issues.length : cluster.issueIds.length;
  const confidencePercent = Math.round(cluster.confidenceScore_0_1 * 100);

  return (
    <article
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
      aria-label={`Cluster: ${cluster.name}`}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
        <h4
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            color: 'var(--color-accent-text)',
          }}
        >
          {cluster.name}
        </h4>
        <span className="badge-tag">
          {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
        </span>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span
          style={{ ...labelStyle, color: confidenceTone(cluster.confidenceScore_0_1) }}
          title="How confident the clustering source was"
        >
          Confidence {confidencePercent}%
        </span>
        {degraded && (
          <span
            style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-warning)' }}
            title="AI clustering was unavailable; grouped locally by shared tags"
          >
            <ShieldAlert size={12} aria-hidden="true" />
            <span>Offline heuristic</span>
          </span>
        )}
      </div>

      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
        {cluster.reasoning}
      </p>

      {cluster.suggestedAction && (
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Suggested action: </strong>
          {cluster.suggestedAction}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <span style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <FileCode2 size={12} aria-hidden="true" />
          <span>Affected files</span>
        </span>
        {cluster.affectedComponents.length > 0 ? (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {cluster.affectedComponents.map((component) => (
              <li key={component} style={monoStyle}>
                &bull; {component}
              </li>
            ))}
          </ul>
        ) : (
          <span style={labelStyle}>Not identified for this cluster.</span>
        )}
      </div>

      {issues && issues.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
          {issues.map((issue) => (
            <span key={issue.id} className="badge-tag" title={issue.title}>
              {issue.id}
            </span>
          ))}
        </div>
      )}

      {onGeneratePrompt && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onGeneratePrompt(cluster)}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <Code2 size={14} aria-hidden="true" />
          <span>View AI Prompt &amp; PR Spec</span>
        </button>
      )}
    </article>
  );
};
