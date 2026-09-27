import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, View } from "react-native";
import { Card, Text, TextInput } from "react-native-paper";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StatusChip } from "@/components/StatusChip";
import {
  useConfirmDonation,
  useResponseContact,
} from "@/features/requests/api";
import { requestStatusTone } from "@/features/requests/statusTone";
import { mapSupabaseError } from "@/lib/errors";
import type { Database } from "@/lib/database.types";

type DonorResponse = Database["public"]["Tables"]["donor_responses"]["Row"];

type ResponseRowProps = {
  response: DonorResponse;
  requestId: string;
  donorName: string | undefined;
};

export function ResponseRow({
  response,
  requestId,
  donorName,
}: ResponseRowProps) {
  const { t } = useTranslation();
  const contactQuery = useResponseContact(
    ["accepted", "donation_pending", "completed"].includes(response.status)
      ? response.id
      : undefined,
  );
  const confirmDonation = useConfirmDonation(requestId);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [donatedOn, setDonatedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);

  const canConfirm =
    response.status === "accepted" || response.status === "donation_pending";

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleMedium">{donorName ?? "—"}</Text>
          <StatusChip
            label={t(`requests.responseStatus.${response.status}`)}
            tone={requestStatusTone(response.status)}
          />
        </View>

        {response.scheduled_at ? (
          <Text variant="bodySmall">
            {t("requests.scheduledFor", {
              date: new Date(response.scheduled_at).toLocaleString(),
            })}
          </Text>
        ) : null}

        {response.donor_reported_donated_at ? (
          <Text variant="bodySmall">{t("requests.donorReportedDonated")}</Text>
        ) : null}

        {contactQuery.data?.donor_phone ? (
          <Text
            variant="bodySmall"
            onPress={() =>
              void Linking.openURL(`tel:${contactQuery.data?.donor_phone}`)
            }
            style={styles.phone}
          >
            {t("requests.contactPhone", {
              phone: contactQuery.data.donor_phone,
            })}
          </Text>
        ) : null}

        {error ? <ErrorText message={error} /> : null}

        {canConfirm ? (
          <>
            <TextInput
              label={t("requests.donatedOnLabel")}
              placeholder="YYYY-MM-DD"
              value={donatedOn}
              onChangeText={setDonatedOn}
            />
            <PrimaryButton
              label={t("requests.confirmDonation")}
              mode="outlined"
              onPress={() => setConfirmVisible(true)}
            />
          </>
        ) : null}
      </Card.Content>

      <ConfirmDialog
        visible={confirmVisible}
        title={t("requests.confirmDonationTitle")}
        description={t("requests.confirmDonationBody")}
        confirmLabel={t("requests.confirmDonation")}
        onConfirm={() => {
          setError(null);
          confirmDonation.mutate(
            { responseId: response.id, donatedOn },
            {
              onSuccess: () => setConfirmVisible(false),
              onError: (err) => setError(mapSupabaseError(err)),
            },
          );
        }}
        onDismiss={() => setConfirmVisible(false)}
        loading={confirmDonation.isPending}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  content: {
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phone: {
    textDecorationLine: "underline",
  },
});
