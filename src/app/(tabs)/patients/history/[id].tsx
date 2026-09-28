import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { StatusChip } from "@/components/StatusChip";
import {
  usePatientDonationHistory,
  useSendAppreciation,
} from "@/features/history/api";
import { mapSupabaseError } from "@/lib/errors";

const MAX_MESSAGE = 300;

export default function PatientDonationHistoryScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const historyQuery = usePatientDonationHistory(id);
  const sendAppreciation = useSendAppreciation(id);
  const [thankDonationId, setThankDonationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (historyQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (historyQuery.error) {
    return (
      <Screen>
        <ErrorText message={mapSupabaseError(historyQuery.error)} />
      </Screen>
    );
  }

  const closeDialog = () => {
    setThankDonationId(null);
    setMessage("");
    setError(null);
  };

  const onSend = () => {
    if (!thankDonationId) return;
    setError(null);
    sendAppreciation.mutate(
      { donationId: thankDonationId, message: message.trim() },
      {
        onSuccess: closeDialog,
        onError: (err) => setError(mapSupabaseError(err)),
      },
    );
  };

  return (
    <Screen>
      <View style={styles.content}>
        {historyQuery.data.length === 0 ? (
          <EmptyState
            title={t("history.emptyTitle")}
            description={t("history.emptyDescription")}
          />
        ) : (
          <FlatList
            data={historyQuery.data}
            keyExtractor={(item) => item.donation_id}
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  <Text variant="titleMedium">
                    {new Date(item.donated_on).toLocaleDateString()}
                  </Text>
                  <Text variant="bodyMedium">
                    {t("history.donatedBy", {
                      name: item.donor_deleted
                        ? t("common.deletedUser")
                        : item.donor_display_name,
                    })}
                  </Text>
                  <Text variant="bodySmall">
                    {t(`donorProfile.verification.${item.verification}`)}
                  </Text>
                  {item.appreciation_sent ? (
                    <StatusChip
                      label={t("history.thanksSent")}
                      tone="positive"
                    />
                  ) : item.donor_deleted ? null : (
                    <Button
                      mode="outlined"
                      icon="heart-outline"
                      style={styles.thanksButton}
                      onPress={() => setThankDonationId(item.donation_id)}
                    >
                      {t("history.sayThanks")}
                    </Button>
                  )}
                </Card.Content>
              </Card>
            )}
          />
        )}
      </View>

      <Portal>
        <Dialog visible={thankDonationId !== null} onDismiss={closeDialog}>
          <Dialog.Title>{t("history.thanksTitle")}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodySmall">{t("history.thanksHint")}</Text>
            <TextInput
              label={t("history.thanksLabel")}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={MAX_MESSAGE}
              mode="outlined"
            />
            <Text variant="bodySmall" style={styles.counter}>
              {message.length}/{MAX_MESSAGE}
            </Text>
            {error ? <ErrorText message={error} /> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog} disabled={sendAppreciation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              onPress={onSend}
              loading={sendAppreciation.isPending}
              disabled={message.trim().length === 0}
            >
              {t("history.send")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    gap: 4,
  },
  thanksButton: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  dialogContent: {
    gap: 8,
  },
  counter: {
    alignSelf: "flex-end",
  },
});
