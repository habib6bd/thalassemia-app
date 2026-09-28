import { router, useLocalSearchParams } from "expo-router";
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
  useWidenRequestSearch,
} from "@/features/requests/api";
import {
  EmergencyBadge,
  EmergencyNotice,
} from "@/features/requests/components/EmergencyNotice";
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
  const widenSearch = useWidenRequestSearch(id ?? "");
  const [widenError, setWidenError] = useState<string | null>(null);
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
  const isActive = ["open", "responding", "partially_fulfilled"].includes(
    request.status,
  );
  const openSearch = () =>
    router.push({
      pathname: "/(tabs)/requests/search/[id]",
      params: { id: request.id },
    });

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

        {request.is_emergency ? (
          <>
            <EmergencyBadge />
            <EmergencyNotice />
          </>
        ) : null}

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

        {isActive ? (
          <View style={styles.tierBox}>
            <Text variant="labelLarge">{t("requests.tier.title")}</Text>
            <Text variant="bodyLarge">
              {t(`requests.tier.${request.current_tier}`)}
            </Text>
            <Text variant="bodySmall" style={styles.hint}>
              {t(`requests.tierHint.${request.current_tier}`)}
            </Text>
            {widenError ? <ErrorText message={widenError} /> : null}
            {request.current_tier === "backup" ? (
              <PrimaryButton
                label={t("requests.widenSearch")}
                mode="outlined"
                icon="account-search"
                loading={widenSearch.isPending}
                onPress={() => {
                  setWidenError(null);
                  widenSearch.mutate(undefined, {
                    onSuccess: openSearch,
                    onError: (err) => setWidenError(mapSupabaseError(err)),
                  });
                }}
              />
            ) : null}
            {request.current_tier === "broad" ? (
              <PrimaryButton
                label={t("requests.findDonors")}
                mode="outlined"
                icon="account-search"
                onPress={openSearch}
              />
            ) : null}
          </View>
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
  tierBox: {
    gap: 4,
  },
  hint: {
    opacity: 0.7,
  },
});
