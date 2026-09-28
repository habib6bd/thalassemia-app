import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

// Organization staff portal (Phase 4b). Every RPC re-checks that the caller
// is staff of the (verified) organization linked to the request.

export function useMyOrganizations(enabled: boolean) {
  return useQuery({
    queryKey: ["org-my-organizations"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("org_my_organizations");
      if (error) throw error;
      return data;
    },
  });
}

export function useOrgRequests(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["org-requests", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("org_list_requests", {
        organization_id: organizationId as string,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useOrgRequestResponses(requestId: string | undefined) {
  return useQuery({
    queryKey: ["org-request-responses", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("org_list_request_responses", {
        request_id: requestId as string,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useOrgConfirmDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { responseId: string; donatedOn: string }) => {
      const { data, error } = await supabase.rpc("org_confirm_donation", {
        response_id: input.responseId,
        donated_on: input.donatedOn,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-requests"] });
      void queryClient.invalidateQueries({
        queryKey: ["org-request-responses"],
      });
    },
  });
}

// === admin: members ===========================================================
export function useOrganizationMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["org-members", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_list_organization_members",
        { organization_id: organizationId as string },
      );
      if (error) throw error;
      return data;
    },
  });
}

export function useSetOrganizationMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; member: boolean }) => {
      const { error } = await supabase.rpc("admin_set_organization_member", {
        organization_id: organizationId,
        user_id: input.userId,
        member: input.member,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["org-members", organizationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
