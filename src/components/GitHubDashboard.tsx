import React, { useEffect, useMemo, useState } from 'react';
import { Github, RefreshCw } from 'lucide-react';
import { github, GitHubContent, GitHubRepo } from '../lib/github';
import FileViewer from './github/FileViewer';
import GitHubExplorer from './github/GitHubExplorer';
import RepoCard from './github/RepoCard';

const PROMPT_LIBRARY_REPO = 'prompt-library'; // TODO: update to actual repo name
const VISUAL_ASSETS_REPO = 'visual-assets'; // TODO: update to actual repo name
type Tab = 'repos' | 'prompts' | 'assets' | 'ads';

export default function GitHubDashboard() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [tab, setTab] = useState<Tab>('repos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adsRepo, setAdsRepo] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ repo: string; file: GitHubContent } | null>(null);
  const adsRepos = useMemo(() => repos.filter(repo => repo.name.toLowerCase().includes('ads')), [repos]);
  const loadRepos = async () => { setLoading(true); setError(''); try { const data = await github.listRepos(); setRepos(data); setAdsRepo(current => current || data.find(repo => repo.name.toLowerCase().includes('ads'))?.name || ''); } catch (err: any) { setError(err.message || 'Unable to load GitHub repositories.'); } finally { setLoading(false); } };
  useEffect(() => { loadRepos(); }, []);
  const selectFile = (repo: string) => (file: GitHubContent) => setSelectedFile({ repo, file });
  const tabs: Array<{ id: Tab; label: string }> = [{ id: 'repos', label: 'Repos' }, { id: 'prompts', label: 'Prompt Library' }, { id: 'assets', label: 'Visual Assets' }, { id: 'ads', label: 'Google Ads' }];
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Github size={21} className="text-cyan-400" /><h2 className="text-lg font-display font-bold text-white">GitHub Hub</h2></div><p className="mt-1 text-xs text-slate-400">Browse connected repositories and open files from the command centre.</p></div><button onClick={loadRepos} disabled={loading} className="self-start px-3 py-2 text-xs font-mono border border-[#1a2234] rounded-lg text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 disabled:opacity-50 flex items-center gap-2"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button></div>
    <div className="border-b border-[#1a2234] flex gap-1 overflow-x-auto">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`px-4 py-2.5 text-xs font-mono whitespace-nowrap border-b-2 ${tab === item.id ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>{item.label}</button>)}</div>
    {error && <div className="p-3 rounded-lg border border-red-900/70 bg-red-950/30 text-red-300 text-xs">{error}</div>}
    {tab === 'repos' && (loading ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[1, 2, 3].map(item => <div key={item} className="h-40 rounded-xl bg-[#0b0f19] border border-[#1a2234] animate-pulse" />)}</div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{repos.map(repo => <RepoCard key={repo.id} repo={repo} onSelect={() => setTab('ads')} />)}{repos.length === 0 && !error && <p className="text-xs text-slate-500">No repositories are available.</p>}</div>)}
    {tab === 'prompts' && <GitHubExplorer repo={PROMPT_LIBRARY_REPO} onFileSelect={selectFile(PROMPT_LIBRARY_REPO)} />}
    {tab === 'assets' && <GitHubExplorer repo={VISUAL_ASSETS_REPO} onFileSelect={selectFile(VISUAL_ASSETS_REPO)} />}
    {tab === 'ads' && <div className="space-y-4"><select value={adsRepo} onChange={event => setAdsRepo(event.target.value)} className="w-full sm:w-80 px-3 py-2.5 bg-[#0b0f19] border border-[#1a2234] rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500" disabled={loading || adsRepos.length === 0}><option value="">{loading ? 'Loading repositories…' : 'No Google Ads repositories found'}</option>{adsRepos.map(repo => <option key={repo.id} value={repo.name}>{repo.name}</option>)}</select>{adsRepo && <GitHubExplorer repo={adsRepo} onFileSelect={selectFile(adsRepo)} />}</div>}
    {selectedFile && <FileViewer repo={selectedFile.repo} path={selectedFile.file.path} sha={selectedFile.file.sha} onClose={() => setSelectedFile(null)} />}
  </div>;
}
