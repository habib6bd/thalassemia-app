import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type AppRole = Database["public"]["Enums"]["app_role"];

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId as string);
      if (error) throw error;
      return data.map((row) => row.role);
    },
  });
}

export function useAddRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      role: Extract<AppRole, "patient" | "guardian" | "donor">,
    ) => {
      const { error } = await supabase.rpc("add_role", { role });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-roles"] });
    },
  });
}
