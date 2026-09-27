import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function PatientsLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: t("patients.myPatients") }}
      />
      <Stack.Screen name="new" options={{ title: t("patients.addPatient") }} />
      <Stack.Screen
        name="[id]"
        options={{ title: t("patients.editPatient") }}
      />
    </Stack>
  );
}
