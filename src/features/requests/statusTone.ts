import type { StatusTone } from "@/components/StatusChip";

const positive = new Set(["active", "accepted", "fulfilled", "completed"]);
const warning = new Set([
  "requested",
  "open",
  "responding",
  "partially_fulfilled",
  "invited",
  "donation_pending",
]);
const negative = new Set(["declined", "cancelled", "removed", "expired"]);

export function requestStatusTone(status: string): StatusTone {
  if (positive.has(status)) return "positive";
  if (warning.has(status)) return "warning";
  if (negative.has(status)) return "negative";
  return "neutral";
}
