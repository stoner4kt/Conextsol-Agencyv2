import { supabase } from '../supabaseClient';
import { Client, Project } from '../types';

export type GitHubErrorCode = 'AUTHENTICATION_REQUIRED' | 'AUTHORIZATION_FAILED' | 'INVALID_REQUEST' | 'REPOSITORY_NOT_FOUND' | 'FILE_NOT_FOUND' | 'RATE_LIMITED' | 'GITHUB_UNAVAILABLE' | 'INTERNAL_ERROR';

export class GitHubServiceError extends Error {
  code: GitHubErrorCode;
  status?: number;
  constructor(message: string, code: GitHubErrorCode = 'INTERNAL_ERROR', status?: number) {
    super(message); this.name = 'GitHubServiceError'; this.code = code; this.status = status;
  }
}

export interface GitHubRepo { id: number; name: string; full_name: string; owner?: { login: string }; description: string | null; private: boolean; html_url: string; default_branch: string; updated_at: string; pushed_at?: string; language: string | null; archived?: boolean; }
export interface GitHubContent { name: string; path: string; sha: string; size: number; type: 'file' | 'dir' | 'symlink' | 'submodule'; download_url: string | null; html_url: string; encoding?: string; content?: string; }
export interface GitHubTreeItem { path: string; type: 'blob' | 'tree'; sha: string; size?: number; url?: string; }
export interface GitHubBranch { name: string; commit: { sha: string; url: string }; protected: boolean; }
export interface GitHubCommit { sha: string; commit: { message: string; author: { name: string; email?: string; date: string } }; author?: { login?: string; avatar_url?: string }; html_url: string; }
export interface GitHubFile extends GitHubContent { content: string; encoding: 'base64'; }
export interface GitHubSearchResult { total_count: number; incomplete_results?: boolean; items: Array<{ name: string; path: string; sha: string; html_url: string; repository: { id: number; name: string; full_name: string; html_url: string } }>; }
export type GitHubResourceType = 'project_repository' | 'shared_directory' | 'google_ads' | 'visual_assets' | 'prompt_library' | 'internal' | string;
export interface GitHubRepositoryRecord { id: string; github_repository_id: number | null; owner: string; name: string; full_name: string; description: string | null; html_url: string; default_branch: string; private: boolean; repository_type: string; created_at: string; updated_at: string; }
export interface GitHubResourceLink { id: string; repository_id: string; client_id: string | null; project_id: string | null; directory_path: string; branch: string | null; resource_type: GitHubResourceType; label: string | null; created_at: string; updated_at: string; github_repositories?: GitHubRepositoryRecord; clients?: Pick<Client, 'id' | 'company_name'> | null; projects?: Pick<Project, 'id' | 'project_name' | 'github_url'> | null; }

type GitHubAction =
  | { action: 'list-repos'; page?: number; per_page?: number; search?: string }
  | { action: 'get-repo'; repo: string }
  | { action: 'get-contents'; repo: string; path?: string; branch?: string }
  | { action: 'get-tree'; repo: string; branch?: string; recursive?: boolean }
  | { action: 'read-file'; repo: string; path: string; branch?: string }
  | { action: 'list-branches'; repo: string; per_page?: number }
  | { action: 'list-commits'; repo: string; path?: string; branch?: string; per_page?: number }
  | { action: 'search-code'; query: string; repo?: string; path?: string; branch?: string; per_page?: number }
  | { action: 'write-file'; repo: string; path: string; content: string; message: string; sha?: string; branch: string }
  | { action: 'delete-file'; repo: string; path: string; sha: string; message: string; branch: string };

async function gh<T>(payload: GitHubAction): Promise<T> {
  if (!supabase) throw new GitHubServiceError('Supabase is not configured. GitHub integration is unavailable.', 'GITHUB_UNAVAILABLE');
  const { data, error } = await supabase.functions.invoke('github-proxy', { body: payload });
  if (error) throw new GitHubServiceError(error.message || 'GitHub proxy error', 'GITHUB_UNAVAILABLE', 'status' in error ? Number(error.status) : undefined);
  if (data?.error) throw new GitHubServiceError(data.error.message || 'GitHub request failed.', data.error.code || 'INTERNAL_ERROR', data.error.details?.status);
  return data as T;
}

const selectResourceLinks = `*, github_repositories (*), clients (id, company_name), projects (id, project_name, github_url)`;

export const github = {
  listRepositories: (options?: { page?: number; perPage?: number; search?: string }) => gh<GitHubRepo[]>({ action: 'list-repos', page: options?.page, per_page: options?.perPage, search: options?.search }),
  listRepos: () => gh<GitHubRepo[]>({ action: 'list-repos' }),
  getRepository: (repo: string) => gh<GitHubRepo>({ action: 'get-repo', repo }),
  listContents: (repo: string, path = '', branch?: string) => gh<GitHubContent | GitHubContent[]>({ action: 'get-contents', repo, path, branch }),
  getContents: (repo: string, path = '', branch?: string) => gh<GitHubContent | GitHubContent[]>({ action: 'get-contents', repo, path, branch }),
  getTree: (repo: string, branch?: string, recursive = false) => gh<{ sha: string; tree: GitHubTreeItem[] }>({ action: 'get-tree', repo, branch, recursive }),
  readFile: (repo: string, path: string, branch?: string) => gh<GitHubFile>({ action: 'read-file', repo, path, branch }),
  listBranches: (repo: string) => gh<GitHubBranch[]>({ action: 'list-branches', repo }),
  listCommits: (repo: string, options?: { path?: string; branch?: string; perPage?: number }) => gh<GitHubCommit[]>({ action: 'list-commits', repo, path: options?.path, branch: options?.branch, per_page: options?.perPage || 20 }),
  searchCode: (query: string, options?: { repo?: string; path?: string; branch?: string; perPage?: number }) => gh<GitHubSearchResult>({ action: 'search-code', query, repo: options?.repo, path: options?.path, branch: options?.branch, per_page: options?.perPage || 20 }),
  writeFile: (repo: string, path: string, content: string, message: string, branch: string, sha?: string) => gh<{ content: GitHubContent; commit: GitHubCommit }>({ action: 'write-file', repo, path, content, message, branch, sha }),
  deleteFile: (repo: string, path: string, sha: string, message: string, branch: string) => gh<{ commit: GitHubCommit }>({ action: 'delete-file', repo, path, sha, message, branch }),
  async listResourceLinks(filters?: { clientId?: string; projectId?: string }): Promise<GitHubResourceLink[]> {
    if (!supabase) return [];
    let query = supabase.from('github_resource_links').select(selectResourceLinks).order('resource_type', { ascending: true });
    if (filters?.clientId) query = query.eq('client_id', filters.clientId);
    if (filters?.projectId) query = query.eq('project_id', filters.projectId);
    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }
    return (data || []) as GitHubResourceLink[];
  },
};

export function decodeFileContent(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeFileContent(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

export function repositoryFromGitHubUrl(url: string): string | null {
  const match = url.match(/^https?:\/\/github\.com\/([^/\s]+\/[^/\s#?]+)(?:[/?#].*)?$/i);
  return match ? match[1].replace(/\.git$/, '') : null;
}
