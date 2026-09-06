import { describe, it, expect, vi } from 'vitest';
import {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionStatus,
  transitionIssueStatus,
  batchTransitionClusterIssues,
  IssueContract,
} from '../../src/domain/contracts.ts';
import {
  EXPORT_PROFILES,
  DEFAULT_EXPORT_FORMAT,
  getExportProfile,
  renderExport,
  buildPromptSpec,
  copyExportToClipboard,
  browserClipboard,
  ClipboardPort,
} from '../../src/services/exportService.ts';
import {
  DEFAULT_SHORTCUTS,
  isTypingTarget,
  resolveShortcut,
} from '../../src/hooks/useKeyboardShortcuts.ts';
import { Issue, IssueCluster } from '../../src/domain/types.ts';

const NOW = '2026-09-05T12:00:00.000Z';

const mockIssues: Issue[] = [
  {
    id: 'ISSUE-201',
    title: 'Refresh token rotation fails on concurrent tabs',
    description: 'Second refresh request invalidates the rotated token.',
    status: 'clustered',
    priority: 'critical',
    tags: ['auth', 'security'],
    clusterId: 'cluster-auth',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'ISSUE-202',
    title: 'Token expiry returns 500 instead of 401',
    description: 'Unhandled null reference in the auth middleware.',
    status: 'clustered',
    priority: 'high',
    tags: ['auth', 'api'],
    clusterId: 'cluster-auth',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const mockCluster: IssueCluster = {
  id: 'cluster-auth',
  name: 'Auth Token Lifecycle Failures',
  reasoning: 'Both issues stem from unsynchronised refresh-token rotation in the auth middleware.',
  suggestedAction: 'Serialise token rotation behind a mutex and map expiry to a 401 redirect.',
  affectedComponents: ['src/auth/tokenService.ts', 'src/auth/middleware.ts'],
  issueIds: ['ISSUE-201', 'ISSUE-202'],
  createdAt: NOW,
};

const asContract = (issue: Issue): IssueContract => ({ ...issue, tenantId: 'default_local' });

describe('Status lifecycle state machine', () => {
  it('permits only the documented forward and reopen moves', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.open).toEqual(['clustered', 'resolved']);
    expect(canTransitionStatus('open', 'clustered')).toBe(true);
    expect(canTransitionStatus('clustered', 'resolved')).toBe(true);
    expect(canTransitionStatus('resolved', 'open')).toBe(true);
  });

  it('rejects no-op and undefined transitions', () => {
    expect(canTransitionStatus('open', 'open')).toBe(false);
    expect(canTransitionStatus('resolved', 'clustered')).toBe(false);
  });

  it('stamps updatedAt and leaves the input untouched on a legal move', () => {
    const original = asContract(mockIssues[0]);
    const result = transitionIssueStatus(original, 'resolved', '2026-09-06T00:00:00.000Z');

    expect(result.ok).toBe(true);
    expect(result.issue.status).toBe('resolved');
    expect(result.issue.updatedAt).toBe('2026-09-06T00:00:00.000Z');
    expect(original.status).toBe('clustered');
  });

  it('fails closed with a reason on an illegal move', () => {
    const resolved = { ...asContract(mockIssues[0]), status: 'resolved' as const };
    const result = transitionIssueStatus(resolved, 'clustered', NOW);

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("'resolved' -> 'clustered'");
    expect(result.issue).toBe(resolved);
  });

  it('fails closed on a status outside the enum instead of throwing', () => {
    expect(canTransitionStatus('archived' as never, 'open')).toBe(false);

    const legacy = { ...asContract(mockIssues[0]), status: 'archived' as never };
    const result = transitionIssueStatus(legacy, 'resolved', NOW);
    expect(result.ok).toBe(false);
    expect(result.issue).toBe(legacy);
  });

  it('refuses to mark an issue clustered without a cluster linkage', () => {
    const unlinked: IssueContract = { ...asContract(mockIssues[0]), status: 'open', clusterId: undefined };
    const result = transitionIssueStatus(unlinked, 'clustered', NOW);

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/without a clusterId/);
  });

  it('attaches the cluster linkage when an issue is grouped', () => {
    const unlinked: IssueContract = { ...asContract(mockIssues[0]), status: 'open', clusterId: undefined };
    const result = transitionIssueStatus(unlinked, 'clustered', NOW, 'cluster-auth');

    expect(result.ok).toBe(true);
    expect(result.issue.clusterId).toBe('cluster-auth');
  });

  it('drops the cluster linkage when an issue is reopened', () => {
    const resolved = { ...asContract(mockIssues[0]), status: 'resolved' as const };
    const result = transitionIssueStatus(resolved, 'open', NOW);

    expect(result.ok).toBe(true);
    expect(result.issue.clusterId).toBeUndefined();
  });

  it('batch-resolves every issue in a cluster and leaves the rest alone', () => {
    const outsider: IssueContract = {
      ...asContract(mockIssues[1]),
      id: 'ISSUE-999',
      clusterId: 'cluster-ui',
      status: 'open',
    };
    const input = [asContract(mockIssues[0]), asContract(mockIssues[1]), outsider];

    const { issues, transitionedIds, skipped } = batchTransitionClusterIssues(
      input,
      'cluster-auth',
      'resolved',
      NOW
    );

    expect(transitionedIds).toEqual(['ISSUE-201', 'ISSUE-202']);
    expect(skipped).toHaveLength(0);
    expect(issues.filter((i) => i.status === 'resolved')).toHaveLength(2);
    expect(issues.find((i) => i.id === 'ISSUE-999')?.status).toBe('open');
  });

  it('skips rather than throws when a clustered issue cannot move', () => {
    const alreadyResolved: IssueContract = { ...asContract(mockIssues[0]), status: 'resolved' };
    const { transitionedIds, skipped } = batchTransitionClusterIssues(
      [alreadyResolved],
      'cluster-auth',
      'resolved',
      NOW
    );

    expect(transitionedIds).toHaveLength(0);
    expect(skipped[0]).toMatchObject({ id: 'ISSUE-201' });
  });
});

