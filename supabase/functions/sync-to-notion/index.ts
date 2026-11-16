// ====================================================================
// SUPABASE EDGE FUNCTION: sync-to-notion
// One-way sync: Supabase -> Notion
// Tables synced: clients, projects, documents_and_notes, invoices, expense_entries
// Triggered by Supabase Database Webhooks (INSERT / UPDATE / DELETE)
// Also supports a one-time backfill via ?backfill=1
// ====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notion-sync-secret",
};

const NOTION_VERSION = "2022-06-28";
const NOTION_API_BASE = "https://api.notion.com/v1";
const TEXT_LIMIT = 2000;
const BACKFILL_DELAY_MS = 350;

// --------------------------------------------------------------------
// Table -> Notion database env var name map
// --------------------------------------------------------------------
const TABLE_TO_DB_ENV: Record<string, string> = {
  clients: "NOTION_DB_CLIENTS",
  projects: "NOTION_DB_PROJECTS",
  documents_and_notes: "NOTION_DB_DOCUMENTS",
  invoices: "NOTION_DB_INVOICES",
  expense_entries: "NOTION_DB_EXPENSES",
};

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(value: unknown, max = TEXT_LIMIT): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return str.length > max ? str.slice(0, max) : str;
}

function toDateOnly(value: unknown): string | null {
  if (!value) return null;
  const str = String(value);
  const match = str.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function joinArray(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

function richText(value: unknown, max = TEXT_LIMIT) {
  const text = truncate(value, max);
  return { rich_text: [{ text: { content: text } }] };
}

function titleProp(value: unknown, max = TEXT_LIMIT) {
  const text = truncate(value, max);
  return { title: [{ text: { content: text } }] };
}

function dateProp(value: unknown) {
  const dateOnly = toDateOnly(value);
  return { date: dateOnly ? { start: dateOnly } : null };
}

function urlProp(value: unknown) {
  return { url: value ? String(value) : null };
}

function emailProp(value: unknown) {
  return { email: value ? String(value) : null };
}

function phoneProp(value: unknown) {
  return { phone_number: value ? String(value) : null };
}

function numberProp(value: unknown) {
  const num = value === null || value === undefined || value === "" ? null : Number(value);
  return { number: num === null || Number.isNaN(num) ? null : num };
}

function selectProp(value: unknown) {
  return { select: value ? { name: String(value) } : null };
}

function checkboxProp(value: unknown) {
  return { checkbox: Boolean(value) };
}

// Capitalize first letter for status fields (supabase = lowercase, notion = Title Case)
function capitalize(value: unknown): string {
  if (!value) return "";
  const s = String(value);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Serialize JSONB to compact string for Notion rich_text
function jsonToText(value: unknown, max = TEXT_LIMIT): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > max ? str.slice(0, max) : str;
}

// --------------------------------------------------------------------
// Map a Supabase row to Notion properties for a given table
// --------------------------------------------------------------------
function mapRecordToNotionProperties(table: string, record: Record<string, any>) {
  switch (table) {
    case "clients":
      return {
        "Name": titleProp(record.company_name),
        "Contact": richText(record.primary_contact_name),
        "Email": emailProp(record.email),
        "Phone": phoneProp(record.phone),
        "Status": selectProp(record.status),
        "Supabase ID": richText(record.id),
        "Created At": dateProp(record.created_at),
        "Updated At": dateProp(record.updated_at),
      };

    case "projects":
      return {
        "Name": titleProp(record.project_name),
        "Client ID": richText(record.client_id),
        "Start Date": dateProp(record.start_date),
        "End Date": dateProp(record.end_date),
        "Invoiced Amount": numberProp(record.invoiced_amount),
        "Short Note": richText(record.short_note),
        "Staging URL": urlProp(record.staging_url),
        "Production URL": urlProp(record.production_url),
        "GitHub URL": urlProp(record.github_url),
        "Services": richText(joinArray(record.services_listed)),
        "Associated Emails": richText(joinArray(record.associated_emails)),
        "Supabase ID": richText(record.id),
        "Created At": dateProp(record.created_at),
        "Updated At": dateProp(record.updated_at),
      };

    case "documents_and_notes":
      return {
        "Name": titleProp(record.title),
        "Project ID": richText(record.project_id),
        "Content": richText(record.content),
        "File References": richText(joinArray(record.file_references)),
        "Supabase ID": richText(record.id),
        "Created At": dateProp(record.created_at),
        "Updated At": dateProp(record.updated_at),
      };

    case "invoices": {
      // tax_rate is stored as percentage integer (e.g. 20 = 20%).
      // Notion FORMAT 'percent' displays the raw value * 100, so divide by 100.
      const taxRateForNotion = record.tax_rate != null
        ? Number(record.tax_rate) / 100
        : null;
      return {
        "Invoice Number": titleProp(record.invoice_number),
        "Client ID": richText(record.client_id),
        "Status": selectProp(capitalize(record.status)),
        "Issued Date": dateProp(record.issued_date),
        "Due Date": dateProp(record.due_date),
        "Paid At": dateProp(record.paid_at),
        "Subtotal": numberProp(record.subtotal),
        "Tax Rate": { number: taxRateForNotion },
        "Tax Amount": numberProp(record.tax_amount),
        "Total": numberProp(record.total),
        "Line Items": richText(jsonToText(record.line_items)),
        "Payment Notes": richText(record.payment_notes),
        "Notes": richText(record.notes),
        "Supabase ID": richText(record.id),
      };
    }

    case "expense_entries":
      return {
        "Description": titleProp(record.description),
        "Amount": numberProp(record.amount),
        "Expense Month": dateProp(record.expense_month),
        "Is Recurring": checkboxProp(record.recurring_expense_id),
        "Recurring Expense ID": richText(record.recurring_expense_id),
        "Supabase ID": richText(record.id),
      };

    default:
      return null;
  }
}

// --------------------------------------------------------------------
// Notion API wrapper
// --------------------------------------------------------------------
class NotionClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private headers() {
    return {
      "Authorization": `Bearer ${this.token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    };
  }

  async findPageBySupabaseId(databaseId: string, supabaseId: string): Promise<string | null> {
    const res = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        filter: {
          property: "Supabase ID",
          rich_text: { equals: supabaseId },
        },
        page_size: 1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Notion query failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].id;
    }
    return null;
  }

  async createPage(databaseId: string, properties: Record<string, any>) {
    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Notion create page failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  async updatePage(pageId: string, properties: Record<string, any>) {
    const res = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({ properties }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Notion update page failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  async archivePage(pageId: string) {
    const res = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({ archived: true }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Notion archive page failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  async upsertRow(databaseId: string, table: string, record: Record<string, any>) {
    const properties = mapRecordToNotionProperties(table, record);
    if (!properties) {
      throw new Error(`No property mapping for table: ${table}`);
    }
    if (!record.id) {
      throw new Error(`Record for table ${table} is missing an id`);
    }

    const existingPageId = await this.findPageBySupabaseId(databaseId, String(record.id));

    if (existingPageId) {
      await this.updatePage(existingPageId, properties);
      return { action: "updated", pageId: existingPageId };
    } else {
      const created = await this.createPage(databaseId, properties);
      return { action: "created", pageId: created.id };
    }
  }

  async deleteRow(databaseId: string, supabaseId: string) {
    const existingPageId = await this.findPageBySupabaseId(databaseId, String(supabaseId));
    if (!existingPageId) {
      return { action: "skipped", reason: "no matching Notion page" };
    }
    await this.archivePage(existingPageId);
    return { action: "archived", pageId: existingPageId };
  }
}

// --------------------------------------------------------------------
// Config / secrets
// --------------------------------------------------------------------
function getNotionClientAndDbMap() {
  const notionToken     = Deno.env.get("NOTION_TOKEN")      ?? "";
  const dbClients       = Deno.env.get("NOTION_DB_CLIENTS")   ?? "";
  const dbProjects      = Deno.env.get("NOTION_DB_PROJECTS")  ?? "";
  const dbDocuments     = Deno.env.get("NOTION_DB_DOCUMENTS") ?? "";
  const dbInvoices      = Deno.env.get("NOTION_DB_INVOICES")  ?? "";
  const dbExpenses      = Deno.env.get("NOTION_DB_EXPENSES")  ?? "";

  if (!notionToken || !dbClients || !dbProjects || !dbDocuments) {
    throw new Error(
      "Missing Notion secrets: NOTION_TOKEN, NOTION_DB_CLIENTS, NOTION_DB_PROJECTS, NOTION_DB_DOCUMENTS"
    );
  }
  if (!dbInvoices || !dbExpenses) {
    throw new Error(
      "Missing Notion secrets: NOTION_DB_INVOICES, NOTION_DB_EXPENSES"
    );
  }

  const dbMap: Record<string, string> = {
    clients:             dbClients,
    projects:            dbProjects,
    documents_and_notes: dbDocuments,
    invoices:            dbInvoices,
    expense_entries:     dbExpenses,
  };

  const notion = new NotionClient(notionToken);
  return { notion, dbMap };
}

// --------------------------------------------------------------------
// Backfill: pull every row from all synced tables and upsert to Notion
// --------------------------------------------------------------------
async function runBackfill(tablesFilter?: string[]) {
  const supabaseUrl            = Deno.env.get("SUPABASE_URL")            ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment secrets");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { notion, dbMap } = getNotionClientAndDbMap();
  const summary: Record<string, any> = {};

  const tablesToSync = tablesFilter ?? Object.keys(TABLE_TO_DB_ENV);

  for (const table of tablesToSync) {
    const { data, error } = await supabase.from(table).select("*");

    if (error) {
      console.error(`Backfill: failed to read table ${table}:`, error.message);
      summary[table] = { error: error.message };
      continue;
    }

    const rows    = data ?? [];
    const results = [];

    for (const row of rows) {
      try {
        const result = await notion.upsertRow(dbMap[table], table, row);
        results.push({ id: row.id, ...result });
      } catch (err: any) {
        console.error(`Backfill: failed to sync ${table} row ${row.id}:`, err.message);
        results.push({ id: row.id, action: "error", error: err.message });
      }
      await sleep(BACKFILL_DELAY_MS);
    }

    summary[table] = { total: rows.length, results };
  }

  return summary;
}

// --------------------------------------------------------------------
// Webhook payload handling
// --------------------------------------------------------------------
interface DatabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, any> | null;
  old_record: Record<string, any> | null;
  schema?: string;
}

async function handleWebhookPayload(payload: DatabaseWebhookPayload) {
  const { type, table, record, old_record } = payload;

  if (!(table in TABLE_TO_DB_ENV)) {
    return { status: 200, body: { success: true, skipped: true, reason: `Table '${table}' is not synced` } };
  }

  const { notion, dbMap } = getNotionClientAndDbMap();
  const databaseId = dbMap[table];

  if (type === "INSERT" || type === "UPDATE") {
    if (!record) {
      return { status: 400, body: { success: false, error: "Missing 'record' in payload" } };
    }
    const result = await notion.upsertRow(databaseId, table, record);
    return { status: 200, body: { success: true, table, type, ...result } };
  }

  if (type === "DELETE") {
    const supabaseId = old_record?.id ?? record?.id;
    if (!supabaseId) {
      return { status: 400, body: { success: false, error: "Missing id in old_record for DELETE" } };
    }
    const result = await notion.deleteRow(databaseId, supabaseId);
    return { status: 200, body: { success: true, table, type, ...result } };
  }

  return { status: 400, body: { success: false, error: `Unsupported event type: ${type}` } };
}

// --------------------------------------------------------------------
// Entry point
// --------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url        = new URL(req.url);
    const isBackfill = url.searchParams.get("backfill") === "1";
    const tableParam = url.searchParams.get("table"); // optional: ?backfill=1&table=invoices

    if (isBackfill) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const authorization = req.headers.get("Authorization") ?? "";
      if (!supabaseUrl || !anonKey) throw new Error("Supabase authentication is not configured");
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ success: false, error: "Authentication required for Notion backfill." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
        });
      }
      const { data: isAdmin, error: roleError } = await userClient.rpc("is_current_user_admin");
      if (roleError || isAdmin !== true) {
        return new Response(JSON.stringify({ success: false, error: "Administrator access is required for Notion backfill." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
        });
      }
      if (tableParam && !(tableParam in TABLE_TO_DB_ENV)) {
        return new Response(JSON.stringify({ success: false, error: "Unsupported backfill table." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }
    } else {
      const expectedSecret = Deno.env.get("NOTION_SYNC_WEBHOOK_SECRET") ?? "";
      const suppliedSecret = req.headers.get("x-notion-sync-secret") ?? "";
      if (!expectedSecret || suppliedSecret !== expectedSecret) {
        return new Response(JSON.stringify({ success: false, error: "Invalid webhook signature." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
        });
      }
    }

    if (isBackfill) {
      const tables = tableParam ? [tableParam] : undefined;
      console.log("Starting backfill:", tables ?? "all tables");
      const summary = await runBackfill(tables);
      return new Response(JSON.stringify({ success: true, backfill: true, summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    const payload = (await req.json()) as DatabaseWebhookPayload;

    if (!payload || !payload.table || !payload.type) {
      return new Response(JSON.stringify({ success: false, error: "Invalid webhook payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`Received ${payload.type} webhook for table: ${payload.table}`);
    const { status, body } = await handleWebhookPayload(payload);

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  } catch (error: any) {
    console.error("Critical edge function error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
