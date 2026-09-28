import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type {
  ForgotPasswordInput,
  SignInInput,
  SignUpInput,
} from "@/features/auth/schema";

export function useSignUp() {
  return useMutation({
    mutationFn: async ({ email, password }: SignUpInput) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: SignInInput) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async ({ email }: ForgotPasswordInput) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
  });
}

export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
    },
  });
}
