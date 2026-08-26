import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, File, Folder, Home, RefreshCw } from 'lucide-react';
import { github, GitHubBranch, GitHubContent } from '../../lib/github';

interface GitHubExplorerProps { repo: string; initialPath?: string; branch?: string; branches?: GitHubBranch[]; onBranchChange?: (branch: string) => void; onFileSelect?: (file: GitHubContent) => void; className?: string; }

export default function GitHubExplorer({ repo, initialPath = '', branch, branches = [], onBranchChange, onFileSelect, className = '' }: GitHubExplorerProps) {
  const [path, setPath] = useState(initialPath);
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const effectiveBranch = branch || '';

  const loadContents = useCallback(async (targetPath: string) => {
    if (!repo) return;
    setLoading(true); setError('');
    try { const data = await github.listContents(repo, targetPath, effectiveBranch || undefined); setContents(Array.isArray(data) ? data : [data]); }
    catch (err) { setContents([]); setError(err instanceof Error ? err.message : 'Unable to load repository contents.'); }
    finally { setLoading(false); }
  }, [repo, effectiveBranch]);

  useEffect(() => { setPath(initialPath); loadContents(initialPath); }, [initialPath, loadContents]);
  const navigate = (nextPath: string) => { setPath(nextPath); loadContents(nextPath); };
  const parentPath = useMemo(() => path.split('/').filter(Boolean).slice(0, -1).join('/'), [path]);
  const segments = path ? path.split('/').filter(Boolean) : [];
  const sorted = [...contents].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));

  return <section className={`bg-[#0b0f19] border border-[#1a2234] rounded-xl shadow-lg overflow-hidden ${className}`}>
    <div className="px-4 py-3 border-b border-[#1a2234] flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1 text-xs font-mono text-slate-400 min-w-0">
        <button onClick={() => navigate('')} className="hover:text-cyan-300 flex items-center gap-1" aria-label="Repository root"><Home size={14} /> <span className="truncate max-w-[220px]">{repo}</span></button>
        {segments.map((segment, index) => { const segmentPath = segments.slice(0, index + 1).join('/'); return <React.Fragment key={segmentPath}><ChevronRight size={13} className="text-slate-600" /><button onClick={() => navigate(segmentPath)} className="hover:text-cyan-300">{segment}</button></React.Fragment>; })}
      </div>
      <div className="flex items-center gap-2">
        {branches.length > 0 && <select value={effectiveBranch} onChange={e => onBranchChange?.(e.target.value)} className="px-2 py-1.5 bg-[#06080d] border border-[#1a2234] rounded-lg text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-500" aria-label="Select branch">{branches.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select>}
        <button onClick={() => loadContents(path)} className="p-1.5 text-slate-400 hover:text-cyan-300" title="Refresh directory"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
      </div>
    </div>
    {path && <button onClick={() => navigate(parentPath)} className="mx-4 mt-3 text-[11px] font-mono text-slate-400 hover:text-cyan-300">← Parent directory</button>}
    {error && <div className="m-4 p-3 rounded-lg border border-red-900/70 bg-red-950/30 text-red-300 text-xs">{error}</div>}
    {loading ? <div className="p-4 space-y-2">{[1,2,3,4].map(item => <div key={item} className="h-10 animate-pulse rounded-lg bg-[#121826]" />)}</div> : <div className="divide-y divide-[#1a2234]">
      {sorted.length === 0 && !error && <p className="p-6 text-center text-xs font-mono text-slate-500">This directory is empty.</p>}
      {sorted.map(item => <button key={item.path} onClick={() => item.type === 'dir' ? navigate(item.path) : onFileSelect?.(item)} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#121826] transition-colors">
        {item.type === 'dir' ? <Folder size={17} className="text-cyan-400 shrink-0" /> : <File size={17} className="text-slate-400 shrink-0" />}
        <span className="text-xs text-slate-200 truncate">{item.name}</span>
        {item.type !== 'dir' && <span className="ml-auto text-[10px] font-mono text-slate-500">{item.size.toLocaleString()} B</span>}
      </button>)}
    </div>}
  </section>;
}
