import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, File, Folder, Home } from 'lucide-react';
import { github, GitHubContent } from '../../lib/github';

interface GitHubExplorerProps {
  repo: string;
  initialPath?: string;
  onFileSelect?: (file: GitHubContent) => void;
  className?: string;
}

export default function GitHubExplorer({ repo, initialPath = '', onFileSelect, className = '' }: GitHubExplorerProps) {
  const [path, setPath] = useState(initialPath);
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadContents = useCallback(async (targetPath: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await github.getContents(repo, targetPath);
      setContents(Array.isArray(data) ? data : [data]);
    } catch (err: any) {
      setContents([]);
      setError(err.message || 'Unable to load repository contents.');
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    setPath(initialPath);
    loadContents(initialPath);
  }, [initialPath, loadContents]);

  const navigate = (nextPath: string) => {
    setPath(nextPath);
    loadContents(nextPath);
  };
  const segments = path ? path.split('/').filter(Boolean) : [];

  return (
    <section className={`bg-[#0b0f19] border border-[#1a2234] rounded-xl shadow-lg overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-[#1a2234] flex flex-wrap items-center gap-1 text-xs font-mono text-slate-400">
        <button onClick={() => navigate('')} className="hover:text-cyan-300 flex items-center gap-1" aria-label="Repository root"><Home size={14} /> {repo}</button>
        {segments.map((segment, index) => {
          const segmentPath = segments.slice(0, index + 1).join('/');
          return <React.Fragment key={segmentPath}><ChevronRight size={13} className="text-slate-600" /><button onClick={() => navigate(segmentPath)} className="hover:text-cyan-300">{segment}</button></React.Fragment>;
        })}
      </div>
      {error && <div className="m-4 p-3 rounded-lg border border-red-900/70 bg-red-950/30 text-red-300 text-xs">{error}</div>}
      {loading ? <div className="p-4 space-y-2">{[1, 2, 3, 4].map(item => <div key={item} className="h-10 animate-pulse rounded-lg bg-[#121826]" />)}</div> : (
        <div className="divide-y divide-[#1a2234]">
          {contents.length === 0 && !error && <p className="p-6 text-center text-xs font-mono text-slate-500">This directory is empty.</p>}
          {contents.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1)).map(item => (
            <button key={item.path} onClick={() => item.type === 'dir' ? navigate(item.path) : onFileSelect ? onFileSelect(item) : window.open(item.html_url, '_blank', 'noopener,noreferrer')} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#121826] transition-colors">
              {item.type === 'dir' ? <Folder size={17} className="text-cyan-400 shrink-0" /> : <File size={17} className="text-slate-400 shrink-0" />}
              <span className="text-xs text-slate-200 truncate">{item.name}</span>
              {item.type !== 'dir' && <span className="ml-auto text-[10px] font-mono text-slate-500">{item.size.toLocaleString()} B</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
