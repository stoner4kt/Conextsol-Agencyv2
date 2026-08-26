import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

type GitHubAction =
  | { action: "list-repos"; page?: number; per_page?: number; search?: string }
  | { action: "get-repo"; repo: string }
  | { action: "get-contents"; repo: string; path?: string; branch?: string }
  | { action: "get-tree"; repo: string; branch?: string; recursive?: boolean }
  | { action: "read-file"; repo: string; path: string; branch?: string }
  | { action: "list-branches"; repo: string; per_page?: number }
  | { action: "list-commits"; repo: string; path?: string; branch?: string; per_page?: number }
  | { action: "search-code"; query: string; repo?: string; path?: string; branch?: string; per_page?: number }
  | { action: "write-file"; repo: string; path: string; content: string; message: string; sha?: string; branch: string }
  | { action: "delete-file"; repo: string; path: string; sha: string; message: string; branch: string };

type ErrorCode = "AUTHENTICATION_REQUIRED" | "AUTHORIZATION_FAILED" | "INVALID_REQUEST" | "REPOSITORY_NOT_FOUND" | "FILE_NOT_FOUND" | "RATE_LIMITED" | "GITHUB_UNAVAILABLE" | "INTERNAL_ERROR";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("SITE_ORIGIN") || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const repositoryPattern = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?$/;
const refPattern = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,199}$/;
const shaPattern = /^[a-f0-9]{40}$/i;
const maxFileBytes = 1_000_000;

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const normalizedOrigin = origin.replace(/\/$/, "");
  const isAllowedOrigin = allowedOrigins.includes(normalizedOrigin) || localOriginPattern.test(normalizedOrigin);
  // If no origins are configured yet, echo the browser origin so authenticated deployments do not fail
  // after a successful preflight. Configure ALLOWED_ORIGINS in production to make this restrictive.
  const allowOrigin = isAllowedOrigin ? normalizedOrigin : allowedOrigins.length === 0 && normalizedOrigin ? normalizedOrigin : allowedOrigins[0] || "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, accept, accept-profile, content-profile, prefer",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
}

function appError(req: Request, status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) {
  return json(req, { error: { code, message, details } }, status);
}

