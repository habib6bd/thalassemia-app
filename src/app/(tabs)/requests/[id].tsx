import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { StatusChip } from "@/components/StatusChip";
import { usePublicProfiles } from "@/features/network/api";
import {
  useCancelBloodRequest,
  useRequest,
  useRequestResponses,
} from "@/features/requests/api";
import { ResponseRow } from "@/features/requests/components/ResponseRow";
import { requestStatusTone } from "@/features/requests/statusTone";
import { bloodGroupLabels } from "@/lib/bloodGroups";
import { mapSupabaseError } from "@/lib/errors";

export default function RequestDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestQuery = useRequest(id);
  const responsesQuery = useRequestResponses(id);
  const cancelRequest = useCancelBloodRequest(id ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const donorIds = useMemo(
    () => (responsesQuery.data ?? []).map((r) => r.donor_id),
    [responsesQuery.data],
  );
  const profilesQuery = usePublicProfiles(donorIds);

  if (requestQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const request = requestQuery.data;
  if (!request) {
    return (
      <Screen>
        <ErrorText message={t("requests.notFound")} />
      </Screen>
    );
  }

  const canCancel = [
    "draft",
    "open",
    "responding",
    "partially_fulfilled",
  ].includes(request.status);
  const nameFor = (donorId: string) =>
    profilesQuery.data?.find((p) => p.user_id === donorId)?.display_name ??
    undefined;

  return (
    <Screen scroll>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineSmall">{request.treating_centre}</Text>
          <StatusChip
            label={t(`requests.status.${request.status}`)}
            tone={requestStatusTone(request.status)}
          />
        </View>

        <Text variant="bodyMedium">
          {bloodGroupLabels[request.blood_group]}
        </Text>
        <Text variant="bodyMedium">
          {new Date(request.required_at).toLocaleString()}
        </Text>
        <Text variant="bodyMedium">
          {t("requests.unitsNeeded")}: {request.units_needed}
        </Text>
        {request.component ? (
          <Text variant="bodyMedium">
            {t("requests.componentOptional")}: {request.component}
          </Text>
        ) : null}
        {request.notes ? (
          <Text variant="bodyMedium">{request.notes}</Text>
        ) : null}

        {cancelError ? <ErrorText message={cancelError} /> : null}

        {canCancel ? (
          <PrimaryButton
            label={t("requests.cancel")}
            mode="outlined"
            onPress={() => setConfirmCancel(true)}
          />
        ) : null}

        <Text variant="titleMedium">{t("requests.responsesHeading")}</Text>
        {(responsesQuery.data ?? []).length === 0 ? (
          <Text variant="bodyMedium">{t("requests.noResponsesYet")}</Text>
        ) : (
          (responsesQuery.data ?? []).map((response) => (
            <ResponseRow
              key={response.id}
              response={response}
              requestId={request.id}
              donorName={nameFor(response.donor_id)}
            />
          ))
        )}
      </View>

      <ConfirmDialog
        visible={confirmCancel}
        title={t("requests.cancelConfirmTitle")}
        description={t("requests.cancelConfirmBody")}
        confirmLabel={t("requests.cancel")}
        onConfirm={() => {
          setCancelError(null);
          cancelRequest.mutate(undefined, {
            onSuccess: () => setConfirmCancel(false),
            onError: (err) => setCancelError(mapSupabaseError(err)),
          });
        }}
        onDismiss={() => setConfirmCancel(false)}
        loading={cancelRequest.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
