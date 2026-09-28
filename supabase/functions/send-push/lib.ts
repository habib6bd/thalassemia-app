// Pure logic for send-push, kept free of Deno.serve/network/env so it can be
// unit-tested with `deno test` (see lib.test.ts).

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: null;
}

export interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

// notification_preferences has no row for a (user, type) pair until the user
// changes it — default push_enabled is true (matches the table default).
export function shouldSendPush(pushEnabled: boolean | null | undefined): boolean {
  return pushEnabled !== false;
}

export function buildExpoMessages(
  tokens: string[],
  title: string,
  body: string,
  entityType: string | null,
  entityId: string | null,
): ExpoPushMessage[] {
  return tokens.map((token) => ({
    to: token,
    title,
    body,
    data: { entityType, entityId },
    sound: null,
  }));
}

// Expo's push API is capped at 100 messages per request.
export function chunkMessages<T>(messages: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < messages.length; i += size) {
    chunks.push(messages.slice(i, i + size));
  }
  return chunks;
}

// Tickets come back in the same order as the messages that were sent, so we
// zip them with the original tokens to find which ones to delete.
export function findUnregisteredTokens(tokens: string[], tickets: ExpoPushTicket[]): string[] {
  const unregistered: string[] = [];
  tickets.forEach((ticket, index) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      const token = tokens[index];
      if (token) unregistered.push(token);
    }
  });
  return unregistered;
}

/**
 * Constant-time comparison of the webhook secret (security review SR-2), so
 * response timing doesn't reveal how many leading characters matched.
 */
export function secretsMatch(expected: string | undefined, provided: string | null): boolean {
  if (!expected || provided === null) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(expected);
  const b = encoder.encode(provided);
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ (b[i % Math.max(b.length, 1)] ?? 0);
  }
  return diff === 0;
}
