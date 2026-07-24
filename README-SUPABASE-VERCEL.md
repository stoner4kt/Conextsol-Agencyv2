# Conextsol Client & Project Management Portal
### Production Deployment & Operational Manual (Supabase + Vercel + Next.js 14)

This comprehensive guide explains how to initialize, configure, secure, and deploy the Conextsol Client & Project Management Portal using **Next.js 14 (App Router)**, **Supabase PostgreSQL**, **Supabase Edge Functions**, and **Vercel**.

---

## 1. System Architecture & Repository Structure

To replicate the agency's internal portal locally or inside your production git repository, configure your files according to this structure:

```text
conextsol-portal/
├── app/                           # Next.js 14 App Router
│   ├── layout.tsx                 # Responsive frame, brand sidebars & provider setups
│   ├── page.tsx                   # Main Dashboard containing summaries & active stats
│   ├── login/
│   │   └── page.tsx               # Supabase Email/Password Auth page
│   ├── onboarding/
│   │   └── page.tsx               # Chained Linear Onboarding Wizard
│   ├── clients/
│   │   └── [id]/
│   │       └── page.tsx           # Client Detail view, billing meters & retainers
│   └── documents/
│       └── [id]/
│           └── page.tsx           # Markdown Document Editor (restricted to admin)
├── components/                    # Modular components
│   ├── Sidebar.tsx                # Professional Purplish-Green Sidebar Navigation
│   ├── WizardModal.tsx            # Multi-step Chained Portal Form 
│   └── ui/                        # Reusable Tailwind styling blocks
├── lib/
│   └── supabase.ts                # Client-side Supabase client initializers
├── supabase/                      # Supabase Local Development Framework
│   ├── config.toml                # Supabase CLI setup
│   ├── migrations/
│   │   └── 20260715_schema.sql    # Core database DDL (tables, FKs, RLS, indexes)
│   └── functions/                 # Deno Edge Functions (automated scripts)
│       ├── deadline-alerts/
│       │   └── index.ts           # Project deadline scanner and Telegram webhooks
│       └── retainer-billing/
│           └── index.ts           # Retainer cycle day billing checks & webhooks
├── public/                        # Static assets & logos
├── .env.example                   # Local and remote variable blueprints
├── package.json                   # Dependencies list
└── tsconfig.json                  # TypeScript compiler options
```

---

## 2. PostgreSQL Schema Initialization (Supabase SQL Editor)

1. Navigate to your [Supabase Dashboard](https://supabase.com).
2. Create a new project or select an existing one.
3. Open the **SQL Editor** tab in the sidebar.
4. Click **New Query** and copy-paste the contents of `/supabase-schema.sql` (found in the workspace root).
5. Click **Run** to generate:
   - The `clients`, `projects`, `retainers`, and `documents_and_notes` tables.
   - Cascading foreign key references and constraints.
   - Row Level Security (RLS) policies protecting tables with Admin vs Client checks.
   - Automatic `updated_at` triggers.
   - High-performance lookup indexes.
   - Initial demo seed data.

---

## 3. Environment Variables Configuration

Create a file named `.env.local` in your Next.js root and populate it with your Supabase credentials:

```env
# Client-side Variables (Exposed to Next.js browser)
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANOTHER_ANON_KEY="your-supabase-anon-key-here"

# Server-side Variables (Secure)
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key-here"

# Notification Hook Configurations (Optional)
TELEGRAM_BOT_TOKEN="your-telegram-bot-token-for-alerts"
TELEGRAM_CHAT_ID="your-telegram-group-or-admin-chat-id"
```

---

## 4. Deploying & Scheduling Edge Functions

Supabase Edge Functions are written in Deno. Ensure the Supabase CLI is installed:

### A. Login & Link CLI
```bash
npx supabase login
npx supabase link --project-ref your-supabase-project-id
```

### B. Configure Secrets in Supabase
Set the Telegram credentials inside the Supabase secret store so the Edge Functions can read them at runtime:
```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN="your-bot-token" TELEGRAM_CHAT_ID="your-chat-id"
```

### C. Deploy Functions to Production
Run these commands inside your project root directory:
```bash
npx supabase fn deploy deadline-alerts
npx supabase fn deploy retainer-billing
```

### D. Set Up Cron Schedules
To run these scans automatically every day, enable the `pg_cron` extension inside the Supabase SQL editor and execute these commands:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule Project Deadline Alerts to run daily at 8:00 AM UTC
SELECT cron.schedule(
  'daily-deadline-alerts',
  '0 8 * * *',
  $$ select net.http_post(
       'https://your-supabase-project-id.supabase.co/functions/v1/deadline-alerts',
       '{}',
       '{}',
       '{"Content-Type": "application/json", "Authorization": "Bearer your-anon-key"}'
     ); $$
);

-- Schedule Retainer Billing Alerts to run daily at 8:05 AM UTC
SELECT cron.schedule(
  'daily-retainer-billing',
  '5 8 * * *',
  $$ select net.http_post(
       'https://your-supabase-project-id.supabase.co/functions/v1/retainer-billing',
       '{}',
       '{}',
       '{"Content-Type": "application/json", "Authorization": "Bearer your-anon-key"}'
     ); $$
);
```

---

## 5. Easy Vercel Deployment

Deploying the Next.js frontend to Vercel is highly streamlined:

### Method 1: GitHub Integration (Recommended)
1. Push your local codebase to a GitHub, GitLab, or Bitbucket repository.
2. Go to the [Vercel Dashboard](https://vercel.com).
3. Click **Add New** -> **Project**.
4. Import your Conextsol repository.
5. In the **Environment Variables** section, copy-paste your `.env.local` parameters:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANOTHER_ANON_KEY`
6. Click **Deploy**. Vercel will build the React assets and optimize the build with edge routes.

### Method 2: Vercel CLI (Command Line)
```bash
npm i -g vercel
vercel login
vercel
# Follow prompts to set project name, then specify environment keys:
vercel env add NEXT_PUBLIC_SUPABASE_URL https://...
vercel env add NEXT_PUBLIC_SUPABASE_ANOTHER_ANON_KEY ey...
vercel --prod
```

---

## 6. Access Control & User Administration

- **Admin Account:** To flag an account as an Agency Admin, ensure their email ends with `@conextsol.com` or matches `reeqieric41@gmail.com`. The RLS security policies will recognize these matches inside the JWT claims.
- **Client Account:** Register client emails inside Supabase Auth. Enter their registered emails in the `associated_emails` field of any of their active projects inside the `projects` table. Client users will immediately be granted read-only visibility into only their linked projects and corresponding document pages, leaving billing metrics and client registries fully locked.
