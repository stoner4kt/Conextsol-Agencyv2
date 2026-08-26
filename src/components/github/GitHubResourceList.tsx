import React, { useEffect, useState } from 'react';
import { ExternalLink, FolderGit2 } from 'lucide-react';
import { github, GitHubResourceLink, repositoryFromGitHubUrl } from '../../lib/github';

interface Props { clientId?: string; projectId?: string; githubUrl?: string; title?: string; }

export default function GitHubResourceList({ clientId, projectId, githubUrl, title = 'GitHub Resources' }: Props) {
  const [links, setLinks] = useState<GitHubResourceLink[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let active = true; setLoading(true); github.listResourceLinks({ clientId, projectId }).then(data => active && setLinks(data)).catch(err => active && setError(err instanceof Error ? err.message : 'Unable to load GitHub resources.')).finally(() => active && setLoading(false)); return () => { active = false; }; }, [clientId, projectId]);
  const legacyRepo = githubUrl ? repositoryFromGitHubUrl(githubUrl) : null;
  return <section className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 shadow-lg space-y-3">
    <div className="flex items-center justify-between border-b border-[#1a2234] pb-3"><h3 className="font-display font-bold text-white text-sm flex items-center gap-2"><FolderGit2 size={16} className="text-cyan-400" />{title}</h3><span className="text-[10px] font-mono text-slate-500">{links.length + (legacyRepo ? 1 : 0)} linked</span></div>
    {loading && <p className="text-xs font-mono text-slate-500">Loading GitHub resource metadata…</p>}
    {error && <p className="text-xs text-amber-300">{error}</p>}
    {!loading && links.length === 0 && !legacyRepo && <p className="text-xs font-mono text-slate-500">No normalized GitHub resources are linked yet.</p>}
    {legacyRepo && <a href={githubUrl} target="_blank" rel="noreferrer" className="block p-3 rounded-lg bg-[#070a12] border border-[#1a2234] hover:border-cyan-500/40"><p className="text-xs text-white font-mono">Legacy project repository</p><p className="text-[11px] text-slate-400 flex items-center gap-1"><ExternalLink size={12} /> {legacyRepo}</p></a>}
    {links.map(link => { const repo = link.github_repositories; const href = repo ? `${repo.html_url}${link.directory_path ? `/tree/${encodeURIComponent(link.branch || repo.default_branch)}/${link.directory_path}` : ''}` : '#'; return <a key={link.id} href={href} target="_blank" rel="noreferrer" className="block p-3 rounded-lg bg-[#070a12] border border-[#1a2234] hover:border-cyan-500/40"><p className="text-xs text-white font-mono">{link.label || link.resource_type.replace(/_/g, ' ')}</p><p className="text-[11px] text-slate-400">{repo?.full_name || 'Repository metadata missing'} /{link.directory_path || ''}</p><p className="text-[10px] text-slate-500 mt-1">{link.clients?.company_name || 'Internal'}{link.projects?.project_name ? ` · ${link.projects.project_name}` : ''}{link.branch ? ` · ${link.branch}` : ''}</p></a>; })}
  </section>;
}