describe('Export profile registry', () => {
  it('exposes exactly the three shipped profiles, agent prompt first', () => {
    expect(EXPORT_PROFILES.map((p) => p.id)).toEqual(['agent_prompt', 'pr_description', 'summary']);
    expect(DEFAULT_EXPORT_FORMAT).toBe('agent_prompt');
  });

  it('resolves a profile by id and rejects an unknown one', () => {
    expect(getExportProfile('summary').fileExtension).toBe('.txt');
    expect(() => getExportProfile('nope' as never)).toThrow(/Unknown export format/);
  });
});

describe('Export format rendering', () => {
  it('Format A — agent prompt carries cluster context, issues and acceptance criteria', () => {
    const { content, formatId, generatedAt } = renderExport('agent_prompt', mockCluster, mockIssues, NOW);

    expect(formatId).toBe('agent_prompt');
    expect(generatedAt).toBe(NOW);
    expect(content).toContain('Auth Token Lifecycle Failures');
    expect(content).toContain('unsynchronised refresh-token rotation');
    expect(content).toContain('ISSUE-201');
    expect(content).toContain('src/auth/tokenService.ts');
    expect(content).toContain('Acceptance Criteria:');
  });

  it('Format B — PR description tags every issue with Closes #', () => {
    const { content } = renderExport('pr_description', mockCluster, mockIssues, NOW);

    expect(content).toContain('Closes #ISSUE-201');
    expect(content).toContain('Closes #ISSUE-202');
    expect(content).toContain('Auth Token Lifecycle Failures');
  });

  it('Format C — summary is plain text, priority-ordered, with no markdown headings', () => {
    const { content } = renderExport('summary', mockCluster, mockIssues, NOW);

    expect(content).not.toContain('#');
    expect(content).toContain('Highest priority: CRITICAL');
    expect(content.indexOf('ISSUE-201')).toBeLessThan(content.indexOf('ISSUE-202'));
    expect(content).toContain('Suggested action:');
  });

  it('renders an empty cluster without crashing or inventing a priority', () => {
    const empty = { ...mockCluster, issueIds: [] };
    expect(() => renderExport('summary', empty, [], NOW)).not.toThrow();

    const { content } = renderExport('summary', empty, [], NOW);
    expect(content).toContain('Issues: 0');
    expect(content).toContain('Highest priority: n/a');
    expect(content).not.toContain('MEDIUM');
  });

  it('throws on an unregistered format id', () => {
    expect(() => renderExport('csv' as never, mockCluster, mockIssues, NOW)).toThrow(
      /Unknown export format/
    );
  });

  it('buildPromptSpec fills the shared contract with all three formats', () => {
    const spec = buildPromptSpec(mockCluster, mockIssues, NOW);

    expect(spec.clusterId).toBe('cluster-auth');
    expect(spec.title).toBe('Auth Token Lifecycle Failures');
    expect(spec.generatedAt).toBe(NOW);
    expect(spec.agentPrompt).toContain('Acceptance Criteria:');
    expect(spec.prDescription).toContain('Closes #ISSUE-201');
    expect(spec.summary).toContain('Root cause:');
  });
});

