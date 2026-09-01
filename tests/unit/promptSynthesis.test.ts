import { describe, it, expect } from 'vitest';
import { generatePromptForCluster, generatePRSpecForCluster } from '../../src/prompts/promptSynthesis.ts';
import { Issue, IssueCluster } from '../../src/domain/types.ts';

describe('Prompt & PR Spec Synthesis Engine', () => {
  const mockIssues: Issue[] = [
    {
      id: 'ISSUE-1',
      title: 'Fix navbar dropdown flicker',
      description: 'Mouseleave handler triggers too early',
      status: 'open',
      priority: 'medium',
      tags: ['ui', 'navbar'],
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
    },
    {
      id: 'ISSUE-2',
      title: 'Mobile menu overflow',
      description: 'Menu cuts off on 320px screens',
      status: 'open',
      priority: 'low',
      tags: ['ui', 'responsive'],
      createdAt: '2026-08-31T00:00:00Z',
      updatedAt: '2026-08-31T00:00:00Z',
    },
  ];

  const mockCluster: IssueCluster = {
    id: 'cluster-1',
    name: 'Navbar Interaction & Layout Fixes',
    reasoning: 'Both issues relate to the TopNavbar component interaction and responsive styles.',
    suggestedAction: 'Refactor navbar hover bounds and CSS flex wrapping.',
    affectedComponents: ['src/components/layout/Navbar.tsx', 'src/styles/navbar.css'],
    issueIds: ['ISSUE-1', 'ISSUE-2'],
    createdAt: '2026-08-31T00:00:00Z',
  };

  it('generates a structured prompt containing cluster context and acceptance criteria', () => {
    const prompt = generatePromptForCluster(mockCluster, mockIssues);
    expect(prompt).toContain('Navbar Interaction & Layout Fixes');
    expect(prompt).toContain('Both issues relate to the TopNavbar component');
    expect(prompt).toContain('ISSUE-1');
    expect(prompt).toContain('ISSUE-2');
    expect(prompt).toContain('src/components/layout/Navbar.tsx');
    expect(prompt).toContain('Acceptance Criteria:');
  });

  it('generates a clean PR description with issue closes tags', () => {
    const prSpec = generatePRSpecForCluster(mockCluster, mockIssues);
    expect(prSpec).toContain('Closes #ISSUE-1');
    expect(prSpec).toContain('Closes #ISSUE-2');
    expect(prSpec).toContain('Navbar Interaction & Layout Fixes');
  });
});
