import { describe, it, expect } from 'vitest';
import { config } from '../../src/config/config.ts';
import { LocalStorageAdapter } from '../../src/providers/storage/storageAdapter.ts';
import { MockLLMProvider } from '../../src/providers/llm/llmProvider.ts';

describe('Foundation Health & Wiring Smoke Test', () => {
  it('loads runtime configuration with safe fallbacks', () => {
    expect(config).toBeDefined();
    expect(config.geminiModel).toBe('gemini-2.0-flash');
    expect(['local', 'memory']).toContain(config.storageMode);
  });

  it('instantiates the storage adapter cleanly', () => {
    const storage = new LocalStorageAdapter();
    expect(storage).toBeDefined();
    expect(typeof storage.loadIssues).toBe('function');
  });

  it('instantiates the LLM provider interface', () => {
    const llm = new MockLLMProvider();
    expect(llm).toBeDefined();
    expect(typeof llm.clusterIssues).toBe('function');
  });
});
