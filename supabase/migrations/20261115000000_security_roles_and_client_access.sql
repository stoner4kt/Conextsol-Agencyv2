-- Security hardening: database-backed roles and client ownership.
-- Phase A: additive role and client-access foundation. Applied to production on 2026-11-16.

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
create index if not exists client_user_access_client_user_idx on private.client_user_access (client_id, user_id);
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

create or replace function private.is_admin_user()
returns boolean language sql stable security definer
set search_path = pg_catalog, private
as $$ select exists (select 1 from private.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'); $$;
revoke all on function private.is_admin_user() from public, anon;
grant execute on function private.is_admin_user() to authenticated, service_role;

create or replace function private.is_client_user()
returns boolean language sql stable security definer
set search_path = pg_catalog, private
as $$ select exists (select 1 from private.user_roles r where r.user_id = (select auth.uid()) and r.role = 'client')
and exists (select 1 from private.client_user_access a where a.user_id = (select auth.uid())); $$;
revoke all on function private.is_client_user() from public, anon;
grant execute on function private.is_client_user() to authenticated, service_role;

create or replace function private.client_has_access(p_client_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, private
as $$ select exists (select 1 from private.client_user_access a where a.client_id = p_client_id and a.user_id = (select auth.uid())); $$;
revoke all on function private.client_has_access(uuid) from public, anon;
grant execute on function private.client_has_access(uuid) to authenticated, service_role;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.is_admin_user(); $$;
revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;

create or replace function public.is_current_user_client()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$ select private.is_client_user(); $$;
revoke all on function public.is_current_user_client() from public, anon;
grant execute on function public.is_current_user_client() to authenticated;

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


-- Read models used by the new application. These views are intentionally
-- owner-executed with security_barrier and explicit auth.uid()-bound filters.
create or replace view public.admin_clients with (security_barrier = true, security_invoker = true) as
select c.id, c.company_name, c.primary_contact_name, c.email, c.phone, c.status,
       c.created_at, c.updated_at, c.subdomain, c.google_place_id, c.google_review_url,
       c.review_automation_enabled, c.review_from_name, c.review_reply_to_email, c.review_from_email
from public.clients c
where private.is_admin_user();

create or replace view public.client_portal_profiles with (security_barrier = true, security_invoker = true) as
select c.id, c.company_name, c.primary_contact_name, c.email, c.phone, c.status
from public.clients c
where private.client_has_access(c.id);

create or replace view public.admin_projects with (security_barrier = true, security_invoker = true) as
select p.*
from public.projects p
where private.is_admin_user();

create or replace view public.client_portal_projects with (security_barrier = true, security_invoker = true) as
select p.id, p.client_id, p.project_name, p.start_date, p.end_date,
       p.production_url, p.services_listed, p.completion_status
from public.projects p
where private.client_has_access(p.client_id);

create or replace view public.admin_invoices with (security_barrier = true, security_invoker = true) as
select i.*
from public.invoices i
where private.is_admin_user();

create or replace view public.client_portal_invoices with (security_barrier = true, security_invoker = true) as
select i.id, i.invoice_number, i.client_id, i.line_items, i.subtotal, i.tax_rate,
       i.tax_amount, i.total, i.status, i.due_date, i.issued_date,
       i.paid_at, i.payment_notes, i.created_at, i.updated_at
from public.invoices i
where private.client_has_access(i.client_id)
  and i.status <> 'draft';

revoke all on public.admin_clients, public.client_portal_profiles,
  public.admin_projects, public.client_portal_projects,
  public.admin_invoices, public.client_portal_invoices from public, anon;
grant select on public.admin_clients, public.client_portal_profiles,
  public.admin_projects, public.client_portal_projects,
  public.admin_invoices, public.client_portal_invoices to authenticated;
