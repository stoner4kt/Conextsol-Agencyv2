// Daily cron target: creates and emails one invoice per due active retainer.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase environment secrets");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const today = new Date();
    const issuedDate = isoDate(today);
    const dueDate = isoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 14)));
    const billingDay = today.getUTCDate();
    const period = issuedDate.slice(0, 7).replace("-", "");

    const { data: retainers, error } = await supabase
      .from("retainers")
      .select("id, client_id, service_type, billing_amount, billing_cycle_day, clients(id, company_name, email)")
      .eq("is_active", true)
      .eq("billing_cycle_day", billingDay);
    if (error) throw error;

    const results: Array<Record<string, string>> = [];
    for (const retainer of retainers ?? []) {
      const invoiceNumber = `RET-${retainer.id.slice(0, 8).toUpperCase()}-${period}`;
      // The deterministic number is unique, making daily retries safe.
      const { data: existing, error: existingError } = await supabase
        .from("invoices")
        .select("id, invoice_number, notes")
        .eq("invoice_number", invoiceNumber)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing?.notes?.includes("Initial retainer invoice email sent:")) {
        results.push({ retainerId: retainer.id, invoiceId: existing.id, invoiceNumber, status: "already-created-and-sent", error: "" });
        continue;
      }

      let invoiceId = existing?.id as string | undefined;
      if (!invoiceId) {
        const amount = Number(retainer.billing_amount);
        const { data: created, error: createError } = await supabase
          .from("invoices")
          .insert({
            invoice_number: invoiceNumber,
            client_id: retainer.client_id,
            line_items: [{ id: crypto.randomUUID(), description: `${retainer.service_type} retainer — ${issuedDate.slice(0, 7)}`, quantity: 1, unit_price: amount, amount }],
            subtotal: amount,
            tax_rate: 0,
            status: "unpaid",
            issued_date: issuedDate,
            due_date: dueDate,
            notes: `Automatically generated for retainer ${retainer.id}.`,
          })
          .select("id, invoice_number")
          .single();
        if (createError) throw createError;
        invoiceId = created.id;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/invoice-reminders`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${serviceRoleKey}`, "apikey": serviceRoleKey, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_invoice", invoiceId }),
      });
      const emailResult = await response.json().catch(() => ({}));
      if (response.ok) {
        await supabase
          .from("invoices")
          .update({ notes: `Automatically generated for retainer ${retainer.id}. Initial retainer invoice email sent: ${new Date().toISOString()}` })
          .eq("id", invoiceId);
      }
      results.push({
        retainerId: retainer.id,
        invoiceId,
        invoiceNumber,
        status: response.ok ? (existing ? "existing-invoice-sent" : "created-and-sent") : "created-email-failed",
        error: response.ok ? "" : String(emailResult.error ?? "Invoice email dispatch failed"),
      });
    }

    return new Response(JSON.stringify({ success: true, billingDayChecked: billingDay, retainersChecked: retainers?.length ?? 0, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("retainer-billing edge function error:", error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
