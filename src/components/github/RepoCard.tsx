import React from 'react';
import { ExternalLink, GitBranch } from 'lucide-react';
import { GitHubRepo } from '../../lib/github';

interface RepoCardProps { key?: React.Key; repo: GitHubRepo; selected?: boolean; onSelect?: (repo: GitHubRepo) => void; className?: string; }

function relativeTime(date: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  const units = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']] as const;
  const match = units.find(([value]) => seconds >= value);
  if (!match) return 'just now';
  const count = Math.floor(seconds / match[0]);
  return `${count} ${match[1]}${count === 1 ? '' : 's'} ago`;
}

export default function RepoCard({ repo, selected = false, onSelect, className = '' }: RepoCardProps) {
  return <article className={`bg-[#0b0f19] border ${selected ? 'border-cyan-500/70' : 'border-[#1a2234]'} rounded-xl p-4 shadow-lg hover:border-cyan-500/40 transition-colors ${className}`}>
    <div className="flex gap-3"><button onClick={() => onSelect?.(repo)} className="min-w-0 flex-1 text-left disabled:cursor-default" disabled={!onSelect}><h3 className="text-sm font-semibold text-white truncate">{repo.name}</h3><p className="mt-2 h-10 text-xs leading-5 text-slate-400 line-clamp-2">{repo.description || 'No repository description provided.'}</p></button><a href={repo.html_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-300 h-fit p-1" aria-label={`Open ${repo.name} on GitHub`}><ExternalLink size={17} /></a></div>
    <footer className="mt-4 pt-3 border-t border-[#1a2234] flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500"><span className="flex items-center gap-1 truncate"><GitBranch size={12} /> {repo.default_branch}</span><span>{repo.private ? 'Private' : 'Public'} · {relativeTime(repo.updated_at)}</span></footer>
  </article>;
}