describe('Clipboard engine', () => {
  const rendered = { formatId: 'summary' as const, content: 'sensitive issue body', generatedAt: NOW };

  it('writes the payload and reports byte length on success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const port: ClipboardPort = { isAvailable: () => true, writeText };

    const result = await copyExportToClipboard(rendered, port);

    expect(writeText).toHaveBeenCalledWith('sensitive issue body');
    expect(result).toEqual({ ok: true, formatId: 'summary', bytesWritten: 20 });
  });

  it('fails closed with actionable feedback when the clipboard is unavailable', async () => {
    const writeText = vi.fn();
    const port: ClipboardPort = { isAvailable: () => false, writeText };

    const result = await copyExportToClipboard(rendered, port);

    expect(writeText).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.bytesWritten).toBe(0);
    expect(result.error).toMatch(/copy manually/i);
  });

  it('never throws and never echoes content when the browser rejects the write', async () => {
    const port: ClipboardPort = {
      isAvailable: () => true,
      writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
    };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await copyExportToClipboard(rendered, port);

    expect(result.ok).toBe(false);
    expect(result.bytesWritten).toBe(0);
    expect(result.error).not.toContain('sensitive issue body');
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain('sensitive issue body');

    errorSpy.mockRestore();
  });

  it('reports the browser clipboard as unavailable outside a browser context', () => {
    expect(browserClipboard.isAvailable()).toBe(false);
  });
});

describe('Keyboard shortcuts', () => {
  const context = { isModalOpen: false };

  it('binds N, C and Escape by default', () => {
    expect(DEFAULT_SHORTCUTS.map((b) => b.key)).toEqual(['n', 'c', 'escape']);
  });

  it('matches plain letter keys case-insensitively', () => {
    expect(resolveShortcut({ key: 'N' }, DEFAULT_SHORTCUTS, context)?.action).toBe('new_issue');
    expect(resolveShortcut({ key: 'c' }, DEFAULT_SHORTCUTS, context)?.action).toBe('auto_cluster');
    expect(resolveShortcut({ key: 'Escape' }, DEFAULT_SHORTCUTS, context)?.action).toBe('close_modal');
  });

  it('ignores unbound keys and modifier chords', () => {
    expect(resolveShortcut({ key: 'z' }, DEFAULT_SHORTCUTS, context)).toBeNull();
    expect(resolveShortcut({ key: 'n', metaKey: true }, DEFAULT_SHORTCUTS, context)).toBeNull();
    expect(resolveShortcut({ key: 'c', ctrlKey: true }, DEFAULT_SHORTCUTS, context)).toBeNull();
  });

  it('does not steal keystrokes while the user is typing, but Escape still fires', () => {
    const target = { tagName: 'INPUT' };
    expect(resolveShortcut({ key: 'n', target }, DEFAULT_SHORTCUTS, context)).toBeNull();
    expect(resolveShortcut({ key: 'Escape', target }, DEFAULT_SHORTCUTS, context)?.action).toBe(
      'close_modal'
    );
  });

  it('suppresses non-modal shortcuts while a modal is open', () => {
    const modalOpen = { isModalOpen: true };
    expect(resolveShortcut({ key: 'n' }, DEFAULT_SHORTCUTS, modalOpen)).toBeNull();
    expect(resolveShortcut({ key: 'Escape' }, DEFAULT_SHORTCUTS, modalOpen)?.action).toBe('close_modal');
  });

  it('detects every text-entry surface', () => {
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isTypingTarget({ tagName: 'select' })).toBe(true);
    expect(isTypingTarget({ isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV' })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
