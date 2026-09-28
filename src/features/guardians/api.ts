import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export function usePatientManagers(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-managers", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_patient_managers", {
        patient_id: patientId as string,
      });
      if (error) throw error;
      return data;
    },
  });
}

// Unused, unexpired codes only; RLS limits rows to managers of the patient.
export function usePendingGuardianInvites(patientId: string | undefined) {
  return useQuery({
    queryKey: ["guardian-invites", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardian_invites")
        .select("id, code, expires_at")
        .eq("patient_id", patientId as string)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGuardianInvite(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_guardian_invite", {
        patient_id: patientId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["guardian-invites", patientId],
      });
    },
  });
}

export function useRevokeGuardianInvite(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.rpc("revoke_guardian_invite", {
        invite_id: inviteId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["guardian-invites", patientId],
      });
    },
  });
}

export function useRemovePatientManager(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("remove_patient_manager", {
        patient_id: patientId,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["patient-managers", patientId],
      });
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useAcceptGuardianInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("accept_guardian_invite", {
        code,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      void queryClient.invalidateQueries({ queryKey: ["user-roles"] });
    },
  });
}
