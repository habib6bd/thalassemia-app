import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, List, Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { PatientOrganizationCard } from "@/features/organizations/components/PatientOrganizationCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  usePatient,
  useRotateInviteCode,
  useUpdatePatient,
} from "@/features/patients/api";
import { PatientForm } from "@/features/patients/components/PatientForm";
import type { PatientInput } from "@/features/patients/schema";
import { mapSupabaseError } from "@/lib/errors";

export default function EditPatientScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientQuery = usePatient(id);
  const updatePatient = useUpdatePatient(id);
  const rotateInviteCode = useRotateInviteCode(id);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (patientQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!patientQuery.data) {
    return (
      <Screen>
        <ErrorText message={t("patients.notFound")} />
      </Screen>
    );
  }

  const patient = patientQuery.data;
  const defaultValues: PatientInput = {
    displayName: patient.display_name,
    bloodGroup: patient.blood_group,
    districtId: patient.district_id,
    area: patient.area ?? "",
    treatingCentre: patient.treating_centre ?? "",
    nextTransfusionDate: patient.next_transfusion_date ?? "",
    thalassemiaType: patient.thalassemia_type ?? "",
    asSelf: false,
    showTreatingCentre: patient.show_treating_centre,
    showArea: patient.show_area,
    showNextTransfusion: patient.show_next_transfusion,
    showThalassemiaType: patient.show_thalassemia_type,
  };

  const onShareCode = () => {
    void Share.share({
      message: t("network.shareMessage", {
        code: patient.invite_code,
        name: patient.display_name,
      }),
    });
  };

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Card>
          <Card.Content style={styles.inviteCard}>
            <Text variant="labelLarge">{t("network.inviteCode")}</Text>
            <Text variant="headlineSmall" style={styles.code}>
              {patient.invite_code}
            </Text>
            <View style={styles.inviteActions}>
              <PrimaryButton
                label={t("network.share")}
                onPress={onShareCode}
                mode="outlined"
              />
              <PrimaryButton
                label={t("network.rotateCode")}
                onPress={() => rotateInviteCode.mutate()}
                loading={rotateInviteCode.isPending}
                mode="outlined"
              />
            </View>
          </Card.Content>
        </Card>

        <Card>
          <List.Item
            title={t("patients.donationHistory")}
            left={(props) => <List.Icon {...props} icon="history" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/patients/history/[id]",
                params: { id: patient.id },
              })
            }
          />
          <List.Item
            title={t("patients.guardians")}
            left={(props) => <List.Icon {...props} icon="account-group" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/patients/guardians/[id]",
                params: { id: patient.id },
              })
            }
          />
        </Card>

        <PatientOrganizationCard
          patientId={patient.id}
          organizationId={patient.treating_organization_id}
        />

        <PatientForm
          defaultValues={defaultValues}
          submitLabel={t("common.save")}
          submitting={updatePatient.isPending}
          submitError={submitError}
          showAsSelfToggle={false}
          onSubmit={(values) => {
            setSubmitError(null);
            updatePatient.mutate(values, {
              onError: (error) => setSubmitError(mapSupabaseError(error)),
            });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  inviteCard: {
    gap: 8,
  },
  code: {
    letterSpacing: 4,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 8,
  },
});
