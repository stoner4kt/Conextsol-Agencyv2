# Security hardening review branch

This branch contains a proposed security implementation for the Conextsol Agency portal. It does not apply the migration to live Supabase and does not deploy Edge Functions or the Cloudflare app.

## Changes included

- Removed browser/local-storage demo authentication and email/domain-based admin detection. Sign-in now requires Supabase Auth and a database-backed role.
- Added separate /admin/login and /client/login entry points.
- Added a read-only client portal for assigned projects and the client's own invoices/payment status.
- Added an admin-only Invite Client action and client-invitations Edge Function. Invitations use the email on the selected client record.
- Added private role and client-access tables, role bootstrap for existing verified agency admins, and stricter row-level policies.
- Restricted GitHub, invoice, retainer billing and deadline-alert Edge Functions to authorized admins or the internal service-role scheduler.
- Added a dedicated secret requirement for Notion database webhooks; Notion backfills now require an authenticated admin.
- Hardened project ownership verification and trigger function search paths.

## Controlled deployment order

1. Back up Supabase and verify the existing admin accounts. The migration bootstraps users already in auth.users with confirmed email addresses who either use @conextsol.com or match the two explicit legacy admin accounts in the migration. Review this allowlist before applying. New accounts at that domain are not automatically admins.
2. In Supabase Dashboard → Authentication → Settings, disable new user signups and keep email confirmation enabled.
3. Generate a random webhook secret of at least 32 characters. Store it in Supabase Vault under the exact name notion_sync_webhook_secret. Add the same value as the Edge Function secret NOTION_SYNC_WEBHOOK_SECRET.
4. Apply supabase/migrations/20261115000000_security_roles_and_client_access.sql to a Supabase development branch first. Test admin sign-in, invitations and cross-client isolation before applying to production.
5. Deploy client-invitations, github-proxy, invoice-reminders, retainer-billing and deadline-alerts with JWT verification enabled. Ensure SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY plus existing GitHub, Resend and Telegram secrets are configured. Never expose the service-role key in the browser.
6. Deploy sync-to-notion with JWT verification disabled only because the database webhook uses the dedicated x-notion-sync-secret header. Configure the database webhook to send that exact header. The backfill path independently requires a verified admin JWT.
7. Configure Supabase Auth SMTP using verified Resend SMTP credentials. Set the branded sender, Site URL and allowed redirect URLs for https://dash.conextsol.co.za/admin, /client, /admin/login and /client/login. The Resend API key used by Edge Functions does not configure Supabase Auth SMTP automatically.
8. Enable TOTP MFA for administrators as an optional factor. This branch does not force MFA enrollment.
9. Deploy the Cloudflare app only after the migration and Edge Functions are deployed. Configure SPA fallback rewrites for /admin/login, /client/login, /admin and /client.

## Verification required before production

- Admin role RPC returns true only for a private.user_roles row with role admin.
- A client invited for Client A can read only Client A's profile, projects and invoices. Direct REST queries for Client B return no rows.
- Clients cannot insert, update or delete agency data; alter project fields; read retainers, expenses, GitHub resources, internal documents or another client's financial records.
- Clients cannot invoke GitHub, invoice, retainer-billing or deadline-alert privileged actions.
- Unauthenticated Notion backfill is rejected; a webhook without the Vault-backed secret is rejected.
- An admin can invite a new or existing client email. The client can accept the invite, set a password, reset it later and sign in at /client/login.
- Password reset and invitation emails arrive through the configured Resend SMTP sender.
- Optional administrator MFA enrollment and sign-in work.
- Re-run Supabase Security Advisor after the migration.

## Platform-level items not changed by this branch

- Leaked password protection is an Auth setting and must be enabled in the Supabase Dashboard; this SQL migration cannot safely toggle it.
- pg_net is non-relocatable in this project and currently installed in public. This migration does not move it because that could break the existing Notion trigger. Review a supported extension migration path with Supabase first.
- Package versions have not been blindly upgraded. Run npm audit, update dependencies with the lockfile, and run npm run lint plus npm run build before deployment.
- The Notion webhook now requires the Vault secret and matching Edge Function secret. Update the existing database webhook configuration before deploying the new function version or automatic Notion sync will stop.
- This is a code and migration review branch only. No Supabase production settings, schema, secrets, deployed functions or Cloudflare deployment have been changed.
