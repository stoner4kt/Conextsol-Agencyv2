import React, { useEffect, useState } from 'react';
import { Clipboard, ExternalLink, X } from 'lucide-react';
import { decodeFileContent, github, GitHubFile } from '../../lib/github';

interface FileViewerProps { repo: string; path: string; sha: string; onClose: () => void; }

export default function FileViewer({ repo, path, sha, onClose }: FileViewerProps) {
  const [file, setFile] = useState<GitHubFile | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { let active = true; setFile(null); setError(''); github.readFile(repo, path).then(result => active && setFile(result)).catch((err: any) => active && setError(err.message || 'Unable to read file.')); return () => { active = false; }; }, [repo, path, sha]);
  const content = file ? decodeFileContent(file.content) : '';
  const copy = async () => { await navigator.clipboard.writeText(content); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  return <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Viewing ${path}`}>
    <div className="w-full max-w-5xl max-h-[90vh] bg-[#0b0f19] border border-[#1d263b] rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <header className="p-4 border-b border-[#1a2234] flex items-center gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-mono text-cyan-400">{repo}</p><h2 className="text-sm text-white truncate">{path}</h2></div>{file && <a href={file.html_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-cyan-300" aria-label="Open in GitHub"><ExternalLink size={17} /></a>}<button onClick={copy} disabled={!file} className="p-2 text-slate-400 hover:text-cyan-300 disabled:opacity-40" aria-label="Copy file content"><Clipboard size={17} /></button><button onClick={onClose} className="p-2 text-slate-400 hover:text-white" aria-label="Close file viewer"><X size={18} /></button></header>
      {copied && <p className="px-4 pt-3 text-xs text-emerald-400">Copied to clipboard.</p>}{error ? <p className="m-4 p-3 text-xs text-red-300 bg-red-950/30 border border-red-900/70 rounded-lg">{error}</p> : !file ? <div className="p-6 space-y-2 animate-pulse"><div className="h-4 bg-[#121826] rounded" /><div className="h-4 bg-[#121826] rounded w-4/5" /></div> : <pre className="flex-1 overflow-auto p-4 text-xs leading-6 font-mono text-slate-200 whitespace-pre bg-[#070a12]">{content}</pre>}
    </div>
  </div>;
}
