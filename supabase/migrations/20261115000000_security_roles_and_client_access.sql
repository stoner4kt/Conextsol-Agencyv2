-- Security hardening: database-backed roles and client ownership.
-- This migration is committed to a review branch only. It is not applied to Supabase production.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table if not exists private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','client')),
  created_at timestamptz not null default now()
);
alter table private.user_roles enable row level security;
revoke all on private.user_roles from public, anon, authenticated;
grant select, insert, update, delete on private.user_roles to service_role;

create table if not exists private.client_user_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);
alter table private.client_user_access enable row level security;
revoke all on private.client_user_access from public, anon, authenticated;
grant select, insert, update, delete on private.client_user_access to service_role;

-- Bootstrap only existing, verified agency accounts already covered by the current admin allowlist.
insert into private.user_roles (user_id, role)
select u.id, 'admin'
from auth.users u
where u.email_confirmed_at is not null
  and (
    lower(u.email) like '%@conextsol.com'
    or lower(u.email) in ('reeqieric41@gmail.com','juliangreen237@gmail.com')
  )
on conflict (user_id) do update set role = excluded.role;

create or replace function private.is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select exists (
    select 1 from private.user_roles r
    where r.user_id = p_user_id and r.role = 'admin'
  );
$$;
revoke all on function private.is_admin_user(uuid) from public, anon;
grant execute on function private.is_admin_user(uuid) to authenticated, service_role;

create or replace function private.is_client_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select exists (
    select 1 from private.user_roles r
    where r.user_id = p_user_id and r.role = 'client'
  ) and exists (
    select 1 from private.client_user_access a where a.user_id = p_user_id
  );
$$;
revoke all on function private.is_client_user(uuid) from public, anon;
grant execute on function private.is_client_user(uuid) to authenticated, service_role;

create or replace function private.client_has_access(p_client_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select exists (
    select 1 from private.client_user_access a
    where a.client_id = p_client_id and a.user_id = p_user_id
  );
$$;
revoke all on function private.client_has_access(uuid, uuid) from public, anon;
grant execute on function private.client_has_access(uuid, uuid) to authenticated, service_role;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.is_admin_user((select auth.uid())); $$;
revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;

create or replace function public.is_current_user_client()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.is_client_user((select auth.uid())); $$;
revoke all on function public.is_current_user_client() from public, anon;
grant execute on function public.is_current_user_client() to authenticated;

-- Remove prior email-based, authenticated-only and over-broad policies on agency data.
do $$
declare t text; p record;
begin
  foreach t in array array[
    'clients','projects','invoices','retainers','documents_and_notes',
    'ai_tool_accounts','recurring_expenses','expense_entries',
    'github_repositories','github_resource_links','review_requests'
  ] loop
    for p in
      select policyname from pg_policies
      where schemaname='public' and tablename=t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- Agency administration: full access only to users with a server-controlled admin role.
do $$
declare t text;
begin
  foreach t in array array[
    'clients','projects','invoices','retainers','documents_and_notes',
    'ai_tool_accounts','recurring_expenses','expense_entries',
    'github_repositories','github_resource_links','review_requests'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (private.is_admin_user((select auth.uid()))) with check (private.is_admin_user((select auth.uid())))',
      'agency_admin_full_access', t
    );
  end loop;
end $$;

-- Client portal: read-only access to the client's own profile, projects and invoices.
create policy "client reads assigned profile" on public.clients
for select to authenticated
using (private.client_has_access(id, (select auth.uid())));

create policy "client reads assigned projects" on public.projects
for select to authenticated
using (private.client_has_access(client_id, (select auth.uid())));

create policy "client reads assigned invoices" on public.invoices
for select to authenticated
using (private.client_has_access(client_id, (select auth.uid())));

-- Review-request logs remain service-role writable; clients can only read their own records.
create policy "service role inserts review requests" on public.review_requests
for insert to service_role with check (true);
create policy "service role updates review requests" on public.review_requests
for update to service_role using (true) with check (true);
create policy "client reads assigned review requests" on public.review_requests
for select to authenticated
using (private.client_has_access(client_id, (select auth.uid())));

-- No direct client mutation of agency records or of the client-to-user mapping.

-- Called only by the invitation Edge Function using the service-role JWT.
create or replace function public.assign_client_user(p_user_id uuid, p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user not found' using errcode = '23503';
  end if;
  if not exists (select 1 from public.clients where id = p_client_id) then
    raise exception 'client not found' using errcode = '23503';
  end if;
  insert into private.user_roles (user_id, role)
  values (p_user_id, 'client')
  on conflict (user_id) do nothing;
  if exists (select 1 from private.user_roles where user_id = p_user_id and role <> 'client') then
    raise exception 'an administrator account cannot be converted to a client account' using errcode = '23514';
  end if;
  insert into private.client_user_access (user_id, client_id)
  values (p_user_id, p_client_id)
  on conflict do nothing;
end;
$$;
revoke all on function public.assign_client_user(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_client_user(uuid, uuid) to service_role;
