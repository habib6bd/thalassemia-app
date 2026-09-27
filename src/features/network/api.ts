import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type ConnectionTier = Database["public"]["Enums"]["connection_tier"];
type ConnectionStatus = Database["public"]["Enums"]["connection_status"];

export function useConnections() {
  return useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_donor_connections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Donor-side display names for connected patients (RLS: patient_cards_for_donor
// only returns rows the caller is actually connected to or manages).
export function usePatientCards(patientIds: string[]) {
  return useQuery({
    queryKey: ["patient-cards", patientIds],
    enabled: patientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_cards_for_donor")
        .select("*")
        .in("id", patientIds);
      if (error) throw error;
      return data;
    },
  });
}

// Manager-side display names for connected donors.
export function usePublicProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ["public-profiles", userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("*")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
  });
}

export function useDonorProfiles(donorIds: string[]) {
  return useQuery({
    queryKey: ["donor-profiles", donorIds],
    enabled: donorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donor_profiles")
        .select("*")
        .in("user_id", donorIds);
      if (error) throw error;
      return data;
    },
  });
}

export function useConnectionParties(connectionId: string | undefined) {
  return useQuery({
    queryKey: ["connection-parties", connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_connection_parties", {
        connection_id: connectionId as string,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useMaxConnectedDonors() {
  return useQuery({
    queryKey: ["app-settings", "max_connected_donors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "max_connected_donors")
        .single();
      if (error) throw error;
      return Number(data.value) || 6;
    },
    staleTime: Infinity,
  });
}

function useInvalidateConnections() {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({ queryKey: ["connections"] });
}

export function useRequestConnectionByCode() {
  const invalidate = useInvalidateConnections();
  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const { data, error } = await supabase.rpc("request_connection_by_code", {
        invite_code: inviteCode,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useRespondConnection() {
  const invalidate = useInvalidateConnections();
  return useMutation({
    mutationFn: async ({
      connectionId,
      accept,
      tier,
    }: {
      connectionId: string;
      accept: boolean;
      tier?: ConnectionTier;
    }) => {
      const { data, error } = await supabase.rpc("respond_connection", {
        connection_id: connectionId,
        accept,
        tier,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useCancelConnectionRequest() {
  const invalidate = useInvalidateConnections();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.rpc("cancel_connection_request", {
        connection_id: connectionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useSetConnectionStatus() {
  const invalidate = useInvalidateConnections();
  return useMutation({
    mutationFn: async ({
      connectionId,
      newStatus,
      reason,
    }: {
      connectionId: string;
      newStatus: Extract<ConnectionStatus, "paused" | "active" | "removed">;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc("set_connection_status", {
        connection_id: connectionId,
        new_status: newStatus,
        reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useSetConnectionTier() {
  const invalidate = useInvalidateConnections();
  return useMutation({
    mutationFn: async ({
      connectionId,
      tier,
    }: {
      connectionId: string;
      tier: ConnectionTier;
    }) => {
      const { data, error } = await supabase.rpc("set_connection_tier", {
        connection_id: connectionId,
        tier,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}
