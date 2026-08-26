# Conextsol Agency V2

Conextsol Agency V2 is a React, TypeScript, Vite, Supabase, and Cloudflare-hosted admin workspace for managing clients, fixed-fee projects, retainers, documents, AI tool accounts, operational alerts, and GitHub-backed delivery assets.

## Architecture

- **Frontend:** React + TypeScript + Vite static app.
- **Hosting:** Cloudflare static assets configured by `wrangler.jsonc`.
- **Backend:** Supabase Postgres, Auth, RLS, and Edge Functions.
- **Database:** PostgreSQL public schema with existing `clients`, `projects`, `retainers`, `documents_and_notes`, and `ai_tool_accounts` tables.
- **GitHub API boundary:** Browser calls `src/lib/github.ts`; that service invokes the `github-proxy` Supabase Edge Function; only the Edge Function calls the GitHub REST API.

## Local development

```bash
npm install
npm run dev
npm run lint
npm run build
```

Create a local `.env` from `.env.example`. Only public Supabase browser variables belong in the Vite environment.

## Environment variables

### Public frontend variables

These are safe for Cloudflare/Vite because they are intended to be public Supabase client configuration:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Private Supabase Edge Function secrets

Set these only in Supabase Edge Function secrets, never as `VITE_*`, Cloudflare frontend variables, localStorage, database rows, or committed files:

- `GITHUB_PAT` — GitHub personal access token used by `github-proxy`.
- `GITHUB_OWNER` — default GitHub owner/org used when the frontend sends a repository name without an owner.
- `ALLOWED_ORIGINS` — comma-separated browser origins allowed by the GitHub proxy CORS response, for example production Cloudflare origin plus local development.
- `SITE_ORIGIN` — optional single-origin fallback when `ALLOWED_ORIGINS` is not provided.
- Existing operational secrets used by other Edge Functions include `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`.

## Supabase setup and migrations

Apply migrations additively; do not reset production data.

```bash
supabase db push
supabase functions deploy github-proxy
supabase secrets set GITHUB_PAT=... GITHUB_OWNER=stoner4kt ALLOWED_ORIGINS=https://<production-origin>,http://localhost:3000
```

The GitHub V1 migration creates:

- `github_repositories` for repository metadata only.
- `github_resource_links` for client/project/directory/resource associations.

RLS remains enabled. Policies are scoped to authenticated Supabase users because this admin application uses authenticated admin access.

## GitHub integration

The frontend must never construct arbitrary GitHub URLs or include credentials. Structured actions are sent to `github-proxy`, including:

- `list-repos`
- `get-repo`
- `get-contents`
- `get-tree`
- `read-file`
- `list-branches`
- `list-commits`
- `search-code`
- guarded `write-file` and `delete-file`

The Edge Function validates Supabase authentication, repository names, paths, branches, SHAs, query length, file size, methods, and action names before it calls GitHub. GitHub error responses are normalized into application-level codes such as authentication required, authorization failed, repository not found, file not found, rate limited, and unavailable.

## GitHub PAT permissions

For V1 read-only dashboard use, prefer the minimum read-only permissions that can list and read the target private repositories:

- Fine-grained PAT: selected repositories only, **Contents: read**, **Metadata: read**.
- Add **Contents: write** only if the guarded write/delete actions are intentionally enabled for administrators.

Do not use a broad classic token unless operationally unavoidable.

## Repository organization model

The system supports both Conextsol patterns:

1. **Dedicated repository:** project links to a full repository, with directory `/`.
2. **Shared repository directory:** repository links to a client/project directory such as `client-a/strategy` or `client-a/campaigns`.

`projects.github_url` remains as a backward-compatible display/legacy field. New metadata should be represented with `github_repositories` and `github_resource_links` so one project can have multiple GitHub resources and one shared repository can map to many clients/projects.

## Cloudflare deployment

The repository uses Wrangler static asset configuration with SPA fallback. Build output is `dist`; no Node server code is introduced into the frontend deployment path.

```bash
npm run build
```

## Security notes

- Never expose `GITHUB_PAT` or `GITHUB_OWNER` through browser variables.
- Do not cache private GitHub file contents in Supabase or localStorage.
- Edge Function CORS should list production and development origins explicitly.
- GitHub source code, trees, full file contents, and history remain in GitHub.
- Supabase stores metadata and associations only.

## Troubleshooting

- `OPTIONS /github-proxy` returning `204` and `POST` returning `404` usually means the function is reachable but the GitHub action contract or repository identifier is wrong. V1 accepts `owner/name` or a bare repository name that is resolved with `GITHUB_OWNER`.
- `AUTHENTICATION_REQUIRED` means the browser does not have a valid Supabase session.
- `GITHUB_UNAVAILABLE` can mean missing Supabase secrets, GitHub downtime, network failure, or timeout.
- `RATE_LIMITED` means GitHub rejected the request because of search/API rate limiting.

## Future GitHub App architecture

Keep the frontend contract stable. Replace the current PAT provider inside the Edge Function with a provider that mints GitHub App installation tokens. The frontend should continue sending structured resource-scoped actions.

## Future AI agent architecture

Future agent tools should operate only within explicit scopes:

- client
- project
- repository
- directory
- branch
- permitted action set

Potential tools include `github.listRepositories`, `github.listFiles`, `github.readFile`, `github.searchFiles`, `github.listBranches`, `github.listCommits`, `github.createBranch`, `github.updateFile`, and `github.createPullRequest`. Autonomous writes and pull requests are intentionally not implemented in V1.
