import {
  ClusterableIssue,
  IssueClusterContract,
  MIN_CLUSTER_SIZE,
  parseLLMClusterResponse,
} from '../../domain/contracts.ts';
import {
  CLUSTERING_RESPONSE_JSON_SCHEMA,
  CLUSTERING_SYSTEM_PROMPT,
  buildClusteringPrompt,
  sanitizeIssueId,
} from '../../prompts/clusteringPrompt.ts';
import { logger } from '../../services/logger.ts';

/**
 * LLM adapter layer.
 *
 * Providers are transport + parsing only: they either return validated clusters or
 * throw a typed LLMProviderError. Fail-soft policy (what to do when the primary
 * provider dies) belongs to ClusterService, not here.
 */

export type LLMErrorCode =
  | 'no_api_key'
  | 'timeout'
  | 'network_error'
  | 'http_error'
  | 'empty_response'
  | 'invalid_json'
  | 'invalid_schema';

export class LLMProviderError extends Error {
  constructor(
    readonly code: LLMErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

export interface ILLMProvider {
  /** Stable identifier used in logs and audit records. */
  readonly name: string;
  clusterIssues(issues: readonly ClusterableIssue[]): Promise<IssueClusterContract[]>;
}

export interface LLMProviderOptions {
  /** Injected clock - keeps generated timestamps deterministic under test. */
  now?: () => Date;
  /** Injected cluster-ID factory - keeps generated IDs deterministic under test. */
  idFactory?: (index: number) => string;
  /** Hard cap on issues sent in one request (latency + token budget). */
  maxIssuesPerRequest?: number;
}

/** Defaults live here, in one place, and are overridable per instance. */
export const LLM_PROVIDER_DEFAULTS = {
  maxIssuesPerRequest: 40,
} as const;

export const GEMINI_DEFAULTS = {
  model: 'gemini-2.0-flash',
  timeoutMs: 10_000,
  temperature: 0.2,
  endpointBase: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const;

export interface GeminiProviderOptions extends LLMProviderOptions {
  timeoutMs?: number;
  temperature?: number;
  endpointBase?: string;
  /** Injected fetch - lets the unit tests exercise every failure branch offline. */
  fetchImpl?: typeof fetch;
}

function resolveClock(options: LLMProviderOptions): () => Date {
  return options.now ?? (() => new Date());
}

function resolveIdFactory(options: LLMProviderOptions, clock: () => Date): (index: number) => string {
  return options.idFactory ?? ((index: number) => `cluster-${clock().getTime()}-${index}`);
}

/**
 * Give every issue a prompt-safe alias and keep the reverse map.
 * Unsafe or colliding IDs fall back to a positional alias so no issue is ever lost.
 */
export function aliasIssueIds(issues: readonly ClusterableIssue[]): {
  aliased: ClusterableIssue[];
  toOriginalId: Map<string, string>;
} {
  const toOriginalId = new Map<string, string>();
  const aliased = issues.map((issue, index) => {
    const safe = sanitizeIssueId(issue.id);
    const alias = !safe || toOriginalId.has(safe) ? `issue-${index}` : safe;
    toOriginalId.set(alias, issue.id);
    return { ...issue, id: alias };
  });
  return { aliased, toOriginalId };
}

/**
 * Deterministic, offline clustering heuristic.
 *
 * Each issue is assigned to its highest-frequency tag across the batch (ties broken
 * lexicographically, so the result is stable); tag groups of at least MIN_CLUSTER_SIZE
 * become clusters. It cannot know real file paths, so affectedComponents is left empty
 * rather than fabricated.
 */
export class MockLLMProvider implements ILLMProvider {
  readonly name = 'mock-heuristic';

  private readonly clock: () => Date;
  private readonly nextId: (index: number) => string;

  constructor(options: LLMProviderOptions = {}) {
    this.clock = resolveClock(options);
    this.nextId = resolveIdFactory(options, this.clock);
  }

  async clusterIssues(issues: readonly ClusterableIssue[]): Promise<IssueClusterContract[]> {
    if (issues.length < MIN_CLUSTER_SIZE) return [];

    const tagFrequency = new Map<string, number>();
    for (const issue of issues) {
      for (const tag of new Set(issue.tags)) {
        tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
      }
    }

    const groups = new Map<string, ClusterableIssue[]>();
    for (const issue of issues) {
      const primaryTag = [...new Set(issue.tags)].sort((a, b) => {
        const byFrequency = (tagFrequency.get(b) ?? 0) - (tagFrequency.get(a) ?? 0);
        return byFrequency !== 0 ? byFrequency : a.localeCompare(b);
      })[0];
      if (!primaryTag) continue;
      const bucket = groups.get(primaryTag) ?? [];
      bucket.push(issue);
      groups.set(primaryTag, bucket);
    }

    const createdAt = this.clock().toISOString();
    return [...groups.entries()]
      .filter(([, grouped]) => grouped.length >= MIN_CLUSTER_SIZE)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, grouped], index) => ({
        id: this.nextId(index),
        name: `Shared "${tag}" surface`,
        reasoning: `Local heuristic: ${grouped.length} issues are tagged "${tag}", so they most likely touch the same area of the codebase.`,
        suggestedAction: `Review the "${tag}" area and fix these issues in one pass.`,
        affectedComponents: [],
        issueIds: grouped.map((issue) => issue.id),
        confidenceScore_0_1: 0.4,
        createdAt,
      }));
  }
}

