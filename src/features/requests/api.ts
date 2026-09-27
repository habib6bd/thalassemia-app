import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { BloodRequestInput } from "@/features/requests/schema";

// === Manager side (direct table access; RLS scopes to the caller's own patients) ===

export function useMyRequests() {
  return useQuery({
    queryKey: ["blood-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: ["blood-requests", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("id", requestId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestResponses(requestId: string | undefined) {
  return useQuery({
    queryKey: ["donor-responses", "request", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donor_responses")
        .select("*")
        .eq("request_id", requestId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateRequests(requestId?: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["blood-requests"] });
    if (requestId) {
      void queryClient.invalidateQueries({
        queryKey: ["donor-responses", "request", requestId],
      });
    }
  };
}

export function useCreateBloodRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: async (input: BloodRequestInput) => {
      const { data, error } = await supabase.rpc("create_blood_request", {
        patient_id: input.patientId,
        required_at: input.requiredAt,
        treating_centre: input.treatingCentre,
        district_id: input.districtId,
        area: input.area || undefined,
        units_needed: input.unitsNeeded,
        component: input.component || undefined,
        is_emergency: input.isEmergency,
        notes: input.notes || undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

// The 3-step wizard's last step: create the draft, then publish it in the
// same action ("review and publish" — the user never sees the draft as a
// separate state).
export function useCreateAndPublishBloodRequest() {
  const invalidate = useInvalidateRequests();
  return useMutation({
    mutationFn: async (input: BloodRequestInput) => {
      const { data: draft, error } = await supabase.rpc(
        "create_blood_request",
        {
          patient_id: input.patientId,
          required_at: input.requiredAt,
          treating_centre: input.treatingCentre,
          district_id: input.districtId,
          area: input.area || undefined,
          units_needed: input.unitsNeeded,
          component: input.component || undefined,
          is_emergency: input.isEmergency,
          notes: input.notes || undefined,
        },
      );
      if (error) throw error;

      const { data: published, error: publishError } = await supabase.rpc(
        "publish_blood_request",
        {
          request_id: draft.id,
        },
      );
      if (publishError) throw publishError;
      return published;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateBloodRequest(requestId: string) {
  const invalidate = useInvalidateRequests(requestId);
  return useMutation({
    mutationFn: async (input: Partial<BloodRequestInput>) => {
      const { data, error } = await supabase.rpc("update_blood_request", {
        request_id: requestId,
        required_at: input.requiredAt,
        treating_centre: input.treatingCentre,
        district_id: input.districtId,
        area: input.area || undefined,
        units_needed: input.unitsNeeded,
        component: input.component || undefined,
        is_emergency: input.isEmergency,
        notes: input.notes || undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function usePublishBloodRequest(requestId: string) {
  const invalidate = useInvalidateRequests(requestId);
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("publish_blood_request", {
        request_id: requestId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useCancelBloodRequest(requestId: string) {
  const invalidate = useInvalidateRequests(requestId);
  return useMutation({
    mutationFn: async (reason?: string) => {
      const { data, error } = await supabase.rpc("cancel_blood_request", {
        request_id: requestId,
        reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useConfirmDonation(requestId: string) {
  const invalidate = useInvalidateRequests(requestId);
  return useMutation({
    mutationFn: async ({
      responseId,
      donatedOn,
    }: {
      responseId: string;
      donatedOn: string;
    }) => {
      const { data, error } = await supabase.rpc("confirm_donation", {
        response_id: responseId,
        donated_on: donatedOn,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useResponseContact(responseId: string | undefined) {
  return useQuery({
    queryKey: ["response-contact", responseId],
    enabled: !!responseId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_response_contact", {
        response_id: responseId as string,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    // Contact is only revealed post-accept and can 404/deny before that —
    // don't retry on failure, just show nothing.
    retry: false,
  });
}

// === Donor side ===

export function useMyResponse(responseId: string | undefined) {
  return useQuery({
    queryKey: ["donor-responses", responseId],
    enabled: !!responseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donor_responses")
        .select("*")
        .eq("id", responseId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestForDonor(requestId: string | undefined) {
  return useQuery({
    queryKey: ["request-for-donor", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_request_for_donor", {
        request_id: requestId as string,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useDonorInbox(donorId: string | undefined) {
  return useQuery({
    queryKey: ["donor-inbox", donorId],
    enabled: !!donorId,
    queryFn: async () => {
      const { data: responses, error } = await supabase
        .from("donor_responses")
        .select("*")
        .eq("donor_id", donorId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const requests = await Promise.all(
        responses.map(async (response) => {
          const { data, error: rpcError } = await supabase.rpc(
            "get_request_for_donor",
            {
              request_id: response.request_id,
            },
          );
          if (rpcError) return null;
          return data?.[0] ?? null;
        }),
      );

      type InboxRow = {
        response: (typeof responses)[number];
        request: NonNullable<(typeof requests)[number]>;
      };

      return responses
        .map((response, i) => ({ response, request: requests[i] }))
        .filter((row): row is InboxRow => row.request !== null);
    },
  });
}

function useInvalidateDonorInbox(responseId?: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["donor-inbox"] });
    if (responseId) {
      void queryClient.invalidateQueries({
        queryKey: ["response-contact", responseId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["donor-responses", responseId],
      });
      void queryClient.invalidateQueries({ queryKey: ["request-for-donor"] });
    }
  };
}

export function useRespondToRequest(responseId: string) {
  const invalidate = useInvalidateDonorInbox(responseId);
  return useMutation({
    mutationFn: async ({
      accept,
      reason,
    }: {
      accept: boolean;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc("respond_to_request", {
        response_id: responseId,
        accept,
        reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useScheduleDonation(responseId: string) {
  const invalidate = useInvalidateDonorInbox(responseId);
  return useMutation({
    mutationFn: async (scheduledAt: string) => {
      const { data, error } = await supabase.rpc("schedule_donation", {
        response_id: responseId,
        scheduled_at: scheduledAt,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useWithdrawResponse(responseId: string) {
  const invalidate = useInvalidateDonorInbox(responseId);
  return useMutation({
    mutationFn: async (reason?: string) => {
      const { data, error } = await supabase.rpc("withdraw_response", {
        response_id: responseId,
        reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useReportDonated(responseId: string) {
  const invalidate = useInvalidateDonorInbox(responseId);
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("report_donated", {
        response_id: responseId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useMyDonations(donorId: string | undefined) {
  return useQuery({
    queryKey: ["donations", donorId],
    enabled: !!donorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_id", donorId as string)
        .order("donated_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
