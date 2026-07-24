import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  Code, 
  Database, 
  Cpu, 
  BookOpen, 
  CheckCircle2,
  Trash2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface DevCenterProps {
  onSeedDemoData: () => void;
  onClearAllData: () => void;
  isSupabaseConnected: boolean;
}

export default function DevCenter({ onSeedDemoData, onClearAllData, isSupabaseConnected }: DevCenterProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sql' | 'nextjs' | 'edge' | 'guide'>('sql');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSeed = () => {
    setIsSeeding(true);
    setTimeout(() => {
      onSeedDemoData();
      setIsSeeding(false);
    }, 600);
  };

  const handleWipe = () => {
    setIsWiping(true);
    setTimeout(() => {
      onClearAllData();
      setIsWiping(false);
    }, 600);
  };

  // 1. PostgreSQL DDL string for copy-pasting
  const sqlCode = `-- CONEXTSOL AGENCY CLIENT & PROJECT MANAGEMENT PORTAL
-- Raw SQL script to copy-paste directly into your Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    primary_contact_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table (FK linking to clients.id)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    invoiced_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    short_note TEXT,
    staging_url TEXT,
    production_url TEXT,
    github_url TEXT,
    services_listed JSONB NOT NULL DEFAULT '[]'::jsonb,
    associated_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retainers table (separate flat-rate contract references)
CREATE TABLE retainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('web hosting', 'web maintenance', 'SEO', 'Google Ads')),
    billing_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    billing_cycle_day INTEGER NOT NULL CHECK (billing_cycle_day >= 1 AND billing_cycle_day <= 31),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents & Notes Table (FK linking to projects.id)
CREATE TABLE documents_and_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    file_references TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS) policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_and_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access" 
ON clients FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com');

CREATE POLICY "Clients can view linked projects"
ON projects FOR SELECT TO authenticated
USING (associated_emails @> jsonb_build_array(auth.jwt() ->> 'email'));`;

  // 2. Next.js App Router Page details
  const nextCode = `// app/layout.tsx
// Root design layout centering the Conextsol branding, sidebars and provider frame.

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if current user is admin based on email claim (e.g. reeqieric41@gmail.com)
  const isAdmin = user.email?.endsWith('@conextsol.com') || user.email === 'reeqieric41@gmail.com';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar 
        userEmail={user.email} 
        isAdmin={isAdmin} 
      />
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

// app/onboarding/page.tsx
// Linear Client -> Project -> Initial Documentation onboarding wizard.

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // State elements
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');

  // Project details
  const [projectName, setProjectName] = useState('');
  const [amount, setAmount] = useState(15000);

  // Initial Document spec sheet
  const [docTitle, setDocTitle] = useState('Specs Summary');
  const [docContent, setDocContent] = useState('### Core Spec Notes');

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .insert([{ company_name: companyName, primary_contact_name: contactName, email: email }])
      .select('id')
      .single();

    if (error) {
      alert(error.message);
    } else {
      setClientId(data.id);
      setStep(2);
    }
    setLoading(false);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .insert([{ client_id: clientId, project_name: projectName, invoiced_amount: amount }])
      .select('id')
      .single();

    if (error) {
      alert(error.message);
    } else {
      setProjectId(data.id);
      setStep(3);
    }
    setLoading(false);
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('documents_and_notes')
      .insert([{ project_id: projectId, title: docTitle, content: docContent }]);

    if (error) {
      alert(error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 max-w-xl mx-auto shadow-sm">
      <h2 className="font-display font-bold text-lg mb-4">Client Onboarding Wizard</h2>
      {step === 1 && <form onSubmit={handleStep1}>...</form>}
      {step === 2 && <form onSubmit={handleStep2}>...</form>}
      {step === 3 && <form onSubmit={handleStep3}>...</form>}
    </div>
  );
}`;

  // 3. Supabase Deno Edge Function script details
  const edgeCode = `// supabase/functions/deadline-alerts/index.ts
// Deno Edge Function scanning project deadlines and messaging Telegram Webhooks.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate target date (+2 days in the future)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const { data: projects } = await supabase
      .from("projects")
      .select("*, clients(company_name, email)")
      .eq("end_date", targetDateStr);

    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ message: "No deadlines in 2 days" }), { status: 200 });
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    for (const project of projects) {
      const msg = \`⚠️ Project deadline approaching in 2 days!\\nName: \${project.project_name}\\nClient: \${project.clients.company_name}\`;
      await fetch(\`https://api.telegram.org/bot\${botToken}/sendMessage\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg }),
      });
    }

    return new Response(JSON.stringify({ checkedDate: targetDateStr, alertFired: projects.length }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
});`;

  // 4. Detailed Guide/README text preview
  const guideText = `# Conextsol Deployment Manual
# Direct steps for setting up Supabase, loading tables, and pushing the app to Vercel production.

1. Create a Supabase project at https://supabase.com.
2. Initialize schema by pasting contents from the "SQL Migrations" tab directly into SQL Editor.
3. Fetch the SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANOTHER_ANON_KEY inside Settings -> API.
4. Copy-paste them to your vercel environment fields or .env.local file.
5. Link Supabase CLI, bind secrets, and run deployment for Deno Edge Functions:
   $ npx supabase secrets set TELEGRAM_BOT_TOKEN="..." TELEGRAM_CHAT_ID="..."
   $ npx supabase fn deploy deadline-alerts
   $ npx supabase fn deploy retainer-billing
6. Enable the pg_cron extension via the SQL Editor and define daily schedule timers.
7. Launch the Next.js workspace on Vercel with a single git push.`;

  return (
    <div className="space-y-6">
      {/* Tab Header bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-wrap gap-2">
        <button
          id="dev-subtab-sql"
          onClick={() => setActiveSubTab('sql')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'sql' ? 'bg-brand-purple-900 text-emerald-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
        >
          <Database size={14} />
          <span>PostgreSQL Schema Migrations</span>
        </button>

        <button
          id="dev-subtab-next"
          onClick={() => setActiveSubTab('nextjs')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'nextjs' ? 'bg-brand-purple-900 text-emerald-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
        >
          <Code size={14} />
          <span>Next.js Frontend Code</span>
        </button>

        <button
          id="dev-subtab-edge"
          onClick={() => setActiveSubTab('edge')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'edge' ? 'bg-brand-purple-900 text-emerald-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
        >
          <Cpu size={14} />
          <span>Deno Edge Functions</span>
        </button>

        <button
          id="dev-subtab-guide"
          onClick={() => setActiveSubTab('guide')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'guide' ? 'bg-brand-purple-900 text-emerald-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
        >
          <BookOpen size={14} />
          <span>Vercel Deploy Instructions</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#0b0615] rounded-xl border border-brand-purple-900/60 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-brand-purple-950 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-slate-200 text-sm flex items-center space-x-1.5">
              <Terminal size={15} className="text-emerald-400" />
              <span>
                {activeSubTab === 'sql' && 'PostgreSQL migrations - /supabase-schema.sql'}
                {activeSubTab === 'nextjs' && 'Next.js 14 App Router Structure'}
                {activeSubTab === 'edge' && 'Supabase Edge Functions'}
                {activeSubTab === 'guide' && 'Comprehensive Setup & Deploy Guide'}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-sans">
              Review and copy code directly for production setup in Vercel.
            </p>
          </div>

          {/* Copy Button */}
          <button
            id="copy-code-btn"
            onClick={() => {
              const text = 
                activeSubTab === 'sql' ? sqlCode :
                activeSubTab === 'nextjs' ? nextCode :
                activeSubTab === 'edge' ? edgeCode : guideText;
              triggerCopy(text, activeSubTab);
            }}
            className="flex items-center space-x-1 px-3 py-1.5 bg-brand-purple-900 hover:bg-brand-purple-850 border border-brand-purple-800 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer font-sans"
          >
            {copiedId === activeSubTab ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedId === activeSubTab ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Render Code Block */}
        <pre className="text-[11px] font-mono text-slate-300 leading-normal max-h-[500px] overflow-y-auto bg-slate-950/60 p-4 rounded-lg border border-brand-purple-950 whitespace-pre scrollbar-thin">
          <code>
            {activeSubTab === 'sql' && sqlCode}
            {activeSubTab === 'nextjs' && nextCode}
            {activeSubTab === 'edge' && edgeCode}
            {activeSubTab === 'guide' && guideText}
          </code>
        </pre>
      </div>

      {/* Live Database Integration Status and Seeding Panel */}
      <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-6 shadow-lg space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/15 pb-4">
          <div className="space-y-1">
            <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2">
              <Database size={16} className="text-emerald-400" />
              <span>Real-Time Database Connectivity Status</span>
            </h4>
            <p className="text-xs text-gray-400 leading-normal max-w-xl">
              This agency portal dynamically detects connection settings. If Vite credentials are present, transactions route straight to your live cloud PostgreSQL instance.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className={`h-2.5 w-2.5 rounded-full inline-block ${isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className={`font-mono text-xs font-black uppercase ${isSupabaseConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isSupabaseConnected ? 'Supabase Connected' : 'Local Storage Sandbox'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Seed Demo Action */}
          <div className="border border-purple-900/10 bg-[#0F081C]/40 p-4 rounded-xl flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-white flex items-center space-x-1">
                <Sparkles size={13} className="text-emerald-400" />
                <span>Load Sample Backoffice Sandbox Data</span>
              </h5>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Since we removed default seed datasets from the main database, you can load our complete pre-configured demonstration suite (4 Clients, 3 Projects, 4 Active Retainers, and Docs) instantly to inspect the styling and responsiveness.
              </p>
            </div>
            <button
              id="seed-sandbox-btn"
              onClick={handleSeed}
              disabled={isSeeding}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] font-semibold text-xs rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              {isSeeding ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Seeding Records...</span>
                </>
              ) : (
                <>
                  <Database size={13} />
                  <span>Seed Demonstration Dataset</span>
                </>
              )}
            </button>
          </div>

          {/* Wipe Sandbox Action */}
          <div className="border border-purple-900/10 bg-[#0F081C]/40 p-4 rounded-xl flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-white flex items-center space-x-1">
                <Trash2 size={13} className="text-red-400" />
                <span>Purge Local sandbox Databases</span>
              </h5>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Wipes and purges any records in your current local sandbox cache. Allows starting completely empty from scratch. This operation is safe and will not delete records in your live remote cloud database.
              </p>
            </div>
            <button
              id="wipe-sandbox-btn"
              onClick={handleWipe}
              disabled={isWiping}
              className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              {isWiping ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Wiping Cache...</span>
                </>
              ) : (
                <>
                  <Trash2 size={13} />
                  <span>Purge Local Sandbox Cache</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Helper checklist */}
      <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-5 shadow-lg space-y-3.5 text-left">
        <h4 className="font-display font-bold text-white text-sm flex items-center space-x-1.5">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>Supabase Production Launch Checklist</span>
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-300 font-sans">
          <li className="flex items-start space-x-2">
            <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">✓</span>
            <span>Enable RLS on all 4 tables to protect tenant data from anonymous manipulation.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">✓</span>
            <span>Configure bot webhooks inside Deno secrets manager via CLI.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">✓</span>
            <span>Establish cron schedule jobs via standard Postgres pg_cron.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">✓</span>
            <span>Deploy Next.js 14 server with built-in SSR features in Vercel.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
