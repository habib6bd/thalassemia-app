// Phase 1 notification types (ARCHITECTURE.md §10).
export const notificationTypes = [
  "connection_requested",
  "connection_accepted",
  "connection_ended",
  "request_invited",
  "request_cancelled",
  "request_fulfilled",
  "response_accepted",
  "response_declined",
  "response_withdrawn",
  "donation_reported",
  "donation_confirmed",
] as const;
export type NotificationType = (typeof notificationTypes)[number];
