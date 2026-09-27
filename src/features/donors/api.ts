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
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["donor-profile"] });
    },
  });
}