/** Google Gemini adapter. Times out, never puts the API key in a URL, never logs it. */
export class GeminiLLMProvider implements ILLMProvider {
  readonly name = 'gemini';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly temperature: number;
  private readonly endpointBase: string;
  private readonly maxIssuesPerRequest: number;
  private readonly fetchImpl: typeof fetch;
  private readonly clock: () => Date;
  private readonly nextId: (index: number) => string;

  constructor(apiKey: string, model?: string, options: GeminiProviderOptions = {}) {
    this.apiKey = apiKey;
    this.model = model || GEMINI_DEFAULTS.model;
    this.timeoutMs = options.timeoutMs ?? GEMINI_DEFAULTS.timeoutMs;
    this.temperature = options.temperature ?? GEMINI_DEFAULTS.temperature;
    this.endpointBase = options.endpointBase ?? GEMINI_DEFAULTS.endpointBase;
    this.maxIssuesPerRequest = options.maxIssuesPerRequest ?? LLM_PROVIDER_DEFAULTS.maxIssuesPerRequest;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
    this.clock = resolveClock(options);
    this.nextId = resolveIdFactory(options, this.clock);
  }

  async clusterIssues(issues: readonly ClusterableIssue[]): Promise<IssueClusterContract[]> {
    if (!this.apiKey) {
      throw new LLMProviderError('no_api_key', 'No Gemini API key configured.');
    }
    if (issues.length < MIN_CLUSTER_SIZE) return [];

    const batch = issues.slice(0, this.maxIssuesPerRequest);
    if (batch.length < issues.length) {
      logger.warn('GeminiLLMProvider', 'Issue batch truncated to the per-request cap', {
        received: issues.length,
        sent: batch.length,
        cap: this.maxIssuesPerRequest,
      });
    }

    // The model only ever sees sanitized IDs, so validation and the returned
    // clusters are mapped back through the same alias table. Without this, any
    // issue ID containing an unsafe character would silently lose its cluster.
    const { aliased, toOriginalId } = aliasIssueIds(batch);

    const payload = await this.requestClusters(aliased);
    const validated = this.validate(payload, aliased);
    const createdAt = this.clock().toISOString();

    return validated.clusters.map((cluster, index) => ({
      id: this.nextId(index),
      name: cluster.name,
      reasoning: cluster.reasoning,
      suggestedAction: cluster.suggestedAction,
      affectedComponents: cluster.affectedComponents,
      issueIds: cluster.issueIds.map((alias) => toOriginalId.get(alias) ?? alias),
      confidenceScore_0_1: cluster.confidenceScore_0_1 ?? 0.5,
      createdAt,
    }));
  }

  private async requestClusters(issues: readonly ClusterableIssue[]): Promise<unknown> {
    const endpoint = `${this.endpointBase}/${encodeURIComponent(this.model)}:generateContent`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          // Header, not a query param: keys in URLs leak into logs and referrers.
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: CLUSTERING_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: buildClusteringPrompt(issues) }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: CLUSTERING_RESPONSE_JSON_SCHEMA,
            temperature: this.temperature,
          },
        }),
      });

      if (!response.ok) {
        throw new LLMProviderError(
          'http_error',
          `Gemini API error: ${response.status} ${response.statusText}`,
        );
      }

      let body: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      try {
        body = await response.json();
      } catch (error) {
        throw new LLMProviderError('invalid_json', 'Gemini returned a non-JSON response body.', error);
      }

      const rawText = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new LLMProviderError('empty_response', 'Gemini returned no candidate text.');
      }

      try {
        return JSON.parse(rawText);
      } catch (error) {
        throw new LLMProviderError('invalid_json', 'Gemini returned malformed JSON.', error);
      }
    } catch (error) {
      if (error instanceof LLMProviderError) throw error;
      if (controller.signal.aborted) {
        throw new LLMProviderError('timeout', `Gemini request timed out after ${this.timeoutMs}ms.`, error);
      }
      throw new LLMProviderError('network_error', 'Gemini request failed.', error);
    } finally {
      clearTimeout(timer);
    }
  }

  private validate(payload: unknown, issues: readonly ClusterableIssue[]) {
    try {
      return parseLLMClusterResponse(payload, issues.map((issue) => issue.id));
    } catch (error) {
      throw new LLMProviderError(
        'invalid_schema',
        error instanceof Error ? error.message : 'Gemini response failed schema validation.',
        error,
      );
    }
  }
}

/** Composition-root factory: config decides the adapter, business logic never does. */
export function createLLMProvider(
  appConfig: { geminiApiKey: string; geminiModel: string },
  options: GeminiProviderOptions = {},
): ILLMProvider {
  return appConfig.geminiApiKey
    ? new GeminiLLMProvider(appConfig.geminiApiKey, appConfig.geminiModel, options)
    : new MockLLMProvider(options);
}
