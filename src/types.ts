/**
 * Database Table Types for Conextsol Client & Project Management Portal
 * These match the exact fields requested for the Supabase / Postgres SQL Schema.
 */

export interface Client {
  id: string; // UUID
  company_name: string;
  primary_contact_name: string;
  email: string;
  phone: string;
  status: 'active' | 'paused' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string; // UUID
  client_id: string; // Foreign Key to Client
  project_name: string;
  start_date: string; // Date string (YYYY-MM-DD)
  end_date: string; // Date string (YYYY-MM-DD)
  invoiced_amount: number;
  short_note: string;
  staging_url: string;
  production_url: string;
  github_url: string;
  services_listed: string[]; // specific services delivered
  associated_emails: string[]; // managing emails
  created_at: string;
  updated_at: string;
}

export interface Retainer {
  id: string; // UUID
  client_id: string; // Foreign Key to Client
  service_type: 'web hosting' | 'web maintenance' | 'SEO' | 'Google Ads' | string;
  billing_amount: number;
  billing_cycle_day: number; // Day of month (1-31)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentAndNote {
  id: string; // UUID
  project_id: string; // Foreign Key to Project
  title: string;
  content: string; // Supports Markdown or Rich text
  file_references: string[]; // Paths or URLs
  created_at: string;
  updated_at: string;
}

export interface WebhookAlert {
  id: string;
  timestamp: string;
  type: 'deadline' | 'retainer';
  title: string;
  message: string;
  recipient: string;
  status: 'sent' | 'failed';
}

export interface AppState {
  clients: Client[];
  projects: Project[];
  retainers: Retainer[];
  documents: DocumentAndNote[];
  alertsLog: WebhookAlert[];
  isAdmin: boolean;
  userEmail: string | null;
}
