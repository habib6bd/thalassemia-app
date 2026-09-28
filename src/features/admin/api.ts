import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useMyRoles } from "@/features/profile/api";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/useAppStore";

// UI gate only; every admin RPC re-checks is_admin() on the server.
export function useIsAdmin() {
  const session = useAppStore((state) => state.session);
  const rolesQuery = useMyRoles(session?.user.id);
  return {
    isAdmin: (rolesQuery.data ?? []).includes("admin"),
    isPending: rolesQuery.isPending,
  };
}

export type RequestOverview = {
  by_status: Record<string, number>;
  open_emergencies: number;
  created_last_7_days: number;
  created_last_30_days: number;
  fulfilled_last_30_days: number;
  donations_last_30_days: number;
  open_reports: number;
  organizations_pending: number;
};

export function useRequestOverview(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-overview"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_request_overview");
      if (error) throw error;
      return data as unknown as RequestOverview;
    },
  });
}

export function useAdminUsers(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-users", query],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_search_users", {
        query: query || undefined,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      role: "organization" | "admin";
      granted: boolean;
    }) => {
      const { error } = await supabase.rpc("admin_set_user_role", {
        user_id: input.userId,
        role: input.role,
        granted: input.granted,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useAppSettings(enabled: boolean) {
  return useQuery({
    queryKey: ["app-settings"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value, description, updated_at")
        .order("key");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { key: string; value: number }) => {
      const { error } = await supabase.rpc("admin_update_setting", {
        key: input.key,
        value: input.value,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });
}
