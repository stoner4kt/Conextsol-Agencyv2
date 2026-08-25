import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GitHubAction =
  | { action: "list-repos" }
  | { action: "get-contents"; repo: string; path?: string }
  | { action: "get-tree"; repo: string; branch?: string }
  | { action: "read-file"; repo: string; path: string }
  | { action: "write-file"; repo: string; path: string; content: string; message?: string; sha?: string }
  | { action: "delete-file"; repo: string; path: string; sha: string; message?: string }
  | { action: "search-code"; query: string; repo?: string }
  | { action: "list-commits"; repo: string; path?: string; per_page?: number };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRepository(value: unknown): value is string {
  return typeof value === "string" && /^[^/\s]+\/[^/\s]+$/.test(value);
}

function githubPath(repo: string, path = "") {
  return `/repos/${repo}${path ? `/${path.split("/").map(encodeURIComponent).join("/")}` : ""}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    console.error("GITHUB_TOKEN is not configured");
    return response({ error: "GitHub integration is not configured." }, 503);
  }

  let payload: GitHubAction;
  try {
    payload = await req.json();
  } catch {
    return response({ error: "Request body must be valid JSON." }, 400);
  }

  let path: string;
  let method = "GET";
  let body: Record<string, string> | undefined;

  switch (payload.action) {
    case "list-repos":
      path = "/user/repos?per_page=100&sort=updated";
      break;
    case "get-contents":
    case "read-file":
      if (!isRepository(payload.repo)) return response({ error: "A repository must use the owner/name format." }, 400);
      path = `${githubPath(payload.repo, "contents")}${payload.path ? `/${payload.path.split("/").map(encodeURIComponent).join("/")}` : ""}`;
      break;
    case "get-tree":
      if (!isRepository(payload.repo)) return response({ error: "A repository must use the owner/name format." }, 400);
      path = `${githubPath(payload.repo, "git/trees")}/${encodeURIComponent(payload.branch || "HEAD")}?recursive=1`;
      break;
    case "write-file":
      if (!isRepository(payload.repo) || !payload.path || !payload.content) return response({ error: "Repository, path, and content are required." }, 400);
      path = githubPath(payload.repo, `contents/${payload.path}`);
      method = "PUT";
      body = { content: payload.content, message: payload.message || `Update ${payload.path}` };
      if (payload.sha) body.sha = payload.sha;
      break;
    case "delete-file":
      if (!isRepository(payload.repo) || !payload.path || !payload.sha) return response({ error: "Repository, path, and sha are required." }, 400);
      path = githubPath(payload.repo, `contents/${payload.path}`);
      method = "DELETE";
      body = { sha: payload.sha, message: payload.message || `Delete ${payload.path}` };
      break;
    case "search-code": {
      if (!payload.query) return response({ error: "A search query is required." }, 400);
      if (payload.repo && !isRepository(payload.repo)) return response({ error: "A repository must use the owner/name format." }, 400);
      const query = payload.repo ? `${payload.query} repo:${payload.repo}` : payload.query;
      path = `/search/code?q=${encodeURIComponent(query)}`;
      break;
    }
    case "list-commits": {
      if (!isRepository(payload.repo)) return response({ error: "A repository must use the owner/name format." }, 400);
      const query = new URLSearchParams({ per_page: String(Math.min(Math.max(payload.per_page || 20, 1), 100)) });
      if (payload.path) query.set("path", payload.path);
      path = `${githubPath(payload.repo, "commits")}?${query}`;
      break;
    }
    default:
      return response({ error: "Unsupported GitHub action." }, 400);
  }

  try {
    const githubResponse = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await githubResponse.json();
    if (!githubResponse.ok) {
      console.error(`GitHub API request failed (${githubResponse.status})`, data?.message);
      return response({ error: data?.message || "GitHub API request failed." }, githubResponse.status);
    }
    if (payload.action === "read-file" && Array.isArray(data)) return response({ error: "The requested path is a directory, not a file." }, 400);
    return response(data);
  } catch (error) {
    console.error("GitHub proxy error", error);
    return response({ error: "Unable to reach GitHub." }, 502);
  }
});
