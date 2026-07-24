// ====================================================================
// SUPABASE EDGE FUNCTION: retainer-billing-alerts
// Runs daily via pg_cron to check for active retainers whose billing
// cycle day matches the current day of the month, triggering alerts.
// ====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment secrets");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // 1. Determine current day of the month
    const today = new Date();
    const currentDay = today.getDate(); // Integer 1-31
    console.log(`Scanning active retainers with billing_cycle_day: ${currentDay}`);

    // 2. Query active retainers matching today's billing day
    const { data: retainers, error } = await supabase
      .from("retainers")
      .select(`
        id,
        service_type,
        billing_amount,
        billing_cycle_day,
        clients (
          id,
          company_name,
          primary_contact_name,
          email
        )
      `)
      .eq("is_active", true)
      .eq("billing_cycle_day", currentDay);

    if (error) {
      throw error;
    }

    if (!retainers || retainers.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No active retainers are due for invoicing today.", 
        billingDayChecked: currentDay 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${retainers.length} active retainer(s) due today. Dispatching admin billing alerts...`);

    // 3. Send Webhook Alerts to Telegram
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    const alertsSent = [];

    for (const retainer of retainers) {
      const client = retainer.clients;
      const clientName = client ? (client as any).company_name : "Unknown Client";
      const contact = client ? (client as any).primary_contact_name : "N/A";
      
      const messageText = `💰 *Billing Alert: Retainer Invoicing Due* 💰\n\n` +
                          `• *Client:* ${clientName}\n` +
                          `• *Service:* ${retainer.service_type.toUpperCase()}\n` +
                          `• *Due Date:* Day ${retainer.billing_cycle_day} (TODAY)\n` +
                          `• *Billing Amount:* $${Number(retainer.billing_amount).toLocaleString()}\n` +
                          `• *Primary Contact:* ${contact}\n\n` +
                          `_Instructions: Generate and dispatch the invoice inside stripe or quickbooks._`;

      if (telegramBotToken && telegramChatId) {
        const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: messageText,
            parse_mode: "Markdown",
          }),
        });
        
        if (!response.ok) {
          const errText = await response.text();
          console.error(`Telegram webhook failed for retainer ${retainer.id}:`, errText);
          alertsSent.push({ retainerId: retainer.id, status: "failed", error: errText });
        } else {
          console.log(`Successfully dispatched retainer alert for retainer ${retainer.id}`);
          alertsSent.push({ retainerId: retainer.id, status: "success" });
        }
      } else {
        console.warn(`Webhook alert simulated. TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in Supabase.`);
        console.log(`Alert text:\n${messageText}`);
        alertsSent.push({ retainerId: retainer.id, status: "simulated", reason: "Secrets not set" });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      billingDayChecked: currentDay,
      retainersChecked: retainers.length,
      alerts: alertsSent
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Critical edge function error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
