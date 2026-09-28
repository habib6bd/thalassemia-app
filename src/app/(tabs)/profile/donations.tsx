import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import {
  useHideAppreciation,
  useMyDonationHistory,
} from "@/features/history/api";
import { reachedMilestones } from "@/features/history/milestones";
import { mapSupabaseError } from "@/lib/errors";

export default function DonationHistoryScreen() {
  const { t } = useTranslation();
  const historyQuery = useMyDonationHistory();
  const hideAppreciation = useHideAppreciation();
  const [error, setError] = useState<string | null>(null);

  if (historyQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const donations = historyQuery.data ?? [];
  const milestones = reachedMilestones(donations.length);

  return (
    <Screen>
      <View style={styles.content}>
        {donations.length === 0 ? (
          <EmptyState
            title={t("donorProfile.donationHistoryEmptyTitle")}
            description={t("donorProfile.donationHistoryEmptyDescription")}
          />
        ) : (
          <FlatList
            data={donations}
            keyExtractor={(item) => item.donation_id}
            ListHeaderComponent={
              <View style={styles.header}>
                <Text variant="titleMedium">
                  {t("history.totalDonations", { count: donations.length })}
                </Text>
                <Text variant="labelLarge">{t("history.milestonesTitle")}</Text>
                <View style={styles.chipRow}>
                  {milestones.map((count) => (
                    <Chip key={count} icon="medal">
                      {t("history.milestone", { count })}
                    </Chip>
                  ))}
                </View>
                {error ? <ErrorText message={error} /> : null}
              </View>
            }
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  <Text variant="titleMedium">
                    {new Date(item.donated_on).toLocaleDateString()}
                  </Text>
                  {item.patient_display_name ? (
                    <Text variant="bodyMedium">
                      {t("history.forPatient", {
                        name: item.patient_display_name,
                      })}
                    </Text>
                  ) : null}
                  <Text variant="bodySmall">
                    {t(`donorProfile.verification.${item.verification}`)}
                  </Text>
                  {item.appreciation_id && item.appreciation_message ? (
                    <View style={styles.message}>
                      <Text variant="labelLarge">
                        {t("history.messageFromFamily")}
                      </Text>
                      <Text variant="bodyMedium">
                        {item.appreciation_message}
                      </Text>
                      <Button
                        compact
                        mode="text"
                        style={styles.hideButton}
                        onPress={() => {
                          setError(null);
                          hideAppreciation.mutate(
                            item.appreciation_id as string,
                            {
                              onError: (err) => setError(mapSupabaseError(err)),
                            },
                          );
                        }}
                      >
                        {t("history.hideMessage")}
                      </Button>
                    </View>
                  ) : null}
                </Card.Content>
              </Card>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  header: {
    gap: 8,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    gap: 4,
  },
  message: {
    marginTop: 8,
    gap: 4,
  },
  hideButton: {
    alignSelf: "flex-start",
  },
});
