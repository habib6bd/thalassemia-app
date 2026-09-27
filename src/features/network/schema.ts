import { z } from "zod";

// 8-char unambiguous alphabet, see generate_invite_code() in the DB.
export const inviteCodeSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/, "invalid_invite_code"),
});
export type InviteCodeInput = z.infer<typeof inviteCodeSchema>;
