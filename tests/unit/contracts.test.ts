import { describe, it, expect } from 'vitest';
import { 
  validateIssue, 
  CURRENT_SCHEMA_VERSION, 
  IssueContract, 
  StorageDatabaseSchema 
} from '../../src/domain/contracts.ts';

describe('Contracts & Schema Verification', () => {
  it('validates and normalizes valid issue contracts with default tenant keys', () => {
    const raw = {
      title: '  Button unaligned on mobile  ',
      description: 'Clipped on 375px',
      tags: [' UI ', 'NAVBAR '],
    };

    const valid = validateIssue(raw);
    expect(valid.title).toBe('Button unaligned on mobile');
    expect(valid.tags).toEqual(['ui', 'navbar']);
    expect(valid.tenantId).toBe('default_local');
    expect(valid.status).toBe('open');
    expect(valid.priority).toBe('medium');
    expect(valid.id).toMatch(/^ISSUE-\d+/);
    expect(new Date(valid.createdAt).getTime()).not.toBeNaN();
  });

  it('rejects invalid contracts missing required title', () => {
    expect(() => validateIssue({ title: '   ' })).toThrow('Contract validation failed');
  });

  it('verifies storage database schema versioning', () => {
    const db: StorageDatabaseSchema = {
      version: CURRENT_SCHEMA_VERSION,
      issues: [],
      clusters: [],
      lastMigratedAt: new Date().toISOString(),
    };

    expect(db.version).toBe(1);
    expect(Array.isArray(db.issues)).toBe(true);
    expect(Array.isArray(db.clusters)).toBe(true);
  });
});
