// ====================================================================
// SUPABASE EDGE FUNCTION: project-deadline-alerts
// Runs daily via pg_cron or GitHub Action to scan projects 
// ending in exactly 2 days and send alerts to Telegram/WhatsApp.
// ====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define response headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase client inside Edge environment
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

    // 2. Calculate target date (Exactly 2 days in the future)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const targetDateString = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`Scanning projects with end_date matching: ${targetDateString}`);

    // 3. Query projects database with Client joins
    // Using PostgreSQL service role to bypass row-level security for system-level task
    const { data: projects, error } = await supabase
      .from("projects")
      .select(`
        id,
        project_name,
        end_date,
        invoiced_amount,
        clients (
          id,
          company_name,
          primary_contact_name,
          email
        )
      `)
      .eq("end_date", targetDateString);

    if (error) {
      throw error;
    }

    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No projects are ending in exactly 2 days.", 
        dateChecked: targetDateString 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${projects.length} project(s) due on ${targetDateString}. Triggering alerts...`);

    // 4. Send Telegram Alerts (using Telegram Webhook API)
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    const alertsSent = [];

    for (const project of projects) {
      const client = project.clients;
      const clientName = client ? (client as any).company_name : "Unknown Client";
      const contact = client ? (client as any).primary_contact_name : "N/A";
      
      const messageText = `⚠️ *Project Deadline Alert* ⚠️\n\n` +
                          `• *Project:* ${project.project_name}\n` +
                          `• *Client:* ${clientName} (${contact})\n` +
                          `• *Due Date:* ${project.end_date} (In *2 days*)\n` +
                          `• *Value:* $${Number(project.invoiced_amount).toLocaleString()}\n\n` +
                          `_Action Required: Verify development progress and prepare delivery notes._`;

      if (telegramBotToken && telegramChatId) {
        // Real external webhook notification trigger
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
          console.error(`Telegram webhook failed for project ${project.id}:`, errText);
          alertsSent.push({ projectId: project.id, status: "failed", error: errText });
        } else {
          console.log(`Successfully dispatched Telegram alert for project ${project.id}`);
          alertsSent.push({ projectId: project.id, status: "success" });
        }
      } else {
        // Fallback placeholder/console logging when token is not configured yet
        console.warn(`Webhook alert simulated. TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in Supabase Settings.`);
        console.log(`Alert text:\n${messageText}`);
        alertsSent.push({ projectId: project.id, status: "simulated", reason: "Secrets not set" });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      dateChecked: targetDateString,
      projectsChecked: projects.length,
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
