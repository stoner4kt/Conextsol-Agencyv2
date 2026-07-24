import { AppState, Client, Project, Retainer, DocumentAndNote, WebhookAlert } from './types';

// System date anchored at July 15, 2026
export const CURRENT_DATE_STR = '2026-07-15';

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-acme-001',
    company_name: 'Acme Global Corp',
    primary_contact_name: 'Sarah Jenkins',
    email: 'sarah@acmeglobal.com',
    phone: '+1 (555) 234-5678',
    status: 'active',
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-07-01T10:00:00Z'
  },
  {
    id: 'cli-technova-002',
    company_name: 'TechNova Solutions',
    primary_contact_name: 'Marcus Vance',
    email: 'marcus@technovasolutions.io',
    phone: '+1 (555) 876-5432',
    status: 'active',
    created_at: '2026-02-15T09:30:00Z',
    updated_at: '2026-07-05T11:15:00Z'
  },
  {
    id: 'cli-apex-003',
    company_name: 'Apex Health Systems',
    primary_contact_name: 'Dr. Elena Rostova',
    email: 'elena@apexhealth.org',
    phone: '+1 (555) 345-6789',
    status: 'active',
    created_at: '2026-03-20T14:00:00Z',
    updated_at: '2026-07-10T16:20:00Z'
  },
  {
    id: 'cli-horizon-004',
    company_name: 'Horizon Financial Group',
    primary_contact_name: 'David Sterling',
    email: 'sterling@horizonfin.com',
    phone: '+1 (555) 987-6543',
    status: 'paused',
    created_at: '2026-04-05T10:00:00Z',
    updated_at: '2026-06-18T09:00:00Z'
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'prj-acme-redesign-01',
    client_id: 'cli-acme-001',
    project_name: 'Acme Enterprise Portal Redesign',
    start_date: '2026-05-01',
    end_date: '2026-07-17', // Completes in 2 days from CURRENT_DATE_STR (2026-07-15)
    invoiced_amount: 28500,
    short_note: 'Full redesign of client portal with RBAC security and analytics dashboard.',
    staging_url: 'https://staging.portal.acmeglobal.com',
    production_url: 'https://portal.acmeglobal.com',
    github_url: 'https://github.com/conextsol-agency/acme-portal',
    services_listed: ['UI/UX Design', 'React Frontend', 'Node.js Backend', 'Supabase Integration'],
    associated_emails: ['sarah@acmeglobal.com', 'admin@conextsol.com'],
    created_at: '2026-05-01T08:00:00Z',
    updated_at: '2026-07-12T10:00:00Z'
  },
  {
    id: 'prj-technova-app-02',
    client_id: 'cli-technova-002',
    project_name: 'TechNova Cloud Analytics Suite',
    start_date: '2026-06-01',
    end_date: '2026-08-30',
    invoiced_amount: 42000,
    short_note: 'Custom real-time metric stream processing dashboard.',
    staging_url: 'https://staging-analytics.technovasolutions.io',
    production_url: 'https://analytics.technovasolutions.io',
    github_url: 'https://github.com/conextsol-agency/technova-analytics',
    services_listed: ['Fullstack Web App', 'Realtime WebSockets', 'API Integration'],
    associated_emails: ['marcus@technovasolutions.io', 'admin@conextsol.com'],
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-07-14T15:00:00Z'
  },
  {
    id: 'prj-apex-telehealth-03',
    client_id: 'cli-apex-003',
    project_name: 'Apex Telehealth Patient Portal',
    start_date: '2026-04-15',
    end_date: '2026-09-15',
    invoiced_amount: 35000,
    short_note: 'HIPAA-compliant video consultation scheduling and records management.',
    staging_url: 'https://staging.telehealth.apexhealth.org',
    production_url: 'https://telehealth.apexhealth.org',
    github_url: 'https://github.com/conextsol-agency/apex-telehealth',
    services_listed: ['Security Audit', 'React Frontend', 'PostgreSQL Schema Design'],
    associated_emails: ['elena@apexhealth.org', 'admin@conextsol.com'],
    created_at: '2026-04-15T11:00:00Z',
    updated_at: '2026-07-08T13:45:00Z'
  }
];

