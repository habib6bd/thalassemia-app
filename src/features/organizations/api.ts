import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  OrganizationInput,
  OrganizationType,
  VerificationInput,
} from "@/features/organizations/schema";
import { supabase } from "@/lib/supabase";

// Columns users may read (the rest are admin-only, see the migration grants).
const directoryColumns =
  "id, name, name_bn, type, address, district_id, latitude, longitude, phone, website, services, opening_hours, verification_status, last_verified_at";

// RLS returns only verified entries to users; the filter keeps admins'
// directory view the same as everyone else's.
export function useDirectory(filters: {
  type: OrganizationType | null;
  districtId: number | null;
}) {
  return useQuery({
    queryKey: ["directory", filters.type, filters.districtId],
    queryFn: async () => {
      let query = supabase
        .from("organizations")
        .select(directoryColumns)
        .eq("verification_status", "verified")
        .order("name");
      if (filters.type) query = query.eq("type", filters.type);
      if (filters.districtId)
        query = query.eq("district_id", filters.districtId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useOrganization(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["organization", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(directoryColumns)
        .eq("id", organizationId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSetPatientOrganization(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (organizationId: string | null) => {
      const { error } = await supabase.rpc("set_patient_organization", {
        patient_id: patientId,
        // A null clears the link; the generated types model it as string.
        organization_id: organizationId as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

// === admin ===================================================================
export function useAdminOrganizations(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-organizations"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_organizations");
      if (error) throw error;
      return data;
    },
  });
}

function blankToUndefined(value: string | undefined) {
  return value ? value : undefined;
}

export function useUpsertOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: OrganizationInput & { organizationId: string | null },
    ) => {
      const { data, error } = await supabase.rpc("admin_upsert_organization", {
        organization_id: input.organizationId as string,
        name: input.name,
        name_bn: blankToUndefined(input.nameBn),
        type: input.type,
        district_id: input.districtId,
        address: blankToUndefined(input.address),
        latitude: input.latitude ? Number(input.latitude) : undefined,
        longitude: input.longitude ? Number(input.longitude) : undefined,
        phone: blankToUndefined(input.phone),
        website: blankToUndefined(input.website),
        services: blankToUndefined(input.services),
        opening_hours: blankToUndefined(input.openingHours),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      void queryClient.invalidateQueries({ queryKey: ["directory"] });
      void queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}

export function useSetOrganizationVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: VerificationInput & { organizationId: string },
    ) => {
      const { error } = await supabase.rpc(
        "admin_set_organization_verification",
        {
          organization_id: input.organizationId,
          status: input.status,
          method: input.status === "verified" ? input.method : undefined,
          note: blankToUndefined(input.note),
        },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      void queryClient.invalidateQueries({ queryKey: ["directory"] });
      void queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });
}
