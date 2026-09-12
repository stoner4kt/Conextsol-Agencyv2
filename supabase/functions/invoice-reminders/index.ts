import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRow {
  id: string;
  invoice_number: string;
  total: number;
  due_date: string;
  status: string;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  notes?: string | null;
  reminder_sent_at?: string | null;
  clients: {
    company_name: string;
    primary_contact_name: string;
    email: string;
  } | null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value: unknown): string {
  return `R ${Number(value ?? 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function sendInvoiceEmail(
  supabase: ReturnType<typeof createClient>,
  resendApiKey: string,
  invoiceId: string,
) {
  if (!invoiceId) {
    throw new Error("Missing invoiceId");
  }
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const { data, error } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, total, subtotal, tax_rate, tax_amount,
      due_date, issued_date, status, line_items, notes,
      clients ( company_name, primary_contact_name, email )
    `)
    .eq("id", invoiceId)
    .single();

  if (error) throw error;

  const invoice = data as InvoiceRow & {
    issued_date: string;
  };
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  if (invoice.status === "draft") {
    throw new Error("Draft invoices are not sent. Change the invoice status to Unpaid first.");
  }
  if (!invoice.clients?.email) {
    throw new Error("The selected client does not have an email address");
  }

  const client = invoice.clients;
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const lineItemRows = lineItems.map((lineItem) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #1a2234; color: #e2e8f0;">${escapeHtml(lineItem.description)}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #1a2234; color: #cbd5e1; text-align: center;">${escapeHtml(lineItem.quantity)}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #1a2234; color: #cbd5e1; text-align: right;">${formatCurrency(lineItem.unit_price)}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #1a2234; color: #34d399; font-weight: 700; text-align: right;">${formatCurrency(lineItem.amount)}</td>
    </tr>
  `).join("");

  const notes = invoice.notes
    ? `<p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 24px 0 0;"><strong style="color: #cbd5e1;">Note:</strong> ${escapeHtml(invoice.notes)}</p>`
    : "";

  const emailBody = `
    <div style="font-family: Arial, sans-serif; background: #06080d; color: #e2e8f0; padding: 32px; border-radius: 12px; max-width: 680px; margin: 0 auto;">
      <div style="background: #0b0f19; border: 1px solid #1a2234; border-radius: 8px; padding: 28px;">
        <p style="color: #22d3ee; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">Conextsol Agency</p>
        <h1 style="font-size: 28px; color: #ffffff; margin: 0 0 6px;">Invoice ${escapeHtml(invoice.invoice_number)}</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 24px;">Thank you for working with us. Please find your invoice details below.</p>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 24px;">
          <tr><td style="color: #94a3b8; padding: 5px 0;">Bill to</td><td style="color: #ffffff; text-align: right;">${escapeHtml(client.company_name)}</td></tr>
          <tr><td style="color: #94a3b8; padding: 5px 0;">Contact</td><td style="color: #ffffff; text-align: right;">${escapeHtml(client.primary_contact_name)}</td></tr>
          <tr><td style="color: #94a3b8; padding: 5px 0;">Issued</td><td style="color: #ffffff; text-align: right;">${escapeHtml(invoice.issued_date)}</td></tr>
          <tr><td style="color: #94a3b8; padding: 5px 0;">Due</td><td style="color: #fbbf24; font-weight: 700; text-align: right;">${escapeHtml(invoice.due_date)}</td></tr>
        </table>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 10px 0; border-bottom: 1px solid #334155; color: #94a3b8; text-align: left;">Description</th>
              <th style="padding: 10px 0; border-bottom: 1px solid #334155; color: #94a3b8; text-align: center;">Qty</th>
              <th style="padding: 10px 0; border-bottom: 1px solid #334155; color: #94a3b8; text-align: right;">Unit price</th>
              <th style="padding: 10px 0; border-bottom: 1px solid #334155; color: #94a3b8; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>${lineItemRows}</tbody>
        </table>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 18px;">
          <tr><td style="color: #94a3b8; padding: 5px 0; text-align: right;">Subtotal</td><td style="color: #ffffff; padding: 5px 0; text-align: right; width: 150px;">${formatCurrency(invoice.subtotal)}</td></tr>
          <tr><td style="color: #94a3b8; padding: 5px 0; text-align: right;">VAT (${escapeHtml(invoice.tax_rate)}%)</td><td style="color: #ffffff; padding: 5px 0; text-align: right;">${formatCurrency(invoice.tax_amount)}</td></tr>
          <tr><td style="color: #ffffff; border-top: 1px solid #334155; padding: 14px 0 0; text-align: right; font-weight: 700;">Total due</td><td style="color: #34d399; border-top: 1px solid #334155; padding: 14px 0 0; text-align: right; font-size: 20px; font-weight: 900;">${formatCurrency(invoice.total)}</td></tr>
        </table>
        ${notes}
        <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 28px 0 0;">Please arrange payment by the due date. If you have any questions, contact us at billing@conextsol.com.</p>
      </div>
      <p style="color: #334155; font-size: 11px; text-align: center; margin-top: 16px;">Conextsol Agency · conextsol.co.za</p>
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "billing@conextsol.co.za",
      to: [client.email],
      subject: `Invoice ${invoice.invoice_number} from Conextsol`,
      html: emailBody,
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    throw new Error(`Resend failed: ${errorText}`);
  }

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    email: client.email,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment secrets");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let requestBody: { action?: string; invoiceId?: string } = {};
    if (req.method === "POST") {
      try {
        requestBody = await req.json();
      } catch {
        requestBody = {};
      }
    }

    if (requestBody.action === "send_invoice") {
      const result = await sendInvoiceEmail(supabase, resendApiKey, requestBody.invoiceId ?? "");
      return new Response(
        JSON.stringify({ success: true, type: "invoice", ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: overdueInvoices, error: fetchError } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, total, due_date, status, reminder_sent_at,
        clients ( company_name, primary_contact_name, email )
      `)
      .in("status", ["unpaid", "overdue"])
      .lt("due_date", today)
      .is("reminder_sent_at", null);

    if (fetchError) throw fetchError;

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No overdue invoices found.", checkedDate: today }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const results: Array<Record<string, string>> = [];

    for (const invoice of overdueInvoices as InvoiceRow[]) {
      if (!invoice.clients) {
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          status: "failed",
          error: "Invoice client record is missing",
        });
        continue;
      }

      const client = invoice.clients;
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24),
      );

      await supabase
        .from("invoices")
        .update({ status: "overdue", updated_at: new Date().toISOString() })
        .eq("id", invoice.id)
        .eq("status", "unpaid");

      if (resendApiKey) {
        const emailBody = `
          <div style="font-family: Arial, sans-serif; background: #06080d; color: #e2e8f0; padding: 32px; border-radius: 12px; max-width: 520px; margin: 0 auto;">
            <div style="background: #0b0f19; border: 1px solid #1a2234; border-radius: 8px; padding: 24px;">
              <h2 style="color: #22d3ee; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">Payment Reminder</h2>
              <p style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 24px;">Invoice ${invoice.invoice_number}</p>
              <table style="width: 100%; font-size: 13px; border-collapse: collapse; font-family: monospace;">
                <tr><td style="color: #94a3b8; padding: 6px 0;">Client</td><td style="color: #fff; text-align: right;">${client.company_name}</td></tr>
                <tr><td style="color: #94a3b8; padding: 6px 0;">Contact</td><td style="color: #fff; text-align: right;">${client.primary_contact_name}</td></tr>
                <tr><td style="color: #94a3b8; padding: 6px 0;">Due Date</td><td style="color: #f87171; text-align: right;">${invoice.due_date}</td></tr>
                <tr><td style="color: #94a3b8; padding: 6px 0;">Days Overdue</td><td style="color: #f87171; font-weight: bold; text-align: right;">${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}</td></tr>
                <tr style="border-top: 1px solid #1a2234;">
                  <td style="color: #94a3b8; padding: 10px 0 0;">Amount Due</td>
                  <td style="color: #34d399; font-weight: 900; font-size: 18px; text-align: right; padding-top: 10px;">
                    R ${Number(invoice.total).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 12px; margin-top: 24px; line-height: 1.6;">
                Please arrange payment at your earliest convenience. If you have any questions regarding this invoice, please contact us directly at billing@conextsol.com.
              </p>
            </div>
            <p style="color: #334155; font-size: 11px; text-align: center; margin-top: 16px;">Conextsol Agency · conextsol.co.za</p>
          </div>
        `;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "billing@conextsol.co.za",
            to: [client.email],
            subject: `Payment Reminder — ${invoice.invoice_number} (${daysOverdue}d overdue)`,
            html: emailBody,
          }),
        });

        if (resendResponse.ok) {
          await supabase
            .from("invoices")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", invoice.id);
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            status: "sent",
            email: client.email,
          });
        } else {
          const errorText = await resendResponse.text();
          console.error(`Resend failed for ${invoice.invoice_number}:`, errorText);
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            status: "failed",
            error: errorText,
          });
        }
      } else {
        console.warn(`RESEND_API_KEY not set. Reminder simulated for ${invoice.invoice_number}`);
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          status: "simulated",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, checkedDate: today, overdueCount: overdueInvoices.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("invoice-reminders edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
