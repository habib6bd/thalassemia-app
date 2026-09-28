import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import {
  useOrganization,
  useSetPatientOrganization,
} from "@/features/organizations/api";
import { organizationDisplayName } from "@/features/organizations/components/OrganizationCard";
import { mapSupabaseError } from "@/lib/errors";
import { useAppStore } from "@/stores/useAppStore";

type PatientOrganizationCardProps = {
  patientId: string;
  organizationId: string | null;
};

// Optional link to a verified directory entry; the free-text treating
// centre in the form below stays the fallback (phase-2 2d).
export function PatientOrganizationCard({
  patientId,
  organizationId,
}: PatientOrganizationCardProps) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const organizationQuery = useOrganization(organizationId);
  const setOrganization = useSetPatientOrganization(patientId);
  const [error, setError] = useState<string | null>(null);

  const organization = organizationQuery.data;

  return (
    <Card>
      <Card.Content style={styles.content}>
        <Text variant="labelLarge">{t("directory.patientCentreTitle")}</Text>
        <Text variant="bodyMedium">
          {organization
            ? organizationDisplayName(organization, language)
            : t("directory.patientCentreNone")}
        </Text>
        <Text variant="bodySmall" style={styles.hint}>
          {t("directory.patientCentreHint")}
        </Text>
        <View style={styles.actions}>
          <Button
            icon="magnify"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/directory",
                params: { pickFor: patientId, type: "treatment_centre" },
              })
            }
          >
            {organization
              ? t("directory.changeCentre")
              : t("directory.chooseCentre")}
          </Button>
          {organizationId ? (
            <Button
              icon="link-off"
              loading={setOrganization.isPending}
              onPress={() => {
                setError(null);
                setOrganization.mutate(null, {
                  onError: (err) => setError(mapSupabaseError(err)),
                });
              }}
            >
              {t("directory.removeCentre")}
            </Button>
          ) : null}
        </View>
        {error ? <ErrorText message={error} /> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 6,
  },
  hint: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
});
