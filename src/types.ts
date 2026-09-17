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

export interface AIToolAccount {
  id: string; // UUID
  account_email: string; // Google account email used for AI tools
  service_name: 'Replit' | 'Claude' | 'Codex' | 'Other' | string;
  reset_date: string; // Date string (YYYY-MM-DD)
  status: 'Limited' | 'Usable' | 'Reset Soon' | 'Unknown';
  notes: string;
  last_checked: string; // Date string (YYYY-MM-DD)
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: 'unpaid' | 'paid' | 'overdue' | 'draft';
  due_date: string;
  issued_date: string;
  paid_at: string | null;
  payment_notes: string | null;
  reminder_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Template for a cost that repeats on the 1st of every month. */
export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  /** First month this expense applies (YYYY-MM-01). Applied on day 1 of that month and every month after while active. */
  start_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Concrete expense instance generated for a specific month from a recurring template. */
export interface ExpenseEntry {
  id: string;
  recurring_expense_id: string | null;
  description: string;
  amount: number;
  /** Month this expense belongs to (YYYY-MM-01). */
  expense_month: string;
  created_at: string;
}

export interface AppState {
  clients: Client[];
  projects: Project[];
  retainers: Retainer[];
  documents: DocumentAndNote[];
  alertsLog: WebhookAlert[];
  aiToolAccounts: AIToolAccount[];
  invoices: Invoice[];
  recurringExpenses: RecurringExpense[];
  expenseEntries: ExpenseEntry[];
  isAdmin: boolean;
  userEmail: string | null;
}
