import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, View } from "react-native";
import { ActivityIndicator, List, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  useOrganization,
  useSetPatientOrganization,
} from "@/features/organizations/api";
import { OrganizationCard } from "@/features/organizations/components/OrganizationCard";
import { mapSupabaseError } from "@/lib/errors";

export default function OrganizationDetailScreen() {
  const { t } = useTranslation();
  const { id, pickFor } = useLocalSearchParams<{
    id: string;
    pickFor?: string;
  }>();
  const organizationQuery = useOrganization(id);
  const setPatientOrganization = useSetPatientOrganization(pickFor ?? "");
  const [error, setError] = useState<string | null>(null);

  if (organizationQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const organization = organizationQuery.data;
  if (!organization) {
    return (
      <Screen>
        <ErrorText message={t("errors.not_found")} />
      </Screen>
    );
  }

  const hasMap =
    organization.latitude !== null && organization.longitude !== null;

  return (
    <Screen scroll>
      <View style={styles.content}>
        <OrganizationCard organization={organization} />

        {organization.services ? (
          <List.Item
            title={t("directory.services")}
            description={organization.services}
            descriptionNumberOfLines={10}
            left={(props) => <List.Icon {...props} icon="medical-bag" />}
          />
        ) : null}
        {organization.opening_hours ? (
          <List.Item
            title={t("directory.openingHours")}
            description={organization.opening_hours}
            descriptionNumberOfLines={4}
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
          />
        ) : null}
        {organization.phone ? (
          <List.Item
            title={t("directory.call")}
            description={organization.phone}
            left={(props) => <List.Icon {...props} icon="phone" />}
            onPress={() => void Linking.openURL(`tel:${organization.phone}`)}
          />
        ) : null}
        {organization.website ? (
          <List.Item
            title={t("directory.website")}
            description={organization.website}
            left={(props) => <List.Icon {...props} icon="web" />}
            onPress={() => void Linking.openURL(organization.website as string)}
          />
        ) : null}
        {hasMap ? (
          <List.Item
            title={t("directory.openMap")}
            left={(props) => <List.Icon {...props} icon="map-marker" />}
            onPress={() =>
              void Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${organization.latitude},${organization.longitude}`,
              )
            }
          />
        ) : null}

        <Disclaimer textKey="directory.detailDisclaimer" />

        {pickFor ? (
          <>
            <Text variant="bodyMedium">{t("directory.pickHint")}</Text>
            <PrimaryButton
              label={t("directory.useAsTreatingCentre")}
              icon="check"
              loading={setPatientOrganization.isPending}
              onPress={() => {
                setError(null);
                setPatientOrganization.mutate(organization.id, {
                  onSuccess: () =>
                    router.navigate({
                      pathname: "/(tabs)/patients/[id]",
                      params: { id: pickFor },
                    }),
                  onError: (err) => setError(mapSupabaseError(err)),
                });
              }}
            />
          </>
        ) : null}
        {error ? <ErrorText message={error} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
  },
});
