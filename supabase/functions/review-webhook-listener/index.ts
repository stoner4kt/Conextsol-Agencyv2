import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

type ErrorCode = "AUTHENTICATION_REQUIRED" | "INVALID_SIGNATURE" | "INVALID_REQUEST" | "PROJECT_NOT_FOUND" | "INTERNAL_ERROR";
interface WebhookPayload { project_id: string; completion_notes?: string; trigger_review_email?: boolean; }
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-webhook-secret, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const err = (msg: string, code: ErrorCode, status: number) => new Response(JSON.stringify({ error: msg, code }), { status, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return err("Method not allowed", "INVALID_REQUEST", 405);
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) return err("Invalid or missing webhook secret", "INVALID_SIGNATURE", 401);
  let payload: WebhookPayload;
  try { payload = await req.json(); } catch { return err("Invalid JSON body", "INVALID_REQUEST", 400); }
  if (!payload.project_id) return err("project_id is required", "INVALID_REQUEST", 400);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: project, error: projErr } = await supabase.from("projects").select("id, project_name, client_id").eq("id", payload.project_id).single();
  if (projErr || !project) return err("Project not found", "PROJECT_NOT_FOUND", 404);
  const { error: updateErr } = await supabase.from("projects").update({ completion_status: "completed", updated_at: new Date().toISOString() }).eq("id", payload.project_id);
  if (updateErr) return err("Failed to update project", "INTERNAL_ERROR", 500);
  let reviewEmailQueued = false;
  if (payload.trigger_review_email) {
    const { data: client } = await supabase.from("clients").select("review_automation_enabled, email, primary_contact_name").eq("id", project.client_id).single();
    if (client?.review_automation_enabled) {
      const resp = await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/send-review-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), "x-internal-call": "true" },
        body: JSON.stringify({ project_id: payload.project_id, client_id: project.client_id, recipient_email: client.email, recipient_name: client.primary_contact_name })
      });
      reviewEmailQueued = resp.ok;
    }
  }
  return new Response(JSON.stringify({ success: true, project_id: payload.project_id, new_status: "completed", review_email_queued: reviewEmailQueued }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
});