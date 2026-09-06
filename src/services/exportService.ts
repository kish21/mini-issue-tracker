/**
 * Export Service — multi-format export profiles + clipboard engine.
 *
 * Layering: this service owns *which* formats exist and how a rendered payload
 * reaches the clipboard. The markdown/plain-text templates themselves live in
 * `src/prompts/promptSynthesis.ts`, and the clipboard itself is reached through
 * an injected port so the service stays testable without a DOM.
 */
import {
  ExportFormatId,
  ExportProfileContract,
  ExportRenderResult,
  ClipboardWriteResult,
  GeneratedPromptSpecContract,
} from '../domain/contracts.ts';
import { Issue, IssueCluster } from '../domain/types.ts';
import {
  generatePromptForCluster,
  generatePRSpecForCluster,
  generateSummaryForCluster,
} from '../prompts/promptSynthesis.ts';
import { logger } from './logger.ts';

const LOG_CONTEXT = 'ExportService';

/**
 * Registry of available export profiles. Presentation order is the tab order.
 */
export const EXPORT_PROFILES: readonly ExportProfileContract[] = [
  {
    id: 'agent_prompt',
    label: 'Agent Prompt',
    description: 'Task prompt for an AI coding agent (Gemini / Cursor / Copilot).',
    fileExtension: '.md',
  },
  {
    id: 'pr_description',
    label: 'PR Description',
    description: 'GitHub pull request body with Closes #... issue tags.',
    fileExtension: '.md',
  },
  {
    id: 'summary',
    label: 'Summary',
    description: 'Plain-text triage digest for standups, chat and tickets.',
    fileExtension: '.txt',
  },
] as const;

export const DEFAULT_EXPORT_FORMAT: ExportFormatId = EXPORT_PROFILES[0].id;

type ExportRenderer = (cluster: IssueCluster, issues: Issue[]) => string;

const RENDERERS: Readonly<Record<ExportFormatId, ExportRenderer>> = {
  agent_prompt: generatePromptForCluster,
  pr_description: generatePRSpecForCluster,
  summary: generateSummaryForCluster,
};

export function getExportProfile(formatId: ExportFormatId): ExportProfileContract {
  const profile = EXPORT_PROFILES.find((p) => p.id === formatId);
  if (!profile) {
    throw new Error(`Unknown export format: '${formatId}'.`);
  }
  return profile;
}

/**
 * Render a single export profile for a cluster.
 */
export function renderExport(
  formatId: ExportFormatId,
  cluster: IssueCluster,
  issues: Issue[],
  now: string = new Date().toISOString()
): ExportRenderResult {
  const renderer = RENDERERS[formatId];
  if (!renderer) {
    throw new Error(`Unknown export format: '${formatId}'.`);
  }

  return {
    formatId,
    content: renderer(cluster, issues),
    generatedAt: now,
  };
}

/**
 * Render every profile at once into the shared prompt-spec contract.
 */
export function buildPromptSpec(
  cluster: IssueCluster,
  issues: Issue[],
  now: string = new Date().toISOString()
): GeneratedPromptSpecContract {
  return {
    clusterId: cluster.id,
    title: cluster.name,
    agentPrompt: renderExport('agent_prompt', cluster, issues, now).content,
    prDescription: renderExport('pr_description', cluster, issues, now).content,
    summary: renderExport('summary', cluster, issues, now).content,
    generatedAt: now,
  };
}

/**
 * Clipboard port — injected so business logic never touches a vendor/browser
 * API directly and unit tests need no DOM.
 */
export interface ClipboardPort {
  isAvailable(): boolean;
  writeText(text: string): Promise<void>;
}

export const browserClipboard: ClipboardPort = {
  isAvailable: () =>
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.writeText === 'function' &&
    // The async clipboard API is only exposed in secure contexts.
    (typeof window === 'undefined' || window.isSecureContext !== false),
  writeText: (text: string) => navigator.clipboard.writeText(text),
};

/**
 * Copy rendered export content to the clipboard.
 *
 * Fails closed and never throws: the caller always gets a structured result to
 * drive user feedback. The clipboard payload is never logged or echoed — only
 * its byte length — so issue content cannot leak into logs or telemetry.
 */
export async function copyExportToClipboard(
  result: ExportRenderResult,
  clipboard: ClipboardPort = browserClipboard
): Promise<ClipboardWriteResult> {
  const bytesWritten = result.content.length;

  if (!clipboard.isAvailable()) {
    logger.warn(LOG_CONTEXT, 'Clipboard unavailable in this context.', { formatId: result.formatId });
    return {
      ok: false,
      formatId: result.formatId,
      bytesWritten: 0,
      error: 'Clipboard is unavailable in this browser context. Select the text and copy manually.',
    };
  }

  try {
    await clipboard.writeText(result.content);
    logger.info(LOG_CONTEXT, 'Export copied to clipboard.', {
      formatId: result.formatId,
      bytesWritten,
    });
    return { ok: true, formatId: result.formatId, bytesWritten };
  } catch (error) {
    logger.error(LOG_CONTEXT, 'Clipboard write was rejected.', {
      formatId: result.formatId,
      error: error instanceof Error ? error.message : 'Unknown clipboard error.',
    });
    return {
      ok: false,
      formatId: result.formatId,
      bytesWritten: 0,
      error: 'Copy was blocked by the browser. Select the text and copy manually.',
    };
  }
}
