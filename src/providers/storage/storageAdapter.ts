import { Issue, IssueCluster } from '../../domain/types.ts';

export interface IStorageAdapter {
  loadIssues(): Promise<Issue[]>;
  saveIssues(issues: Issue[]): Promise<void>;
  loadClusters(): Promise<IssueCluster[]>;
  saveClusters(clusters: IssueCluster[]): Promise<void>;
}

const ISSUES_KEY = 'mini_issue_tracker_issues_v1';
const CLUSTERS_KEY = 'mini_issue_tracker_clusters_v1';

export class LocalStorageAdapter implements IStorageAdapter {
  async loadIssues(): Promise<Issue[]> {
    try {
      const data = localStorage.getItem(ISSUES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async saveIssues(issues: Issue[]): Promise<void> {
    try {
      localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
    } catch (e) {
      console.error('Failed to save issues to LocalStorage:', e);
    }
  }

  async loadClusters(): Promise<IssueCluster[]> {
    try {
      const data = localStorage.getItem(CLUSTERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async saveClusters(clusters: IssueCluster[]): Promise<void> {
    try {
      localStorage.setItem(CLUSTERS_KEY, JSON.stringify(clusters));
    } catch (e) {
      console.error('Failed to save clusters to LocalStorage:', e);
    }
  }
}
