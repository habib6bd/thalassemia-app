import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Text, TextInput } from "react-native-paper";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Disclaimer } from "@/components/Disclaimer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { StatusChip } from "@/components/StatusChip";
import {
  useOrgConfirmDonation,
  useOrgRequestResponses,
} from "@/features/orgPortal/api";
import { requestStatusTone } from "@/features/requests/statusTone";
import { personName } from "@/lib/displayName";
import { mapSupabaseError } from "@/lib/errors";

// Staff confirm donations that happened at their organization; the record
// is saved as "organization-verified" (§7.3, Q7).
export default function OrgRequestScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const responsesQuery = useOrgRequestResponses(id);
  const confirmDonation = useOrgConfirmDonation();
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [donatedOn, setDonatedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);

  if (responsesQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={responsesQuery.data ?? []}
        keyExtractor={(item) => item.response_id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Disclaimer textKey="orgPortal.confirmHint" />
            {responsesQuery.isError ? (
              <ErrorText message={mapSupabaseError(responsesQuery.error)} />
            ) : null}
            {error ? <ErrorText message={error} /> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState title={t("orgPortal.noResponses")} />}
        renderItem={({ item }) => {
          const canConfirm =
            item.status === "accepted" || item.status === "donation_pending";
          return (
            <Card style={styles.card}>
              <Card.Content style={styles.content}>
                <View style={styles.row}>
                  <Text variant="titleMedium" style={styles.flex}>
                    {personName(item.donor_display_name) ??
                      t("common.deletedUser")}
                  </Text>
                  <StatusChip
                    label={t(`requests.responseStatus.${item.status}`)}
                    tone={requestStatusTone(item.status)}
                  />
                </View>
                {item.scheduled_at ? (
                  <Text variant="bodySmall">
                    {t("requests.scheduledFor", {
                      date: new Date(item.scheduled_at).toLocaleString(),
                    })}
                  </Text>
                ) : null}
                {item.donor_reported_donated_at ? (
                  <Text variant="bodySmall">
                    {t("requests.donorReportedDonated")}
                  </Text>
                ) : null}
                {canConfirm ? (
                  <>
                    <TextInput
                      label={t("requests.donatedOnLabel")}
                      placeholder="YYYY-MM-DD"
                      value={donatedOn}
                      onChangeText={setDonatedOn}
                      mode="outlined"
                    />
                    <PrimaryButton
                      label={t("orgPortal.confirmDonation")}
                      icon="check-decagram"
                      mode="outlined"
                      onPress={() => setConfirmFor(item.response_id)}
                    />
                  </>
                ) : null}
              </Card.Content>
            </Card>
          );
        }}
      />

      <ConfirmDialog
        visible={!!confirmFor}
        title={t("orgPortal.confirmTitle")}
        description={t("orgPortal.confirmBody", { date: donatedOn })}
        confirmLabel={t("orgPortal.confirmDonation")}
        loading={confirmDonation.isPending}
        onDismiss={() => setConfirmFor(null)}
        onConfirm={() => {
          if (!confirmFor) return;
          setError(null);
          confirmDonation.mutate(
            { responseId: confirmFor, donatedOn },
            {
              onSuccess: () => setConfirmFor(null),
              onError: (err) => {
                setConfirmFor(null);
                setError(mapSupabaseError(err));
              },
            },
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    marginBottom: 8,
  },
  content: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
