import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(8),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1).email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
