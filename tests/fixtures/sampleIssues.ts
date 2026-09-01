import { Issue } from '../../src/domain/types.ts';

export const SAMPLE_ISSUES: Issue[] = [
  {
    id: 'ISSUE-101',
    title: 'Navbar dropdown flickers on fast mouse hover',
    description: 'When hovering over the profile dropdown in the top navbar, the menu opens and closes rapidly due to mouseleave trigger boundary.',
    status: 'open',
    priority: 'medium',
    tags: ['ui', 'navbar', 'frontend'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ISSUE-102',
    title: 'Navbar theme toggle button cuts off on mobile screens',
    description: 'On screens smaller than 375px width, the dark/light toggle icon wraps below the navbar row and clips off-screen.',
    status: 'open',
    priority: 'low',
    tags: ['ui', 'navbar', 'responsive'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ISSUE-103',
    title: 'Token expiry returns 500 error instead of 401 redirect',
    description: 'When JWT expires, the backend throws an unhandled NullReference exception causing 500 status rather than redirecting to login.',
    status: 'open',
    priority: 'high',
    tags: ['auth', 'backend', 'api'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ISSUE-104',
    title: 'Refresh token rotation fails on concurrent tab requests',
    description: 'If two browser tabs fire API requests at the same second with an expired access token, the second refresh token request gets invalidated.',
    status: 'open',
    priority: 'critical',
    tags: ['auth', 'backend', 'security'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
