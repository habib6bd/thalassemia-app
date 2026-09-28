import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Screen } from "@/components/Screen";
import { useCreatePatient } from "@/features/patients/api";
import { PatientForm } from "@/features/patients/components/PatientForm";
import type { PatientInput } from "@/features/patients/schema";
import { useMyRoles } from "@/features/profile/api";
import { mapSupabaseError } from "@/lib/errors";
import { useAppStore } from "@/stores/useAppStore";

const defaultValues: PatientInput = {
  displayName: "",
  bloodGroup: "O_POS",
  districtId: undefined as unknown as number,
  area: "",
  treatingCentre: "",
  nextTransfusionDate: "",
  thalassemiaType: "",
  asSelf: false,
  showTreatingCentre: true,
  showArea: true,
  showNextTransfusion: true,
  showThalassemiaType: false,
};

export default function NewPatientScreen() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const rolesQuery = useMyRoles(session?.user.id);
  const createPatient = useCreatePatient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <Screen scroll>
      <PatientForm
        defaultValues={defaultValues}
        submitLabel={t("common.save")}
        submitting={createPatient.isPending}
        submitError={submitError}
        showAsSelfToggle={(rolesQuery.data ?? []).includes("patient")}
        onSubmit={(values) => {
          setSubmitError(null);
          createPatient.mutate(values, {
            onSuccess: () => router.back(),
            onError: (error) => setSubmitError(mapSupabaseError(error)),
          });
        }}
      />
    </Screen>
  );
}
