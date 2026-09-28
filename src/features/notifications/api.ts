import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { supabase } from "@/lib/supabase";
import type { NotificationType } from "@/features/notifications/types";
import { useAppStore } from "@/stores/useAppStore";

export function useNotifications() {
  const session = useAppStore((state) => state.session);
  return useQuery({
    queryKey: ["notifications"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  const notificationsQuery = useNotifications();
  return notificationsQuery.data?.filter((n) => !n.read_at).length ?? 0;
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("mark_notification_read", { id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_all_notifications_read");
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// Notifications only ever carry entity_type/entity_id (never which route a
// donor vs. a manager should land on — the same request notifies both), so
// resolve the right screen by checking whether the tapping user has their
// own donor_responses row for that request.
export async function navigateToNotificationTarget(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return;

  if (entityType === "patient_donor_connection") {
    router.push("/(tabs)/network");
    return;
  }

  if (entityType === "donation") {
    router.push("/(tabs)/profile/donations");
    return;
  }

  if (entityType === "patient") {
    router.push({ pathname: "/(tabs)/patients/guardians/[id]", params: { id: entityId } });
    return;
  }

  if (entityType === "blood_request") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: response } = await supabase
        .from("donor_responses")
        .select("id")
        .eq("request_id", entityId)
        .eq("donor_id", user.id)
        .maybeSingle();
      if (response) {
        router.push({ pathname: "/(tabs)/requests/response/[id]", params: { id: response.id } });
        return;
      }
    }
    router.push({ pathname: "/(tabs)/requests/[id]", params: { id: entityId } });
  }
}

export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ["notification-preferences", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId as string);
      if (error) throw error;
      return data;
    },
  });
}

export function useSetNotificationPreference(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, pushEnabled }: { type: NotificationType; pushEnabled: boolean }) => {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: userId, type, push_enabled: pushEnabled },
          { onConflict: "user_id,type" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notification-preferences", userId] });
    },
  });
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: async ({ token, platform }: { token: string; platform: string }) => {
      const { error } = await supabase.rpc("register_push_token", { token, platform });
      if (error) throw error;
    },
  });
}
