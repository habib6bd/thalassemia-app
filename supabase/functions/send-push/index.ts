// Supabase Database Webhook target: fires on INSERT into public.notifications
// (ARCHITECTURE.md §10). Loads the recipient's push tokens and preference,
// sends a generic (D9) push via the Expo Push API, records pushed_at, and
// drops tokens Expo reports as no longer registered.
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  buildExpoMessages,
  chunkMessages,
  findUnregisteredTokens,
  secretsMatch,
  shouldSendPush,
} from "./lib.ts";
import type { ExpoPushTicket } from "./lib.ts";
import { getPushText } from "./messages.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  params?: Record<string, unknown> | null;
}

interface WebhookPayload {
  type: string;
  table: string;
  record: NotificationRecord;
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-webhook-secret");
  if (!secretsMatch(expectedSecret, providedSecret)) {
    return new Response("unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const record = payload.record;
  if (!record?.id || !record.user_id || !record.type) {
    return new Response("invalid payload", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const [{ data: preference }, { data: tokenRows }, { data: profile }] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", record.user_id)
      .eq("type", record.type)
      .maybeSingle(),
    supabase.from("push_tokens").select("token").eq("user_id", record.user_id),
    supabase.from("profiles").select("language").eq("user_id", record.user_id).maybeSingle(),
  ]);

  if (!shouldSendPush(preference?.push_enabled)) {
    return Response.json({ skipped: "push_disabled" });
  }

  const tokens = (tokenRows ?? []).map((row) => row.token);
  if (tokens.length === 0) {
    return Response.json({ skipped: "no_tokens" });
  }

  const { title, body } = getPushText(record.type, profile?.language, record.params);
  const messages = buildExpoMessages(tokens, title, body, record.entity_type, record.entity_id);

  const tickets: ExpoPushTicket[] = [];
  for (const chunk of chunkMessages(messages)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(chunk),
    });
    const json = await response.json();
    tickets.push(...(json.data ?? []));
  }

  const unregisteredTokens = findUnregisteredTokens(tokens, tickets);

  await Promise.all([
    supabase.from("notifications").update({ pushed_at: new Date().toISOString() }).eq("id", record.id),
    unregisteredTokens.length > 0
      ? supabase
          .from("push_tokens")
          .delete()
          .eq("user_id", record.user_id)
          .in("token", unregisteredTokens)
      : Promise.resolve(),
  ]);

  return Response.json({ sent: tickets.length, removed: unregisteredTokens.length });
});
