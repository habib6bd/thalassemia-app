import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  SegmentedButtons,
  Text,
  useTheme,
} from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { useAnalytics, type Analytics } from "@/features/admin/api";
import { AdminGate } from "@/features/admin/components/AdminGate";
import { localized } from "@/features/learn/categories";
import { useDivisions } from "@/features/onboarding/api";
import { mapSupabaseError } from "@/lib/errors";
import { useAppStore } from "@/stores/useAppStore";

const periods = [7, 30, 90, 365] as const;

type CountKey = {
  [K in keyof Analytics]: Analytics[K] extends number | null ? K : never;
}[keyof Analytics];

const tiles: { key: CountKey; label: string }[] = [
  { key: "active_patients", label: "activePatients" },
  { key: "active_donors", label: "activeDonors" },
  { key: "patients_with_network", label: "patientsWithNetwork" },
  { key: "active_connections", label: "activeConnections" },
  { key: "requests_created", label: "requestsCreated" },
  { key: "emergency_requests", label: "emergencyRequests" },
  { key: "requests_fulfilled", label: "requestsFulfilled" },
  { key: "completed_donations", label: "completedDonations" },
  { key: "org_verified_donations", label: "orgVerifiedDonations" },
  { key: "community_posts", label: "communityPosts" },
  { key: "community_reports", label: "communityReports" },
  { key: "content_views", label: "contentViews" },
];

export default function AdminAnalyticsScreen() {
  return (
    <AdminGate>
      <AdminAnalytics />
    </AdminGate>
  );
}

function AdminAnalytics() {
  const { t } = useTranslation();
  const theme = useTheme();
  const language = useAppStore((state) => state.language);
  const [period, setPeriod] = useState<(typeof periods)[number]>(30);
  const analyticsQuery = useAnalytics(period, true);
  const divisionsQuery = useDivisions();
  const data = analyticsQuery.data;

  // null = hidden small count (1..min-1), shown as "fewer than N".
  const show = (value: number | null | undefined) =>
    value === null || value === undefined
      ? t("analytics.fewerThan", { count: data?.min_cell_size ?? 5 })
      : value.toLocaleString();

  const tileStyle = [
    styles.tile,
    { backgroundColor: theme.colors.surfaceVariant },
  ];

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Text variant="bodyMedium">{t("analytics.intro")}</Text>
        <SegmentedButtons
          value={String(period)}
          onValueChange={(value) =>
            setPeriod(Number(value) as (typeof periods)[number])
          }
          buttons={periods.map((days) => ({
            value: String(days),
            label: t("analytics.days", { count: days }),
          }))}
        />

        {analyticsQuery.isPending ? <ActivityIndicator /> : null}
        {analyticsQuery.isError ? (
          <ErrorText message={mapSupabaseError(analyticsQuery.error)} />
        ) : null}

        {data ? (
          <>
            <View style={styles.row}>
              <View style={tileStyle}>
                <Text variant="labelLarge" style={styles.tileLabel}>
                  {t("analytics.fulfilmentRate")}
                </Text>
                <Text variant="headlineMedium">
                  {data.fulfilment_rate === null
                    ? t("analytics.notEnoughData")
                    : `${Math.round(data.fulfilment_rate * 100)}%`}
                </Text>
              </View>
              <View style={tileStyle}>
                <Text variant="labelLarge" style={styles.tileLabel}>
                  {t("analytics.medianResponse")}
                </Text>
                <Text variant="headlineMedium">
                  {data.median_first_response_minutes === null
                    ? t("analytics.notEnoughData")
                    : t("analytics.minutes", {
                        count: data.median_first_response_minutes,
                      })}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              {tiles.map((tile) => (
                <View key={tile.key} style={tileStyle}>
                  <Text variant="labelLarge" style={styles.tileLabel}>
                    {t(`analytics.${tile.label}`)}
                  </Text>
                  <Text variant="headlineSmall">{show(data[tile.key])}</Text>
                </View>
              ))}
            </View>

            <Card>
              <Card.Title title={t("analytics.byDivision")} />
              <Card.Content style={styles.list}>
                {data.requests_by_division.length === 0 ? (
                  <Text variant="bodyMedium">{t("analytics.none")}</Text>
                ) : null}
                {data.requests_by_division.map((row) => {
                  const division = divisionsQuery.data?.find(
                    (d) => d.id === row.division_id,
                  );
                  return (
                    <View key={row.division_id} style={styles.listRow}>
                      <Text variant="bodyMedium" style={styles.flex}>
                        {division
                          ? localized(
                              language,
                              division.name_bn,
                              division.name_en,
                            )
                          : row.division_id}
                      </Text>
                      <Text variant="titleSmall">{show(row.requests)}</Text>
                    </View>
                  );
                })}
              </Card.Content>
            </Card>

            <Card>
              <Card.Title title={t("analytics.topContent")} />
              <Card.Content style={styles.list}>
                {data.top_content.length === 0 ? (
                  <Text variant="bodyMedium">{t("analytics.none")}</Text>
                ) : null}
                {data.top_content.map((row) => (
                  <View key={row.content_id} style={styles.listRow}>
                    <Text variant="bodyMedium" style={styles.flex}>
                      {localized(language, row.title_bn, row.title_en)}
                    </Text>
                    <Text variant="titleSmall">{show(row.views)}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>

            <Text variant="bodySmall">
              {t("analytics.privacyNote", { count: data.min_cell_size })}
            </Text>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    minHeight: 88,
  },
  tileLabel: {
    opacity: 0.8,
  },
  list: {
    gap: 8,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 32,
  },
  flex: {
    flex: 1,
  },
});
