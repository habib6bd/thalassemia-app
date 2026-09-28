import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Card, Switch, Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  useDonorLocation,
  useSetAvailabilityReminders,
  useSetDonorLocation,
} from "@/features/donors/api";
import { getApproximatePosition } from "@/features/donors/location";
import { mapSupabaseError } from "@/lib/errors";

type DonorExtrasCardProps = {
  userId: string;
  remindersEnabled: boolean;
};

// Opt-in nearby-search location and check-in reminders (Phase 4c).
export function DonorExtrasCard({
  userId,
  remindersEnabled,
}: DonorExtrasCardProps) {
  const { t } = useTranslation();
  const locationQuery = useDonorLocation(userId);
  const setLocation = useSetDonorLocation();
  const setReminders = useSetAvailabilityReminders(userId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const shared = !!locationQuery.data;

  const share = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const point = await getApproximatePosition();
      if (!point) {
        setNotice(t("donorProfile.locationDenied"));
        return;
      }
      await setLocation.mutateAsync(point);
    } catch (err) {
      setError(mapSupabaseError(err as Error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Card.Content style={styles.content}>
        <Text variant="titleMedium">{t("donorProfile.nearbyTitle")}</Text>
        <Text variant="bodySmall">{t("donorProfile.nearbyHint")}</Text>
        <Text variant="bodyMedium">
          {locationQuery.data
            ? t("donorProfile.locationShared", {
                date: new Date(
                  locationQuery.data.updated_at,
                ).toLocaleDateString(),
              })
            : t("donorProfile.locationNotShared")}
        </Text>
        <View style={styles.row}>
          <PrimaryButton
            label={
              shared
                ? t("donorProfile.updateLocation")
                : t("donorProfile.shareLocation")
            }
            icon="crosshairs-gps"
            mode="outlined"
            loading={busy}
            onPress={() => void share()}
          />
          {shared ? (
            <PrimaryButton
              label={t("donorProfile.stopSharing")}
              icon="map-marker-off"
              mode="outlined"
              loading={setLocation.isPending && !busy}
              onPress={() => {
                setError(null);
                setLocation.mutate(null, {
                  onError: (err) => setError(mapSupabaseError(err)),
                });
              }}
            />
          ) : null}
        </View>
        {notice ? <Text variant="bodySmall">{notice}</Text> : null}

        <View style={styles.switchRow}>
          <Text variant="bodyMedium" style={styles.flex}>
            {t("donorProfile.remindersLabel")}
          </Text>
          <Switch
            value={remindersEnabled}
            onValueChange={(value) => {
              setError(null);
              setReminders.mutate(value, {
                onError: (err) => setError(mapSupabaseError(err)),
              });
            }}
            accessibilityLabel={t("donorProfile.remindersLabel")}
          />
        </View>
        <Text variant="bodySmall">{t("donorProfile.remindersHint")}</Text>
        {error ? <ErrorText message={error} /> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
