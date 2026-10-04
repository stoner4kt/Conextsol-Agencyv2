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
  subdomain?:                     string;
  google_place_id?:               string;
  google_review_url?:             string;
  review_automation_enabled?:     boolean;
  review_from_name?:              string;
  review_from_email?:             string;  // per-client Resend verified sender address
  review_reply_to_email?:         string;
  // google_oauth_refresh_token_enc is intentionally omitted — never expose to browser
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
  completion_status?:         'in_progress' | 'completed' | 'review_requested' | 'review_received';
  review_email_sent_at?:      string;
  last_review_request_id?:    string;
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
  reviewRequests: ReviewRequest[];
  isAdmin: boolean;
  userEmail: string | null;
}

// ─── Review Automation ───────────────────────────────────────────────────────

export type CompletionStatus =
  | 'in_progress'
  | 'completed'
  | 'review_requested'
  | 'review_received';

export interface ReviewRequest {
  id:                 string;
  project_id:         string;
  client_id:          string;
  sent_at:            string;
  sent_by_user_id?:   string;
  recipient_email:    string;
  recipient_name?:    string;
  email_subject?:     string;
  resend_message_id?: string;
  status:             'sent' | 'delivered' | 'bounced' | 'failed';
  notes?:             string;
  created_at:         string;
  updated_at:         string;
}
