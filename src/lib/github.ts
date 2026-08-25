import { supabase } from '../supabaseClient';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
  language: string | null;
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir' | 'symlink';
  download_url: string | null;
  html_url: string;
}

export interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface GitHubCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  html_url: string;
}

export interface GitHubFile extends GitHubContent {
  content: string;
  encoding: 'base64';
}

type GitHubAction =
  | { action: 'list-repos' }
  | { action: 'get-contents'; repo: string; path?: string }
  | { action: 'get-tree'; repo: string; branch?: string }
  | { action: 'read-file'; repo: string; path: string }
  | { action: 'write-file'; repo: string; path: string; content: string; message?: string; sha?: string }
  | { action: 'delete-file'; repo: string; path: string; sha: string; message?: string }
  | { action: 'search-code'; query: string; repo?: string }
  | { action: 'list-commits'; repo: string; path?: string; per_page?: number };

async function gh<T>(payload: GitHubAction): Promise<T> {
  if (!supabase) {
    throw new Error('Supabase is not configured. GitHub integration is unavailable.');
  }

  const { data, error } = await supabase.functions.invoke('github-proxy', { body: payload });
  if (error) throw new Error(error.message ?? 'GitHub proxy error');
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const github = {
  listRepos: () => gh<GitHubRepo[]>({ action: 'list-repos' }),
  getContents: (repo: string, path = '') =>
    gh<GitHubContent | GitHubContent[]>({ action: 'get-contents', repo, path }),
  getTree: (repo: string, branch?: string) =>
    gh<{ sha: string; tree: GitHubTreeItem[] }>({ action: 'get-tree', repo, branch }),
  readFile: (repo: string, path: string) => gh<GitHubFile>({ action: 'read-file', repo, path }),
  writeFile: (repo: string, path: string, content: string, message?: string, sha?: string) =>
    gh<{ content: GitHubContent; commit: GitHubCommit }>({ action: 'write-file', repo, path, content, message, sha }),
  deleteFile: (repo: string, path: string, sha: string, message?: string) =>
    gh<{ commit: GitHubCommit }>({ action: 'delete-file', repo, path, sha, message }),
  searchCode: (query: string, repo?: string) =>
    gh<{ total_count: number; items: Array<{ path: string; repository: { name: string }; html_url: string }> }>({ action: 'search-code', query, repo }),
  listCommits: (repo: string, path?: string, per_page = 20) =>
    gh<GitHubCommit[]>({ action: 'list-commits', repo, path, per_page }),
};

export function decodeFileContent(base64: string): string {
  return decodeURIComponent(escape(atob(base64.replace(/\n/g, ''))));
}

export function encodeFileContent(content: string): string {
  return btoa(unescape(encodeURIComponent(content)));
}
