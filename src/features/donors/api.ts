import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { DonorProfileInput } from "@/features/donors/schema";

export function useDonorProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["donor-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donor_profiles")
        .select("*")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertDonorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DonorProfileInput) => {
      const { data, error } = await supabase.rpc("upsert_donor_profile", {
        blood_group: input.bloodGroup,
        availability: input.availability,
        available_from: input.availableFrom || undefined,
        emergency_available: input.emergencyAvailable,
        searchable: input.searchable,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["donor-profile"] });
    },
  });
}

// Opt-in approximate location (Phase 4c). Only the donor can read it.
export function useDonorLocation(userId: string | undefined) {
  return useQuery({
    queryKey: ["donor-location", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donor_locations")
        .select("latitude, longitude, updated_at")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSetDonorLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      point: { latitude: number; longitude: number } | null,
    ) => {
      const { error } = await supabase.rpc("set_donor_location", {
        // Nulls stop sharing; the generated types model the args as numbers.
        latitude: (point?.latitude ?? null) as number,
        longitude: (point?.longitude ?? null) as number,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["donor-location"] });
    },
  });
}

export function useSetAvailabilityReminders(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("donor_profiles")
        .update({ availability_reminders: enabled })
        .eq("user_id", userId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["donor-profile"] });
    },
  });
}
