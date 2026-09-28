import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Text } from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { useOrgRequests } from "@/features/orgPortal/api";
import { bloodGroupLabels } from "@/lib/bloodGroups";
import { personName } from "@/lib/displayName";
import { mapSupabaseError } from "@/lib/errors";

export default function OrgRequestsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestsQuery = useOrgRequests(id);

  if (requestsQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={requestsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          requestsQuery.isError ? (
            <ErrorText message={mapSupabaseError(requestsQuery.error)} />
          ) : (
            <Text variant="bodyMedium" style={styles.intro}>
              {t("orgPortal.requestsHint")}
            </Text>
          )
        }
        ListEmptyComponent={<EmptyState title={t("orgPortal.noRequests")} />}
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/org/request/[id]",
                params: { id: item.id },
              })
            }
          >
            <Card.Content style={styles.content}>
              <Text variant="titleMedium">
                {personName(item.patient_display_name) ??
                  t("common.deletedUser")}
              </Text>
              <View style={styles.chips}>
                <Chip compact icon="water">
                  {bloodGroupLabels[item.blood_group]}
                </Chip>
                <Chip compact icon="information-outline">
                  {t(`requests.status.${item.status}`)}
                </Chip>
                {item.is_emergency ? (
                  <Chip compact icon="alert">
                    {t("orgPortal.emergency")}
                  </Chip>
                ) : null}
              </View>
              <Text variant="bodySmall">
                {t("orgPortal.requiredAt", {
                  date: new Date(item.required_at).toLocaleString(),
                })}
              </Text>
              <Text variant="bodySmall">
                {t("orgPortal.counts", {
                  units: item.units_needed,
                  accepted: item.accepted_count,
                  completed: item.completed_count,
                })}
              </Text>
            </Card.Content>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: 12,
  },
  card: {
    marginBottom: 8,
  },
  content: {
    gap: 6,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
