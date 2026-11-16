import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://dash.conextsol.co.za",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return new Response(JSON.stringify({ error: "Server configuration is incomplete." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const authorization = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: isAdmin, error: roleError } = await userClient.rpc("is_current_user_admin");
  if (roleError || isAdmin !== true) return new Response(JSON.stringify({ error: "Administrator access is required." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const clientId = typeof body?.clientId === "string" ? body.clientId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)) {
      return new Response(JSON.stringify({ error: "A valid clientId is required." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: client, error: clientError } = await admin.from("clients").select("id, company_name, email").eq("id", clientId).single();
    if (clientError || !client?.email) return new Response(JSON.stringify({ error: "Client record or client email was not found." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let invitedUserId: string | null = null;
    const redirectTo = Deno.env.get("CLIENT_PORTAL_REDIRECT_URL") || "https://dash.conextsol.co.za/client";
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(client.email, { redirectTo });
    if (!inviteError && invited.user) {
      invitedUserId = invited.user.id;
    } else {
      const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      const existing = users.users.find((item) => item.email?.toLowerCase() === client.email.toLowerCase());
      if (!existing) throw inviteError ?? new Error("Could not create or locate the invited user.");
      invitedUserId = existing.id;
    }

    const { error: assignError } = await admin.rpc("assign_client_user", {
      p_user_id: invitedUserId,
      p_client_id: client.id,
    });
    if (assignError) throw assignError;

    return new Response(JSON.stringify({
      success: true,
      clientId: client.id,
      email: client.email,
      invitationSent: !inviteError,
      message: inviteError ? "Existing account linked to this client." : "Invitation sent. The client must accept the email invitation before signing in.",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("client-invitations error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Invitation failed." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
