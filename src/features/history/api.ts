import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export function useMyDonationHistory() {
  return useQuery({
    queryKey: ["donation-history", "me"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_donation_history");
      if (error) throw error;
      return data;
    },
  });
}

export function usePatientDonationHistory(patientId: string | undefined) {
  return useQuery({
    queryKey: ["donation-history", "patient", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_patient_donation_history",
        {
          patient_id: patientId as string,
        },
      );
      if (error) throw error;
      return data;
    },
  });
}

export function useSendAppreciation(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      donationId,
      message,
    }: {
      donationId: string;
      message: string;
    }) => {
      const { error } = await supabase.rpc("send_appreciation", {
        donation_id: donationId,
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["donation-history", "patient", patientId],
      });
    },
  });
}

export function useHideAppreciation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appreciationId: string) => {
      const { error } = await supabase.rpc("hide_appreciation", {
        appreciation_id: appreciationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["donation-history", "me"],
      });
    },
  });
}