export const INITIAL_RETAINERS: Retainer[] = [
  {
    id: 'ret-acme-maint-01',
    client_id: 'cli-acme-001',
    service_type: 'web maintenance',
    billing_amount: 3500,
    billing_cycle_day: 15, // Billed today (15th of the month)
    is_active: true,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-07-15T00:00:00Z'
  },
  {
    id: 'ret-technova-seo-02',
    client_id: 'cli-technova-002',
    service_type: 'SEO',
    billing_amount: 2200,
    billing_cycle_day: 1,
    is_active: true,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z'
  },
  {
    id: 'ret-apex-hosting-03',
    client_id: 'cli-apex-003',
    service_type: 'web hosting',
    billing_amount: 1800,
    billing_cycle_day: 15, // Billed today (15th of the month)
    is_active: true,
    created_at: '2026-04-15T00:00:00Z',
    updated_at: '2026-07-15T00:00:00Z'
  }
];

export const INITIAL_DOCUMENTS: DocumentAndNote[] = [
  {
    id: 'doc-acme-spec-01',
    project_id: 'prj-acme-redesign-01',
    title: 'Acme Enterprise Portal Architecture & Specs',
    content: `### Acme Enterprise Portal Specs

#### System Overview
The Acme Enterprise Portal provides role-based user management, account metrics, and contract record handling.

#### Technical Architecture
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Database**: PostgreSQL (Supabase / Cloud SQL)
- **Authentication**: JWT Row-Level Security (RLS) policies
- **Automations**: Automated deadline scanners via Deno Edge Functions and Telegram webhooks

#### Deployment Milestones
1. Final QA Testing in Staging Environment
2. Data migration script verification
3. Production DNS switchover on July 17, 2026`,
    file_references: ['/docs/acme-architecture.pdf', '/docs/acme-security-audit.pdf'],
    created_at: '2026-05-05T09:00:00Z',
    updated_at: '2026-07-12T14:30:00Z'
  },
  {
    id: 'doc-technova-spec-02',
    project_id: 'prj-technova-app-02',
    title: 'TechNova Cloud Analytics Specification',
    content: `### TechNova Cloud Analytics Architecture

#### Key Capabilities
- Real-time event ingestion pipeline
- Interactive charting and metric dashboards
- Automated export routines for CSV & PDF reports

#### Data Contract
All payload events are structured as JSON and verified via schema validators before ingestion.`,
    file_references: ['/docs/technova-api-contract.json'],
    created_at: '2026-06-02T10:15:00Z',
    updated_at: '2026-07-08T11:00:00Z'
  }
];

export const INITIAL_ALERTS: WebhookAlert[] = [
  {
    id: 'alert-initial-01',
    timestamp: new Date().toISOString(),
    type: 'deadline',
    title: 'System Initialized',
    message: '🚀 Conextsol Portal initialized and ready. Synchronized with database ledger.',
    recipient: 'System Log',
    status: 'sent'
  }
];

export function getInitialState(): AppState {
  return {
    clients: INITIAL_CLIENTS,
    projects: INITIAL_PROJECTS,
    retainers: INITIAL_RETAINERS,
    documents: INITIAL_DOCUMENTS,
    alertsLog: INITIAL_ALERTS,
    isAdmin: true,
    userEmail: 'admin@conextsol.com',
  };
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem('conextsol_clients', JSON.stringify(state.clients));
    localStorage.setItem('conextsol_projects', JSON.stringify(state.projects));
    localStorage.setItem('conextsol_retainers', JSON.stringify(state.retainers));
    localStorage.setItem('conextsol_documents', JSON.stringify(state.documents));
    localStorage.setItem('conextsol_alerts_log', JSON.stringify(state.alertsLog));
  } catch (err) {
    console.warn('Unable to persist state to LocalStorage:', err);
  }
}