function cleanRepo(input: unknown, owner: string) {
  if (typeof input !== "string" || !repositoryPattern.test(input)) return null;
  return input.includes("/") ? input : `${owner}/${input}`;
}
function cleanPath(input = "") {
  const path = input.trim().replace(/^\/+/, "").replace(/\/+/g, "/");
  if (path.includes("..") || /[\x00-\x1f]/.test(path) || path.length > 500) return null;
  return path;
}
function cleanBranch(input?: unknown) {
  if (input == null || input === "") return undefined;
  return typeof input === "string" && refPattern.test(input) && !input.includes("..") ? input : null;
}
function page(n: unknown, fallback: number, max: number) {
  return Math.min(Math.max(Number.isFinite(Number(n)) ? Number(n) : fallback, 1), max);
}
function repoApiPath(fullRepo: string, suffix = "") {
  const [owner, name] = fullRepo.split("/");
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${suffix}`;
}
function githubErrorCode(status: number, payload: { message?: string }): ErrorCode {
  if (status === 401) return "AUTHORIZATION_FAILED";
  if (status === 403 && /rate limit/i.test(payload.message || "")) return "RATE_LIMITED";
  if (status === 403) return "AUTHORIZATION_FAILED";
  if (status === 404) return /file|contents/i.test(payload.message || "") ? "FILE_NOT_FOUND" : "REPOSITORY_NOT_FOUND";
  if (status === 422 || status === 400) return "INVALID_REQUEST";
  if (status >= 500 || status === 429) return "GITHUB_UNAVAILABLE";
  return "INTERNAL_ERROR";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return appError(req, 405, "INVALID_REQUEST", "Method not allowed.");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const token = Deno.env.get("GITHUB_PAT") || Deno.env.get("GITHUB_TOKEN") || "";
  const defaultOwner = Deno.env.get("GITHUB_OWNER") || "";
  if (!supabaseUrl || !anonKey) return appError(req, 500, "INTERNAL_ERROR", "Supabase authentication is not configured for the GitHub proxy.");
  if (!token || !defaultOwner) return appError(req, 503, "GITHUB_UNAVAILABLE", "GitHub integration is not configured.");

  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return appError(req, 401, "AUTHENTICATION_REQUIRED", "Sign in before accessing GitHub resources.");

  let payload: GitHubAction;
  try { payload = await req.json(); } catch { return appError(req, 400, "INVALID_REQUEST", "Request body must be valid JSON."); }

  let apiPath = "";
  let method = "GET";
  let body: Record<string, unknown> | undefined;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "conextsol-agency-admin" };

  const repo = "repo" in payload ? cleanRepo(payload.repo, defaultOwner) : null;
  const branch = "branch" in payload ? cleanBranch(payload.branch) : undefined;
  if (branch === null) return appError(req, 400, "INVALID_REQUEST", "Invalid branch or ref name.");
  const path = "path" in payload ? cleanPath(payload.path || "") : "";
  if (path === null) return appError(req, 400, "INVALID_REQUEST", "Invalid file or directory path.");

  switch (payload.action) {
    case "list-repos": {
      const query = new URLSearchParams({ per_page: String(page(payload.per_page, 100, 100)), page: String(page(payload.page, 1, 100)), sort: "updated" });
      apiPath = `/user/repos?${query}`;
      break;
    }
    case "get-repo":
      if (!repo) return appError(req, 400, "INVALID_REQUEST", "A repository name is required.");
      apiPath = repoApiPath(repo);
      break;
    case "get-contents":
    case "read-file": {
      if (!repo) return appError(req, 400, "INVALID_REQUEST", "A repository name is required.");
      const query = branch ? `?ref=${encodeURIComponent(branch)}` : "";
      apiPath = repoApiPath(repo, `/contents${path ? `/${path.split("/").map(encodeURIComponent).join("/")}` : ""}${query}`);
      break;
    }
    case "get-tree":
      if (!repo) return appError(req, 400, "INVALID_REQUEST", "A repository name is required.");
      apiPath = repoApiPath(repo, `/git/trees/${encodeURIComponent(branch || "HEAD")}?recursive=${payload.recursive ? "1" : "0"}`);
      break;
    case "list-branches":
      if (!repo) return appError(req, 400, "INVALID_REQUEST", "A repository name is required.");
      apiPath = repoApiPath(repo, `/branches?per_page=${page(payload.per_page, 100, 100)}`);
      break;
    case "list-commits": {
      if (!repo) return appError(req, 400, "INVALID_REQUEST", "A repository name is required.");
      const query = new URLSearchParams({ per_page: String(page(payload.per_page, 20, 100)) });
      if (path) query.set("path", path);
      if (branch) query.set("sha", branch);
      apiPath = repoApiPath(repo, `/commits?${query}`);
      break;
    }
    case "search-code": {
      if (typeof payload.query !== "string" || payload.query.trim().length < 2 || payload.query.length > 120) return appError(req, 400, "INVALID_REQUEST", "Search query must be between 2 and 120 characters.");
      const scopedRepo = payload.repo ? cleanRepo(payload.repo, defaultOwner) : `${defaultOwner}/${Deno.env.get("GITHUB_SEARCH_DEFAULT_REPO") || ""}`.replace(/\/$/, "");
      if (payload.repo && !scopedRepo) return appError(req, 400, "INVALID_REQUEST", "Invalid repository name.");
      const parts = [payload.query.trim()];
      if (scopedRepo.includes("/")) parts.push(`repo:${scopedRepo}`);
      if (path) parts.push(`path:${path}`);
      apiPath = `/search/code?q=${encodeURIComponent(parts.join(" "))}&per_page=${page(payload.per_page, 20, 50)}`;
      break;
    }
    case "write-file":
    case "delete-file": {
      if (!repo || !path || !branch) return appError(req, 400, "INVALID_REQUEST", "Repository, path, and branch are required for writes.");
      if (!payload.message || payload.message.length > 200) return appError(req, 400, "INVALID_REQUEST", "A concise commit message is required.");
      if (payload.action === "write-file") {
        if (!payload.content || payload.content.length > maxFileBytes * 1.4) return appError(req, 400, "INVALID_REQUEST", "File content is missing or too large.");
        method = "PUT"; body = { message: payload.message, content: payload.content, branch, ...(payload.sha ? { sha: payload.sha } : {}) };
      } else {
        if (!shaPattern.test(payload.sha)) return appError(req, 400, "INVALID_REQUEST", "A valid current file SHA is required.");
        method = "DELETE"; body = { message: payload.message, sha: payload.sha, branch };
      }
      headers["Content-Type"] = "application/json";
      apiPath = repoApiPath(repo, `/contents/${path.split("/").map(encodeURIComponent).join("/")}`);
      break;
    }
    default:
      return appError(req, 400, "INVALID_REQUEST", "Unsupported GitHub action.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const gh = await fetch(`https://api.github.com${apiPath}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
    const text = await gh.text();
    const data = text ? JSON.parse(text) : null;
    if (!gh.ok) return appError(req, gh.status, githubErrorCode(gh.status, data || {}), data?.message || "GitHub API request failed.", { status: gh.status });
    if (payload.action === "read-file" && Array.isArray(data)) return appError(req, 400, "INVALID_REQUEST", "The requested path is a directory, not a file.");
    return json(req, data, gh.status === 204 ? 200 : gh.status);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "GitHub request timed out." : "Unable to reach GitHub.";
    return appError(req, 502, "GITHUB_UNAVAILABLE", message);
  } finally {
    clearTimeout(timeout);
  }
});
