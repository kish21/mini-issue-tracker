/**
 * PromptModal — multi-format export selector for a cluster.
 *
 * Presents every registered export profile as a tab, renders the selected one,
 * and copies it through the export service (which owns clipboard handling and
 * error feedback). The modal holds no export logic of its own.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ExportFormatId } from '../../domain/contracts.ts';
import { Issue, IssueCluster } from '../../domain/types.ts';
import {
  EXPORT_PROFILES,
  DEFAULT_EXPORT_FORMAT,
  renderExport,
  copyExportToClipboard,
  ClipboardPort,
} from '../../services/exportService.ts';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.ts';

export interface PromptModalProps {
  cluster: IssueCluster;
  issues: Issue[];
  onClose: () => void;
  /** Optional triage action: batch-move this cluster's issues to Resolved. */
  onResolveCluster?: (clusterId: string) => void;
  /** Test seam — defaults to the browser clipboard inside the service. */
  clipboard?: ClipboardPort;
}

type CopyFeedback = { ok: boolean; message: string } | null;

export const PromptModal: React.FC<PromptModalProps> = ({
  cluster,
  issues,
  onClose,
  onResolveCluster,
  clipboard,
}) => {
  const [activeFormat, setActiveFormat] = useState<ExportFormatId>(DEFAULT_EXPORT_FORMAT);
  const [feedback, setFeedback] = useState<CopyFeedback>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const feedbackTimer = useRef<number | null>(null);

  useKeyboardShortcuts({ close_modal: onClose }, { isModalOpen: true });

  // Move focus into the dialog on open so keyboard users are not left behind it.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Clear any pending feedback timer so it cannot fire after unmount.
  useEffect(() => () => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
  }, []);

  const showFeedback = (next: CopyFeedback) => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    setFeedback(next);
    feedbackTimer.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimer.current = null;
    }, 3000);
  };

  const rendered = useMemo(
    () => renderExport(activeFormat, cluster, issues),
    [activeFormat, cluster, issues]
  );

  const activeProfile = EXPORT_PROFILES.find((p) => p.id === activeFormat);

  const handleSelectFormat = (formatId: ExportFormatId) => {
    setActiveFormat(formatId);
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    setFeedback(null);
  };

  const handleCopy = async () => {
    const result = await copyExportToClipboard(rendered, clipboard);
    showFeedback(
      result.ok
        ? { ok: true, message: 'Copied to clipboard' }
        : { ok: false, message: result.error ?? 'Copy failed.' }
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Export options for ${cluster.name}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        className="card"
        ref={dialogRef}
        tabIndex={-1}
        style={{
          outline: 'none',
          maxWidth: '780px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'var(--color-bg-surface-elevated)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>{cluster.name}</h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Export profiles for {issues.length} connected {issues.length === 1 ? 'issue' : 'issues'}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            aria-label="Close export dialog"
            style={{ padding: '4px 10px' }}
          >
            <X size={14} />
            <span>Close</span>
          </button>
        </div>

        {/* Format tabs */}
        <div role="tablist" aria-label="Export format" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {EXPORT_PROFILES.map((profile) => {
            const isActive = profile.id === activeFormat;
            return (
              <button
                key={profile.id}
                role="tab"
                id={`export-tab-${profile.id}`}
                aria-selected={isActive}
                aria-controls="export-tabpanel"
                title={profile.description}
                onClick={() => handleSelectFormat(profile.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 500,
                  border: `1px solid ${isActive ? 'var(--color-accent-primary)' : 'var(--color-border-subtle)'}`,
                  background: isActive ? 'var(--color-accent-subtle)' : 'var(--color-bg-surface)',
                  color: isActive ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {profile.label}
              </button>
            );
          })}
        </div>

        {/* Rendered export */}
        <div
          id="export-tabpanel"
          role="tabpanel"
          aria-labelledby={`export-tab-${activeFormat}`}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {activeProfile?.description}
            </span>
            <button
              className="btn btn-primary"
              onClick={handleCopy}
              style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
            >
              {feedback?.ok ? <Check size={14} /> : <Copy size={14} />}
              <span>{feedback?.ok ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <pre
            style={{
              background: 'var(--color-bg-canvas)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-family-mono)',
              fontSize: 'var(--font-size-xs)',
              overflow: 'auto',
              maxHeight: '340px',
              border: '1px solid var(--color-border-subtle)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {rendered.content}
          </pre>

          {feedback && (
            <div
              role="status"
              aria-live="polite"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-size-xs)',
                color: feedback.ok ? 'var(--color-accent-text)' : 'var(--color-danger)',
              }}
            >
              {feedback.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Lifecycle action */}
        {onResolveCluster && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px solid var(--color-border-subtle)',
              paddingTop: '12px',
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => onResolveCluster(cluster.id)}
              style={{ fontSize: 'var(--font-size-xs)' }}
            >
              <CheckCircle2 size={14} />
              <span>Mark cluster resolved</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
