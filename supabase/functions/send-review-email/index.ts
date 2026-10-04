import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

type ErrorCode = "AUTHENTICATION_REQUIRED" | "AUTHORIZATION_FAILED" | "INVALID_REQUEST" | "PROJECT_NOT_FOUND" | "CLIENT_NOT_FOUND" | "EMAIL_SEND_FAILED" | "INTERNAL_ERROR";
interface Payload { project_id: string; client_id: string; recipient_email: string; recipient_name?: string; custom_message?: string; }
const SITE_URL = Deno.env.get("SITE_URL") || "https://app.conextsol.co.za";
const AGENCY_FROM = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@conextsol.co.za";
const CORS = { "Access-Control-Allow-Origin": SITE_URL, "Access-Control-Allow-Headers": "authorization, content-type, x-internal-call", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const err = (msg: string, code: ErrorCode, status: number) => new Response(JSON.stringify({ error: msg, code }), { status, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return err("Method not allowed", "INVALID_REQUEST", 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!, serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, anonKey = Deno.env.get("SUPABASE_ANON_KEY")!, resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return err("Email service not configured", "INTERNAL_ERROR", 500);
  const isInternal = req.headers.get("x-internal-call") === "true";
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/, "");
  let callerEmail: string | undefined;
  if (!isInternal) {
    const check = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: "Bearer " + token } } });
    const { data: { user }, error } = await check.auth.getUser();
    if (error || !user) return err("Authentication required", "AUTHENTICATION_REQUIRED", 401);
    callerEmail = user.email;
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);
  let payload: Payload;
  try { payload = await req.json(); } catch { return err("Invalid JSON body", "INVALID_REQUEST", 400); }
  const { project_id, client_id, recipient_email, recipient_name, custom_message } = payload;
  if (!project_id || !client_id || !recipient_email) return err("project_id, client_id, and recipient_email are required", "INVALID_REQUEST", 400);
  if (!isInternal && callerEmail) {
    const { data: owns, error: ownsErr } = await admin.rpc('verify_project_ownership', { p_project_id: project_id, p_user_email: callerEmail });
    if (ownsErr || !owns) return err("You do not have access to this project", "AUTHORIZATION_FAILED", 403);
  }
  const { data: project, error: pErr } = await admin.from("projects").select("id, project_name, production_url").eq("id", project_id).single();
  if (pErr || !project) return err("Project not found", "PROJECT_NOT_FOUND", 404);
  const { data: client, error: cErr } = await admin.from("clients").select("id, company_name, primary_contact_name, google_review_url, review_from_name, review_from_email, review_reply_to_email").eq("id", client_id).single();
  if (cErr || !client) return err("Client not found", "CLIENT_NOT_FOUND", 404);
  const fromEmail = client.review_from_email || AGENCY_FROM, fromName = client.review_from_name || "Conextsol Agency", replyTo = client.review_reply_to_email || fromEmail;
  const displayName = recipient_name || client.primary_contact_name || "there";
  const reviewUrl = client.google_review_url || "https://www.google.com/search?q=" + encodeURIComponent(client.company_name + " reviews");
  const subject = "Your " + project.project_name + " project is live — we'd love your feedback!";
  const html = "<!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:#0f172a;padding:40px 32px;text-align:center"><h1 style="margin:0;color:#38bdf8;font-size:22px">" + fromName + "</h1><p style="color:#94a3b8">Project Completion</p></div><div style="padding:40px 32px"><h2>Hi " + displayName + "</h2><p><strong>" + project.project_name + "</strong> is now live " + (project.production_url ? "at <a href="" + project.production_url + "">" + project.production_url + "</a>" : "and ready for the world") + ".</p>" + (custom_message ? "<div style="background:#f8fafc;border-left:3px solid #38bdf8;padding:12px 16px">" + custom_message + "</div>" : "") + "<p>It was a pleasure working with <strong>" + client.company_name + "</strong>. If you have 60 seconds, a Google review makes a huge difference for us.</p><p style="text-align:center"><a href="" + reviewUrl + "" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px">Leave a Google Review</a></p></div><div style="background:#f1f5f9;padding:24px;text-align:center;color:#94a3b8;font-size:12px">Sent by " + fromName + "</div></div></body></html>";
  let resendMessageId: string | undefined;
  try {
    const resp = await fetch("https://api.resend.com/emails", { method:"POST", headers:{"Authorization":"Bearer " + resendApiKey,"Content-Type":"application/json"}, body:JSON.stringify({from:fromName + " <" + fromEmail + ">",to:[recipient_email],reply_to:replyTo,subject,html}) });
    if (!resp.ok) return err("Failed to send email via Resend", "EMAIL_SEND_FAILED", 502);
    resendMessageId = (await resp.json()).id;
  } catch { return err("Email delivery network error", "EMAIL_SEND_FAILED", 502); }
  const { data: rr } = await admin.from("review_requests").insert({project_id,client_id,recipient_email,recipient_name:displayName,email_subject:subject,resend_message_id:resendMessageId,status:"sent",notes:custom_message||null}).select("id").single();
  await admin.from("projects").update({completion_status:"review_requested",review_email_sent_at:new Date().toISOString(),last_review_request_id:rr?.id??null,updated_at:new Date().toISOString()}).eq("id",project_id);
  return new Response(JSON.stringify({success:true,resend_message_id:resendMessageId,review_request_id:rr?.id}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
});