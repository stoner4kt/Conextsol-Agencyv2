import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
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
    <div className="flex h-screen bg-[#06080d] overflow-hidden font-sans text-slate-100">
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
}`;

  // 3. Supabase Deno Edge Function script details
  const edgeCode = `// supabase/functions/deadline-alerts/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

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
# Direct steps for setting up Supabase, loading tables, and pushing the app to production.

1. Create a Supabase project at https://supabase.com.
2. Initialize schema by pasting contents from the "SQL Migrations" tab directly into SQL Editor.
3. Fetch SUPABASE_URL and SUPABASE_ANON_KEY inside Settings -> API.
4. Copy-paste them into your environment credentials.
5. Deploy Edge Functions and set up pg_cron schedules.`;

  return (
    <div className="space-y-6">
      {/* Subtab Header bar */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-4 shadow-sm flex flex-wrap gap-2 font-mono">
        <button
          id="dev-subtab-sql"
          onClick={() => setActiveSubTab('sql')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'sql' ? 'bg-cyan-400 text-slate-950 font-sans' : 'bg-[#06080d] hover:bg-[#121826] text-slate-300'}`}
        >
          <Database size={14} />
          <span>PostgreSQL Schema</span>
        </button>

        <button
          id="dev-subtab-next"
          onClick={() => setActiveSubTab('nextjs')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'nextjs' ? 'bg-cyan-400 text-slate-950 font-sans' : 'bg-[#06080d] hover:bg-[#121826] text-slate-300'}`}
        >
          <Code size={14} />
          <span>Next.js Architecture</span>
        </button>

        <button
          id="dev-subtab-edge"
          onClick={() => setActiveSubTab('edge')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'edge' ? 'bg-cyan-400 text-slate-950 font-sans' : 'bg-[#06080d] hover:bg-[#121826] text-slate-300'}`}
        >
          <Cpu size={14} />
          <span>Edge Functions</span>
        </button>

        <button
          id="dev-subtab-guide"
          onClick={() => setActiveSubTab('guide')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeSubTab === 'guide' ? 'bg-cyan-400 text-slate-950 font-sans' : 'bg-[#06080d] hover:bg-[#121826] text-slate-300'}`}
        >
          <BookOpen size={14} />
          <span>Deploy Instructions</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#06080d] rounded-xl border border-[#1a2234] p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1a2234] pb-3">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-white text-sm flex items-center space-x-1.5">
              <Terminal size={15} className="text-cyan-400" />
              <span>
                {activeSubTab === 'sql' && 'PostgreSQL migrations - /supabase-schema.sql'}
                {activeSubTab === 'nextjs' && 'Next.js App Router Structure'}
                {activeSubTab === 'edge' && 'Supabase Edge Functions'}
                {activeSubTab === 'guide' && 'Setup & Deployment Manual'}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Inspect and copy code snippets.
            </p>
          </div>

          <button
            id="copy-code-btn"
            onClick={() => {
              const text = 
                activeSubTab === 'sql' ? sqlCode :
                activeSubTab === 'nextjs' ? nextCode :
                activeSubTab === 'edge' ? edgeCode : guideText;
              triggerCopy(text, activeSubTab);
            }}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#0b0f19] hover:bg-[#121826] border border-[#1a2234] text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer font-mono"
          >
            {copiedId === activeSubTab ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedId === activeSubTab ? 'Copied!' : 'Copy Snippet'}</span>
          </button>
        </div>

        <pre className="text-[11px] font-mono text-slate-300 leading-normal max-h-[500px] overflow-y-auto bg-[#070a12] p-4 rounded-lg border border-[#1a2234] whitespace-pre scrollbar-thin">
          <code>
            {activeSubTab === 'sql' && sqlCode}
            {activeSubTab === 'nextjs' && nextCode}
            {activeSubTab === 'edge' && edgeCode}
            {activeSubTab === 'guide' && guideText}
          </code>
        </pre>
      </div>

      {/* Database Integration Status and Seeding Panel */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-6 shadow-lg space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a2234] pb-4">
          <div className="space-y-1">
            <h4 className="font-display font-bold text-white text-sm flex items-center space-x-2">
              <Database size={16} className="text-cyan-400" />
              <span>Database Connectivity Engine</span>
            </h4>
            <p className="text-xs text-slate-400 leading-normal max-w-xl">
              Transactions utilize live cloud storage when credentials are available, falling back to clean local persistence.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0 font-mono">
            <span className="h-2.5 w-2.5 rounded-full inline-block bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase text-emerald-400">
              {isSupabaseConnected ? 'Supabase Connected' : 'Local Persistence Active'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-mono">
          {/* Seed Demo Action */}
          <div className="border border-[#1a2234] bg-[#06080d] p-4 rounded-xl flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-white flex items-center space-x-1">
                <Sparkles size={13} className="text-cyan-400" />
                <span>Seed Demonstration Dataset</span>
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Populates 4 Clients, 3 Projects, 4 SLA Retainers, and Tech Specs to test the Command Centre features immediately.
              </p>
            </div>
            <button
              id="seed-sandbox-btn"
              onClick={handleSeed}
              disabled={isSeeding}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-sans font-extrabold text-xs rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              {isSeeding ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-slate-950" />
                  <span>Seeding Records...</span>
                </>
              ) : (
                <>
                  <Database size={13} />
                  <span>Seed Demo Records</span>
                </>
              )}
            </button>
          </div>

          {/* Wipe Sandbox Action */}
          <div className="border border-[#1a2234] bg-[#06080d] p-4 rounded-xl flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-white flex items-center space-x-1">
                <Trash2 size={13} className="text-slate-400" />
                <span>Purge Sandbox Cache</span>
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Wipes state memory cache. Safe operation that allows starting from a clean slate.
              </p>
            </div>
            <button
              id="wipe-sandbox-btn"
              onClick={handleWipe}
              disabled={isWiping}
              className="w-full py-2.5 bg-[#0b0f19] hover:bg-[#121826] border border-[#1a2234] text-slate-300 font-semibold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              {isWiping ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Wiping Cache...</span>
                </>
              ) : (
                <>
                  <Trash2 size={13} />
                  <span>Purge Local Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Helper checklist */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 shadow-lg space-y-3.5 text-left">
        <h4 className="font-display font-bold text-white text-sm flex items-center space-x-1.5">
          <CheckCircle2 size={16} className="text-cyan-400" />
          <span>Production Integration Checklist</span>
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 font-mono">
          <li className="flex items-start space-x-2">
            <span className="h-4 w-4 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5">✓</span>
            <span>Enable RLS on clients, projects, retainers, and documents tables.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="h-4 w-4 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5">✓</span>
            <span>Verify currency localization uses South African Rands (R).</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="h-4 w-4 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5">✓</span>
            <span>Auto-calculate AI tool quota reset countdowns using real browser date.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="h-4 w-4 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] flex items-center justify-center shrink-0 mt-0.5">✓</span>
            <span>Preserve admin/client role boundaries across all modules.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
