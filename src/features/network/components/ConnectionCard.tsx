import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  SegmentedButtons,
  Text,
} from "react-native-paper";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StatusChip } from "@/components/StatusChip";
import {
  useCancelConnectionRequest,
  useConnectionParties,
  useRespondConnection,
  useSetConnectionStatus,
} from "@/features/network/api";
import { bloodGroupLabels } from "@/lib/bloodGroups";
import { personName } from "@/lib/displayName";
import { mapSupabaseError } from "@/lib/errors";
import type { Database } from "@/lib/database.types";

type Connection =
  Database["public"]["Tables"]["patient_donor_connections"]["Row"];
type ConnectionTier = Database["public"]["Enums"]["connection_tier"];

type ConnectionCardProps = {
  connection: Connection;
  currentUserId: string;
};

export function ConnectionCard({
  connection,
  currentUserId,
}: ConnectionCardProps) {
  const { t } = useTranslation();
  const partiesQuery = useConnectionParties(connection.id);
  const respondConnection = useRespondConnection();
  const cancelConnectionRequest = useCancelConnectionRequest();
  const setConnectionStatus = useSetConnectionStatus();

  const [tier, setTier] = useState<ConnectionTier>(connection.tier);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDonorSide = connection.donor_id === currentUserId;
  const isManager = !isDonorSide;
  // §7.1: only the side that did not start the request may answer it; the
  // side that started it may cancel it.
  const isPending = connection.status === "requested";
  const startedByMe = (connection.initiated_by === "donor") === isDonorSide;
  const counterpartyName = personName(
    isDonorSide
      ? partiesQuery.data?.patient_display_name
      : partiesQuery.data?.donor_display_name,
  );

  const statusTone =
    connection.status === "active"
      ? "positive"
      : connection.status === "requested"
        ? "warning"
        : connection.status === "removed" ||
            connection.status === "declined" ||
            connection.status === "cancelled"
          ? "negative"
          : "neutral";

  const onError = (err: unknown) =>
    setError(mapSupabaseError(err as Parameters<typeof mapSupabaseError>[0]));

  const remove = () => {
    setError(null);
    setConnectionStatus.mutate(
      { connectionId: connection.id, newStatus: "removed" },
      { onError, onSuccess: () => setConfirmRemove(false) },
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleMedium">
            {partiesQuery.isPending ? (
              <ActivityIndicator size={16} />
            ) : (
              counterpartyName || t("network.unknownParty")
            )}
          </Text>
          <StatusChip
            label={t(`network.status.${connection.status}`)}
            tone={statusTone}
          />
        </View>

        {isDonorSide && partiesQuery.data?.patient_blood_group ? (
          <Text variant="bodySmall">
            {bloodGroupLabels[partiesQuery.data.patient_blood_group]}
          </Text>
        ) : null}
        {!isDonorSide && partiesQuery.data?.donor_blood_group ? (
          <Text variant="bodySmall">
            {bloodGroupLabels[partiesQuery.data.donor_blood_group]} ·{" "}
            {t(
              `donorProfile.availabilityOptions.${partiesQuery.data.donor_availability}`,
            )}
          </Text>
        ) : null}

        {error ? <ErrorText message={error} /> : null}

        {isPending && !startedByMe && isManager ? (
          <View style={styles.actions}>
            <SegmentedButtons
              value={tier}
              onValueChange={(v) => setTier(v as ConnectionTier)}
              buttons={[
                { value: "regular", label: t("network.tier.regular") },
                { value: "backup", label: t("network.tier.backup") },
              ]}
            />
            <View style={styles.buttonRow}>
              <PrimaryButton
                label={t("network.approve")}
                loading={respondConnection.isPending}
                onPress={() => {
                  setError(null);
                  respondConnection.mutate(
                    { connectionId: connection.id, accept: true, tier },
                    { onError },
                  );
                }}
              />
              <PrimaryButton
                label={t("network.decline")}
                mode="outlined"
                loading={respondConnection.isPending}
                onPress={() => {
                  setError(null);
                  respondConnection.mutate(
                    { connectionId: connection.id, accept: false },
                    { onError },
                  );
                }}
              />
            </View>
          </View>
        ) : null}

        {isPending && !startedByMe && isDonorSide ? (
          <View style={styles.actions}>
            <Text variant="bodyMedium">{t("network.familyAsked")}</Text>
            <View style={styles.buttonRow}>
              <PrimaryButton
                label={t("network.accept")}
                loading={respondConnection.isPending}
                onPress={() => {
                  setError(null);
                  respondConnection.mutate(
                    { connectionId: connection.id, accept: true },
                    { onError },
                  );
                }}
              />
              <PrimaryButton
                label={t("network.decline")}
                mode="outlined"
                loading={respondConnection.isPending}
                onPress={() => {
                  setError(null);
                  respondConnection.mutate(
                    { connectionId: connection.id, accept: false },
                    { onError },
                  );
                }}
              />
            </View>
          </View>
        ) : null}

        {isPending && startedByMe ? (
          <PrimaryButton
            label={t("network.cancelRequest")}
            mode="outlined"
            loading={cancelConnectionRequest.isPending}
            onPress={() => {
              setError(null);
              cancelConnectionRequest.mutate(connection.id, { onError });
            }}
          />
        ) : null}

        {connection.status === "active" || connection.status === "paused" ? (
          <View style={styles.buttonRow}>
            {connection.status === "active" ? (
              <PrimaryButton
                label={t("network.pause")}
                mode="outlined"
                loading={setConnectionStatus.isPending}
                onPress={() => {
                  setError(null);
                  setConnectionStatus.mutate(
                    { connectionId: connection.id, newStatus: "paused" },
                    { onError },
                  );
                }}
              />
            ) : (
              <PrimaryButton
                label={t("network.resume")}
                mode="outlined"
                loading={setConnectionStatus.isPending}
                onPress={() => {
                  setError(null);
                  setConnectionStatus.mutate(
                    { connectionId: connection.id, newStatus: "active" },
                    { onError },
                  );
                }}
              />
            )}
            <PrimaryButton
              label={isDonorSide ? t("network.leave") : t("network.remove")}
              mode="outlined"
              onPress={() => setConfirmRemove(true)}
            />
          </View>
        ) : null}
      </Card.Content>

      <ConfirmDialog
        visible={confirmRemove}
        title={
          isDonorSide
            ? t("network.leaveConfirmTitle")
            : t("network.removeConfirmTitle")
        }
        description={
          isDonorSide
            ? t("network.leaveConfirmBody")
            : t("network.removeConfirmBody")
        }
        confirmLabel={isDonorSide ? t("network.leave") : t("network.remove")}
        onConfirm={remove}
        onDismiss={() => setConfirmRemove(false)}
        loading={setConnectionStatus.isPending}
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
  actions: {
    gap: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
});
