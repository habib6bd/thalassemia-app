import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { PatientInput } from "@/features/patients/schema";

export function useMyPatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PatientInput) => {
      const { data, error } = await supabase.rpc("create_patient", {
        display_name: input.displayName,
        blood_group: input.bloodGroup,
        district_id: input.districtId,
        as_self: input.asSelf,
        area: input.area || undefined,
        treating_centre: input.treatingCentre || undefined,
        next_transfusion_date: input.nextTransfusionDate || undefined,
        thalassemia_type: input.thalassemiaType || undefined,
        show_treating_centre: input.showTreatingCentre,
        show_area: input.showArea,
        show_next_transfusion: input.showNextTransfusion,
        show_thalassemia_type: input.showThalassemiaType,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useUpdatePatient(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PatientInput>) => {
      const { data, error } = await supabase.rpc("update_patient", {
        patient_id: patientId,
        display_name: input.displayName,
        blood_group: input.bloodGroup,
        district_id: input.districtId,
        area: input.area || undefined,
        treating_centre: input.treatingCentre || undefined,
        next_transfusion_date: input.nextTransfusionDate || undefined,
        thalassemia_type: input.thalassemiaType || undefined,
        show_treating_centre: input.showTreatingCentre,
        show_area: input.showArea,
        show_next_transfusion: input.showNextTransfusion,
        show_thalassemia_type: input.showThalassemiaType,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      void queryClient.invalidateQueries({ queryKey: ["patients", patientId] });
    },
  });
}

export function useRotateInviteCode(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("rotate_invite_code", {
        patient_id: patientId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patients", patientId] });
    },
  });
}
