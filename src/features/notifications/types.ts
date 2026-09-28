// Phase 1 notification types (ARCHITECTURE.md §10).
export const notificationTypes = [
  "connection_requested",
  "connection_accepted",
  "connection_ended",
  "request_invited",
  "request_cancelled",
  "request_fulfilled",
  "request_escalated",
  "response_accepted",
  "response_declined",
  "response_withdrawn",
  "donation_reported",
  "donation_confirmed",
  // Phase 2b
  "appreciation_received",
  "guardian_added",
  "guardian_removed",
] as const;
export type NotificationType = (typeof notificationTypes)[number];
