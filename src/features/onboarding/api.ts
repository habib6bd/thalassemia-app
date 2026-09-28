import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { OnboardingInput } from "@/features/onboarding/schema";

export function useDistricts() {
  return useQuery({
    queryKey: ["districts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("districts")
        .select("id, name_bn, name_en, division_id")
        .order("id");
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });
}

export function useDivisions() {
  return useQuery({
    queryKey: ["divisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("divisions")
        .select("id, name_bn, name_en")
        .order("id");
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: OnboardingInput) => {
      const { data, error } = await supabase.rpc("complete_onboarding", {
        roles: input.roles,
        display_name: input.displayName,
        phone: input.phone || undefined,
        district_id: input.districtId,
        area: input.area || undefined,
        language: input.language,
        share_contact_on_accept: input.shareContactOnAccept,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
