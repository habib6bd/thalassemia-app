// Account deletion (phase-2.md 2b, OPEN_QUESTIONS Q21). Called by the signed-in
// user. Step 1 runs public.delete_my_account() *as that user* (all data
// changes, one transaction, same checks as any RPC). Step 2 soft-deletes the
// auth user with the service role so they can no longer sign in. Soft delete
// keeps the auth row, which donation history still references.
import { createClient } from "npm:@supabase/supabase-js@2";

import { bearerToken, corsHeaders } from "./lib.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders() });
  }

  const token = bearerToken(req.headers.get("authorization"));
  if (!token) {
    return Response.json({ error: "not_authorized" }, { status: 401, headers: corsHeaders() });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return Response.json({ error: "not_authorized" }, { status: 401, headers: corsHeaders() });
  }

  const { error: rpcError } = await userClient.rpc("delete_my_account");
  if (rpcError) {
    return Response.json({ error: rpcError.message }, { status: 400, headers: corsHeaders() });
  }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });
  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id, true);
  if (deleteError) {
    // Data is already anonymised and roles removed; retrying is safe
    // (delete_my_account is idempotent).
    return Response.json({ error: "auth_delete_failed" }, { status: 500, headers: corsHeaders() });
  }

  return Response.json({ ok: true }, { headers: corsHeaders() });
});
