import { assertEquals } from "jsr:@std/assert@1";

import {
  buildExpoMessages,
  chunkMessages,
  findUnregisteredTokens,
  shouldSendPush,
} from "./lib.ts";
import { getPushText, normalizeLanguage } from "./messages.ts";

Deno.test("shouldSendPush defaults to true when no preference row exists", () => {
  assertEquals(shouldSendPush(undefined), true);
  assertEquals(shouldSendPush(null), true);
});

Deno.test("shouldSendPush respects push_enabled = true", () => {
  assertEquals(shouldSendPush(true), true);
});

Deno.test("shouldSendPush is false only when explicitly disabled", () => {
  assertEquals(shouldSendPush(false), false);
});

Deno.test("buildExpoMessages produces one message per token with generic body", () => {
  const messages = buildExpoMessages(
    ["token-a", "token-b"],
    "New blood request",
    "Open the app for details.",
    "blood_request",
    "req-1",
  );
  assertEquals(messages.length, 2);
  assertEquals(messages[0], {
    to: "token-a",
    title: "New blood request",
    body: "Open the app for details.",
    data: { entityType: "blood_request", entityId: "req-1" },
    sound: null,
  });
});

Deno.test("buildExpoMessages never includes anything beyond the generic title/body", () => {
  const messages = buildExpoMessages(
    ["token-a"],
    "New connection request",
    "Open the app for details.",
    "patient_donor_connection",
    "conn-1",
  );
  const serialized = JSON.stringify(messages[0]);
  assertEquals(serialized.includes("phone"), false);
  assertEquals(serialized.includes("thalassemia"), false);
});

Deno.test("chunkMessages splits into groups of the given size", () => {
  const messages = Array.from({ length: 205 }, (_, i) => i);
  const chunks = chunkMessages(messages, 100);
  assertEquals(chunks.length, 3);
  assertEquals(chunks[0].length, 100);
  assertEquals(chunks[1].length, 100);
  assertEquals(chunks[2].length, 5);
});

Deno.test("chunkMessages defaults to Expo's 100-message cap", () => {
  const messages = Array.from({ length: 150 }, (_, i) => i);
  const chunks = chunkMessages(messages);
  assertEquals(chunks.length, 2);
});

Deno.test("findUnregisteredTokens matches tickets to tokens by position", () => {
  const tokens = ["token-a", "token-b", "token-c"];
  const tickets = [
    { status: "ok" as const, id: "1" },
    { status: "error" as const, details: { error: "DeviceNotRegistered" } },
    { status: "error" as const, details: { error: "MessageTooBig" } },
  ];
  assertEquals(findUnregisteredTokens(tokens, tickets), ["token-b"]);
});

Deno.test("findUnregisteredTokens returns empty array when nothing to delete", () => {
  const tokens = ["token-a"];
  const tickets = [{ status: "ok" as const, id: "1" }];
  assertEquals(findUnregisteredTokens(tokens, tickets), []);
});

Deno.test("normalizeLanguage falls back to bn for anything but en", () => {
  assertEquals(normalizeLanguage("en"), "en");
  assertEquals(normalizeLanguage("bn"), "bn");
  assertEquals(normalizeLanguage(null), "bn");
  assertEquals(normalizeLanguage(undefined), "bn");
  assertEquals(normalizeLanguage("fr"), "bn");
});

Deno.test("getPushText returns generic, type-specific title with a non-identifying body", () => {
  const { title, body } = getPushText("request_invited", "en");
  assertEquals(title, "New blood request");
  assertEquals(body, "Open the app for details.");
});

Deno.test("getPushText falls back to a default title for an unknown type", () => {
  const { title } = getPushText("something_new", "bn");
  assertEquals(title, "নতুন বিজ্ঞপ্তি");
});

Deno.test("getPushText marks emergency invites as urgent without adding details", () => {
  const { title, body } = getPushText("request_invited", "en", { is_emergency: true, district_id: 1 });
  assertEquals(title, "Urgent blood request");
  assertEquals(body, "Open the app for details.");
});

Deno.test("getPushText keeps the normal title for non-emergency invites", () => {
  assertEquals(getPushText("request_invited", "bn", { is_emergency: false }).title, "নতুন রক্তের অনুরোধ");
});

Deno.test("getPushText has a title for request_escalated", () => {
  assertEquals(getPushText("request_escalated", "en").title, "Backup donors notified");
});
