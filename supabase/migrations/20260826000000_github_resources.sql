-- Additive GitHub metadata/resource model for Conextsol Agency V1.
-- GitHub remains the source of truth; no credentials, source code, file contents, trees, or history are stored here.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.github_repositories (
  id uuid primary key default gen_random_uuid(),
  github_repository_id bigint unique,
  owner text not null,
  name text not null,
  full_name text generated always as (owner || '/' || name) stored,
  description text,
  html_url text not null,
  default_branch text not null default 'main',
  private boolean not null default true,
  repository_type text not null default 'managed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint github_repositories_owner_name_unique unique (owner, name),
  constraint github_repositories_owner_check check (owner ~ '^[A-Za-z0-9_.-]+$'),
  constraint github_repositories_name_check check (name ~ '^[A-Za-z0-9_.-]+$'),
  constraint github_repositories_html_url_check check (html_url ~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$')
);

create table if not exists public.github_resource_links (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  directory_path text not null default '',
  branch text,
  resource_type text not null default 'project_repository',
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint github_resource_links_scope_check check (client_id is not null or project_id is not null or resource_type in ('internal','prompt_library','visual_assets')),
  constraint github_resource_links_directory_check check (directory_path = '' or (directory_path !~ '(^/|//|\.\.|[[:cntrl:]])' and length(directory_path) <= 500)),
  constraint github_resource_links_branch_check check (branch is null or (branch !~ '(\.\.|[[:cntrl:]])' and length(branch) <= 200))
);

create index if not exists github_resource_links_repository_id_idx on public.github_resource_links(repository_id);
create index if not exists github_resource_links_client_id_idx on public.github_resource_links(client_id);
create index if not exists github_resource_links_project_id_idx on public.github_resource_links(project_id);
create index if not exists github_resource_links_resource_type_idx on public.github_resource_links(resource_type);

alter table public.github_repositories enable row level security;
alter table public.github_resource_links enable row level security;

drop policy if exists "Authenticated admins can read github repositories" on public.github_repositories;
create policy "Authenticated admins can read github repositories" on public.github_repositories for select to authenticated using (auth.role() = 'authenticated');

drop policy if exists "Authenticated admins can manage github repositories" on public.github_repositories;
create policy "Authenticated admins can manage github repositories" on public.github_repositories for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated admins can read github resource links" on public.github_resource_links;
create policy "Authenticated admins can read github resource links" on public.github_resource_links for select to authenticated using (auth.role() = 'authenticated');

drop policy if exists "Authenticated admins can manage github resource links" on public.github_resource_links;
create policy "Authenticated admins can manage github resource links" on public.github_resource_links for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
