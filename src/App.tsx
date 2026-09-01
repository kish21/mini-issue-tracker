import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Layers, 
  Copy, 
  Check, 
  Code2, 
  Sun, 
  Moon, 
  GitPullRequest, 
  Trash2,
  Terminal,
  Cpu
} from 'lucide-react';
import { Issue, IssueCluster } from './domain/types.ts';
import { SAMPLE_ISSUES } from '../tests/fixtures/sampleIssues.ts';
import { MockLLMProvider, GeminiLLMProvider } from './providers/llm/llmProvider.ts';
import { generatePromptForCluster, generatePRSpecForCluster } from './prompts/promptSynthesis.ts';
import { config } from './config/config.ts';

export const App: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>(SAMPLE_ISSUES);
  const [clusters, setClusters] = useState<IssueCluster[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>(['ISSUE-101', 'ISSUE-102']);
  const [isDark, setIsDark] = useState(true);
  const [isClustering, setIsClustering] = useState(false);
  const [activeModal, setActiveModal] = useState<{ cluster: IssueCluster; issues: Issue[] } | null>(null);
  const [copiedType, setCopiedType] = useState<'prompt' | 'pr' | null>(null);
  const [filterTag, setFilterTag] = useState<string>('all');

  // New Issue Input Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState('ui, frontend');
  const [newPriority, setNewPriority] = useState<Issue['priority']>('medium');
  const [showAddForm, setShowAddForm] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('light', isDark);
  };

  const handleSelectIssue = (id: string) => {
    setSelectedIssueIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const issue: Issue = {
      id: `ISSUE-${Math.floor(100 + Math.random() * 900)}`,
      title: newTitle.trim(),
      description: newDesc.trim() || 'No description provided.',
      priority: newPriority,
      status: 'open',
      tags: newTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIssues([issue, ...issues]);
    setNewTitle('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const handleDeleteIssue = (id: string) => {
    setIssues(issues.filter((i) => i.id !== id));
    setSelectedIssueIds(selectedIssueIds.filter((i) => i !== id));
  };

  const handleRunClustering = async () => {
    setIsClustering(true);
    try {
      const provider = config.geminiApiKey 
        ? new GeminiLLMProvider(config.geminiApiKey, config.geminiModel)
        : new MockLLMProvider();

      const openIssues = issues.filter((i) => i.status !== 'resolved');
      const generatedClusters = await provider.clusterIssues(openIssues);
      setClusters(generatedClusters);

      // Update issue statuses to clustered
      const clusteredIds = new Set(generatedClusters.flatMap((c) => c.issueIds));
      setIssues(issues.map((i) => clusteredIds.has(i.id) ? { ...i, status: 'clustered', clusterId: generatedClusters.find((c) => c.issueIds.includes(i.id))?.id } : i));
    } catch (error) {
      console.error('Clustering failed:', error);
      alert('Clustering error. Falling back to local heuristic grouping.');
    } finally {
      setIsClustering(false);
    }
  };

  const handleSynthesizeManualPrompt = () => {
    const selected = issues.filter((i) => selectedIssueIds.includes(i.id));
    if (selected.length === 0) return;

    const manualCluster: IssueCluster = {
      id: `manual-cluster-${Date.now()}`,
      name: `Selected Issues Batch (${selected.length} items)`,
      reasoning: 'User-selected batch of related issues to solve together.',
      suggestedAction: 'Refactor and implement required fixes.',
      affectedComponents: Array.from(new Set(selected.flatMap((i) => i.tags.map((t) => `src/modules/${t}`)))),
      issueIds: selected.map((i) => i.id),
      createdAt: new Date().toISOString(),
    };

    setActiveModal({ cluster: manualCluster, issues: selected });
  };

  const handleCopy = (text: string, type: 'prompt' | 'pr') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const allTags = ['all', ...Array.from(new Set(issues.flatMap((i) => i.tags)))];
  const filteredIssues = filterTag === 'all' 
    ? issues 
    : issues.filter((i) => i.tags.includes(filterTag));

  return (
    <div className="app-layout">
      {/* Navigation Header */}
      <header className="app-header">
        <div className="brand-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={22} color="var(--color-accent-primary)" />
            <h1 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Mini Issue Tracker</h1>
          </div>
          <span className="brand-badge">2026 AI-Native</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn btn-secondary"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={15} />
            <span>New Issue</span>
          </button>

          <button 
            className="btn btn-primary"
            onClick={handleRunClustering}
            disabled={isClustering}
          >
            <Sparkles size={15} />
            <span>{isClustering ? 'Analyzing...' : 'Auto-Cluster (AI)'}</span>
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="main-content">
        {/* Left Column: Issue Stream */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick Filter & Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 500,
                    border: '1px solid var(--color-border-subtle)',
                    background: filterTag === tag ? 'var(--color-accent-subtle)' : 'var(--color-bg-surface)',
                    color: filterTag === tag ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {tag.toUpperCase()}
                </button>
              ))}
            </div>

            {selectedIssueIds.length > 0 && (
              <button 
                className="btn btn-primary"
                onClick={handleSynthesizeManualPrompt}
                style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
              >
                <Terminal size={14} />
                <span>Prompt from Selected ({selectedIssueIds.length})</span>
              </button>
            )}
          </div>

          {/* Quick Issue Creator Card */}
          {showAddForm && (
            <div className="card" style={{ border: '1px solid var(--color-accent-primary)' }}>
              <form onSubmit={handleAddIssue} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Issue title (e.g. Profile modal crashes on unverified users)..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--color-bg-surface-elevated)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                  }}
                  autoFocus
                />
                <textarea
                  placeholder="Detailed description, reproduction steps, or context..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--color-bg-surface-elevated)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Tags (comma separated: auth, api, ui)"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--color-bg-surface-elevated)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      width: '240px',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--color-bg-surface-elevated)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical</option>
                    </select>
                    <button type="submit" className="btn btn-primary">Save Issue</button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Issue Stream Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredIssues.map((issue) => {
              const isSelected = selectedIssueIds.includes(issue.id);
              return (
                <div
                  key={issue.id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    backgroundColor: isSelected ? 'var(--color-bg-surface-elevated)' : 'var(--color-bg-surface)',
                    borderColor: isSelected ? 'var(--color-accent-primary)' : 'var(--color-border-subtle)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectIssue(issue.id)}
                    style={{ marginTop: '4px', cursor: 'pointer', accentColor: 'var(--color-accent-primary)' }}
                  />

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`status-dot status-dot-${issue.status}`} />
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {issue.id}
                        </span>
                        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{issue.title}</h2>
                      </div>
                      <button
                        onClick={() => handleDeleteIssue(issue.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                        title="Delete issue"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {issue.description}
                    </p>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                      {issue.tags.map((tag) => (
                        <span key={tag} className="badge-tag">#{tag}</span>
                      ))}
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                        Priority: <strong style={{ color: issue.priority === 'critical' ? 'var(--color-danger)' : 'inherit' }}>{issue.priority}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: AI Clusters & Synthesis */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--color-accent-primary)" />
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Semantic Clusters</h3>
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {clusters.length} active
            </span>
          </div>

          {clusters.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <Sparkles size={32} color="var(--color-accent-primary)" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>No Clusters Yet</h4>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Click "Auto-Cluster (AI)" to automatically detect shared root causes across open issues.
              </p>
            </div>
          ) : (
            clusters.map((cluster) => {
              const clusterIssues = issues.filter((i) => cluster.issueIds.includes(i.id));
              return (
                <div key={cluster.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-accent-text)' }}>
                      {cluster.name}
                    </h4>
                    <span className="badge-tag">{cluster.issueIds.length} issues</span>
                  </div>

                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    {cluster.reasoning}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Affected Files:</span>
                    {cluster.affectedComponents.map((c) => (
                      <span key={c} style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-primary)' }}>
                        • {c}
                      </span>
                    ))}
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setActiveModal({ cluster, issues: clusterIssues })}
                    style={{ marginTop: '6px', width: '100%', justifyContent: 'center' }}
                  >
                    <Code2 size={14} />
                    <span>View AI Prompt & PR Spec</span>
                  </button>
                </div>
              );
            })
          )}
        </aside>
      </main>

      {/* Synthesis Modal */}
      {activeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div className="card" style={{
            maxWidth: '750px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'var(--color-bg-surface-elevated)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>{activeModal.cluster.name}</h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  Synthesis for {activeModal.issues.length} connected issues
                </p>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => setActiveModal(null)}
                style={{ padding: '4px 10px' }}
              >
                Close
              </button>
            </div>

            {/* Generated Prompt Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Terminal size={14} />
                  <span>Agent Coding Prompt (Gemini / Cursor / Copilot)</span>
                </span>
                <button
                  className="btn btn-primary"
                  onClick={() => handleCopy(generatePromptForCluster(activeModal.cluster, activeModal.issues), 'prompt')}
                  style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                >
                  {copiedType === 'prompt' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedType === 'prompt' ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
              </div>
              <pre style={{
                background: 'var(--color-bg-canvas)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: 'var(--font-size-xs)',
                overflowX: 'auto',
                maxHeight: '160px',
                border: '1px solid var(--color-border-subtle)',
                whiteSpace: 'pre-wrap',
              }}>
                {generatePromptForCluster(activeModal.cluster, activeModal.issues)}
              </pre>
            </div>

            {/* PR Spec Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GitPullRequest size={14} />
                  <span>GitHub Pull Request Description</span>
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCopy(generatePRSpecForCluster(activeModal.cluster, activeModal.issues), 'pr')}
                  style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                >
                  {copiedType === 'pr' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedType === 'pr' ? 'Copied!' : 'Copy PR Spec'}</span>
                </button>
              </div>
              <pre style={{
                background: 'var(--color-bg-canvas)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: 'var(--font-size-xs)',
                overflowX: 'auto',
                maxHeight: '130px',
                border: '1px solid var(--color-border-subtle)',
                whiteSpace: 'pre-wrap',
              }}>
                {generatePRSpecForCluster(activeModal.cluster, activeModal.issues)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
