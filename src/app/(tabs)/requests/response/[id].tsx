import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Disclaimer } from "@/components/Disclaimer";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { StatusChip } from "@/components/StatusChip";
import {
  useMyResponse,
  useReportDonated,
  useRequestForDonor,
  useRespondToRequest,
  useResponseContact,
  useScheduleDonation,
  useWithdrawResponse,
} from "@/features/requests/api";
import { requestStatusTone } from "@/features/requests/statusTone";
import { bloodGroupLabels } from "@/lib/bloodGroups";
import { mapSupabaseError } from "@/lib/errors";

export default function ResponseDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const responseQuery = useMyResponse(id);
  const requestQuery = useRequestForDonor(responseQuery.data?.request_id);
  const contactQuery = useResponseContact(
    responseQuery.data &&
      ["accepted", "donation_pending", "completed"].includes(
        responseQuery.data.status,
      )
      ? id
      : undefined,
  );

  const respondToRequest = useRespondToRequest(id ?? "");
  const scheduleDonation = useScheduleDonation(id ?? "");
  const withdrawResponse = useWithdrawResponse(id ?? "");
  const reportDonated = useReportDonated(id ?? "");

  const [error, setError] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [confirmReportDonated, setConfirmReportDonated] = useState(false);

  if (responseQuery.isPending || requestQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const response = responseQuery.data;
  const request = requestQuery.data;
  if (!response || !request) {
    return (
      <Screen>
        <ErrorText message={t("requests.notFound")} />
      </Screen>
    );
  }

  const onError = (err: unknown) =>
    setError(mapSupabaseError(err as Parameters<typeof mapSupabaseError>[0]));

  return (
    <Screen scroll>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineSmall">{request.treating_centre}</Text>
          <StatusChip
            label={t(`requests.responseStatus.${response.status}`)}
            tone={requestStatusTone(response.status)}
          />
        </View>

        {request.patient_display_name ? (
          <Text variant="bodyMedium">{request.patient_display_name}</Text>
        ) : null}
        <Text variant="bodyMedium">
          {bloodGroupLabels[request.blood_group]}
        </Text>
        <Text variant="bodyMedium">
          {new Date(request.required_at).toLocaleString()}
        </Text>
        {request.is_emergency ? (
          <StatusChip label={t("requests.emergency")} tone="negative" />
        ) : null}

        {contactQuery.data?.manager_phone ? (
          <Text
            variant="bodySmall"
            onPress={() =>
              void Linking.openURL(`tel:${contactQuery.data?.manager_phone}`)
            }
            style={styles.phone}
          >
            {t("requests.contactPhone", {
              phone: contactQuery.data.manager_phone,
            })}
          </Text>
        ) : null}

        {error ? <ErrorText message={error} /> : null}

        {response.status === "invited" || response.status === "declined" ? (
          <View style={styles.buttonRow}>
            <PrimaryButton
              label={t("requests.accept")}
              loading={respondToRequest.isPending}
              onPress={() => {
                setError(null);
                respondToRequest.mutate({ accept: true }, { onError });
              }}
            />
            {response.status === "invited" ? (
              <PrimaryButton
                label={t("requests.decline")}
                mode="outlined"
                loading={respondToRequest.isPending}
                onPress={() => {
                  setError(null);
                  respondToRequest.mutate({ accept: false }, { onError });
                }}
              />
            ) : null}
          </View>
        ) : null}

        {response.status === "accepted" ||
        response.status === "donation_pending" ? (
          <>
            <Text variant="bodyMedium" style={styles.acceptedNote}>
              {t("requests.acceptedNote")}
            </Text>

            <TextInput
              label={t("requests.dateLabel")}
              placeholder="YYYY-MM-DD"
              value={scheduleDate}
              onChangeText={setScheduleDate}
            />
            <TextInput
              label={t("requests.timeLabel")}
              placeholder="HH:MM"
              value={scheduleTime}
              onChangeText={setScheduleTime}
            />
            <PrimaryButton
              label={t("requests.schedule")}
              mode="outlined"
              loading={scheduleDonation.isPending}
              onPress={() => {
                if (!scheduleDate || !scheduleTime) return;
                setError(null);
                scheduleDonation.mutate(
                  new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString(),
                  {
                    onError,
                  },
                );
              }}
            />

            {response.status === "donation_pending" ? (
              <PrimaryButton
                label={t("requests.iDonated")}
                onPress={() => setConfirmReportDonated(true)}
              />
            ) : null}

            <PrimaryButton
              label={t("requests.withdraw")}
              mode="outlined"
              onPress={() => setConfirmWithdraw(true)}
            />
          </>
        ) : null}

        {response.status === "completed" ? (
          <Text variant="bodyMedium">{t("requests.completedNote")}</Text>
        ) : null}

        <Disclaimer />
      </View>

      <ConfirmDialog
        visible={confirmWithdraw}
        title={t("requests.withdrawConfirmTitle")}
        description={t("requests.withdrawConfirmBody")}
        confirmLabel={t("requests.withdraw")}
        onConfirm={() => {
          setError(null);
          withdrawResponse.mutate(undefined, {
            onSuccess: () => setConfirmWithdraw(false),
            onError,
          });
        }}
        onDismiss={() => setConfirmWithdraw(false)}
        loading={withdrawResponse.isPending}
      />

      <ConfirmDialog
        visible={confirmReportDonated}
        title={t("requests.iDonatedConfirmTitle")}
        description={t("requests.iDonatedConfirmBody")}
        confirmLabel={t("requests.iDonated")}
        onConfirm={() => {
          setError(null);
          reportDonated.mutate(undefined, {
            onSuccess: () => setConfirmReportDonated(false),
            onError,
          });
        }}
        onDismiss={() => setConfirmReportDonated(false)}
        loading={reportDonated.isPending}
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
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  acceptedNote: {
    opacity: 0.7,
  },
  phone: {
    textDecorationLine: "underline",
  },
});
