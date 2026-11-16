
-- Phase B: enforce the new role and ownership model after the updated frontend
-- is deployed. This removes all previous, potentially over-broad policies.
do $$
declare t text; p record;
begin
  foreach t in array array[
    'clients','projects','invoices','retainers','documents_and_notes',
    'ai_tool_accounts','recurring_expenses','expense_entries',
    'github_repositories','github_resource_links','review_requests'
  ] loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'clients','projects','invoices','retainers','documents_and_notes',
    'ai_tool_accounts','recurring_expenses','expense_entries',
    'github_repositories','github_resource_links','review_requests'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (private.is_admin_user()) with check (private.is_admin_user())',
      'agency_admin_full_access', t
    );
  end loop;
end $$;

create policy "client reads assigned profile" on public.clients
for select to authenticated using (private.client_has_access(id));

create policy "client reads assigned projects" on public.projects
for select to authenticated using (private.client_has_access(client_id));

create policy "client reads assigned invoices" on public.invoices
for select to authenticated using (private.client_has_access(client_id));

create policy "client reads assigned review requests" on public.review_requests
for select to authenticated using (private.client_has_access(client_id));

-- Replace email-parameter authorization with caller-identity checks.
create or replace function public.verify_project_ownership(p_project_id uuid, p_user_email text)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (
        private.is_admin_user()
        or private.client_has_access(p.client_id)
      )
  );
$$;
revoke all on function public.verify_project_ownership(uuid, text) from public, anon;
grant execute on function public.verify_project_ownership(uuid, text) to authenticated;

alter function public.update_modified_column() set search_path = pg_catalog, public;

-- The 15 existing table triggers continue to invoke this function. It obtains
-- the shared webhook secret from Vault and forwards it to the Edge Function.
create or replace function public.sync_to_notion_webhook()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, net, vault
as $function$
declare
  payload jsonb;
  sync_secret text;
begin
  select decrypted_secret into sync_secret
  from vault.decrypted_secrets
  where name = 'notion_sync_webhook_secret'
  limit 1;

  if sync_secret is null or length(sync_secret) < 32 then
    raise exception 'Notion sync webhook secret is missing or too short';
  end if;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end,
    'old_record', case when TG_OP = 'DELETE' then to_jsonb(OLD) else null end
  );

  perform net.http_post(
    url := 'https://lutlyvmcddmennmppbgw.functions.supabase.co/sync-to-notion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notion-sync-secret', sync_secret
    ),
    body := payload
  );

  return coalesce(NEW, OLD);
end;
$function$;

revoke all on function public.sync_to_notion_webhook() from public, anon, authenticated;
grant execute on function public.sync_to_notion_webhook() to service_role;

-- Remove inherited table-wide rights, then grant the minimum required for
-- admin CRUD and the client-safe base-table predicates.
revoke all on table public.clients, public.projects, public.invoices from public, anon, authenticated;

grant select (id) on public.clients to authenticated;
grant insert, update, delete on public.clients to authenticated;

grant select (id, client_id) on public.projects to authenticated;
grant insert, update, delete on public.projects to authenticated;

grant select (id, invoice_number, client_id) on public.invoices to authenticated;
grant insert, update, delete on public.invoices to authenticated;

revoke all on table public.clients, public.projects, public.invoices, public.retainers,
  public.documents_and_notes, public.ai_tool_accounts, public.recurring_expenses,
  public.expense_entries, public.github_repositories, public.github_resource_links,
  public.review_requests from anon;
