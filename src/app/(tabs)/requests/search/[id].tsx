import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Switch, Text } from "react-native-paper";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useDistricts } from "@/features/onboarding/api";
import {
  useBroadDonorSearch,
  useInviteBroadDonor,
  useRequest,
  useRequestConnectionToDonor,
} from "@/features/requests/api";
import { mapSupabaseError } from "@/lib/errors";
import { useAppStore } from "@/stores/useAppStore";

type Found = { donor_id: string; display_name: string };

// ARCHITECTURE §9: results are opted-in donors with name, area and an
// activity bucket only. No contact data is ever fetched here.
export default function DonorSearchScreen() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [includeDivision, setIncludeDivision] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [askTarget, setAskTarget] = useState<Found | null>(null);
  const [askedIds, setAskedIds] = useState<string[]>([]);

  const requestQuery = useRequest(id);
  const searchQuery = useBroadDonorSearch(id, includeDivision);
  const districtsQuery = useDistricts();
  const invite = useInviteBroadDonor(id ?? "");
  const askToJoin = useRequestConnectionToDonor();

  const districtName = (districtId: number) => {
    const district = districtsQuery.data?.find((d) => d.id === districtId);
    if (!district) return "";
    return language === "en" ? district.name_en : district.name_bn;
  };

  const onInvite = (donor: Found) => {
    setError(null);
    setNotice(null);
    invite.mutate(donor.donor_id, {
      onSuccess: () =>
        setNotice(`${donor.display_name}: ${t("requests.search.invited")}`),
      onError: (err) => setError(mapSupabaseError(err)),
    });
  };

  const onAskToJoin = () => {
    const patientId = requestQuery.data?.patient_id;
    if (!askTarget || !patientId) return;
    setError(null);
    askToJoin.mutate(
      { patientId, donorId: askTarget.donor_id },
      {
        onSuccess: () => {
          setAskedIds((ids) => [...ids, askTarget.donor_id]);
          setAskTarget(null);
        },
        onError: (err) => {
          setAskTarget(null);
          setError(mapSupabaseError(err));
        },
      },
    );
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Text variant="bodySmall" style={styles.hint}>
          {t("requests.search.resultsHint")}
        </Text>

        <View style={styles.switchRow}>
          <Text variant="bodyMedium" style={styles.switchLabel}>
            {t("requests.search.includeDivision")}
          </Text>
          <Switch
            value={includeDivision}
            onValueChange={setIncludeDivision}
            accessibilityLabel={t("requests.search.includeDivision")}
          />
        </View>

        {notice ? <Text variant="bodyMedium">{notice}</Text> : null}
        {error ? <ErrorText message={error} /> : null}
        {searchQuery.error ? (
          <ErrorText message={mapSupabaseError(searchQuery.error)} />
        ) : null}

        {searchQuery.isPending ? (
          <ActivityIndicator />
        ) : searchQuery.data?.length === 0 ? (
          <EmptyState
            title={t("requests.search.emptyTitle")}
            description={t("requests.search.emptyDescription")}
          />
        ) : (
          <FlatList
            data={searchQuery.data ?? []}
            keyExtractor={(item) => item.donor_id}
            renderItem={({ item }) => {
              const asked = askedIds.includes(item.donor_id);
              return (
                <Card style={styles.card}>
                  <Card.Content style={styles.cardContent}>
                    <Text variant="titleMedium">{item.display_name}</Text>
                    <Text variant="bodyMedium">
                      {[item.area, districtName(item.district_id)]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                    <Text variant="bodySmall" style={styles.hint}>
                      {t(`requests.search.activity.${item.activity}`)}
                    </Text>
                    <PrimaryButton
                      label={t("requests.search.invite")}
                      loading={invite.isPending && invite.variables === item.donor_id}
                      onPress={() => onInvite(item)}
                    />
                    <PrimaryButton
                      label={
                        asked
                          ? t("requests.search.askToJoinSent")
                          : t("requests.search.askToJoin")
                      }
                      mode="outlined"
                      disabled={asked}
                      onPress={() => setAskTarget(item)}
                    />
                  </Card.Content>
                </Card>
              );
            }}
          />
        )}
      </View>

      <ConfirmDialog
        visible={!!askTarget}
        title={t("requests.search.askToJoinTitle", {
          name: askTarget?.display_name,
        })}
        description={t("requests.search.askToJoinBody")}
        confirmLabel={t("requests.search.askToJoin")}
        onConfirm={onAskToJoin}
        onDismiss={() => setAskTarget(null)}
        loading={askToJoin.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 12,
  },
  hint: {
    opacity: 0.7,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    flex: 1,
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    gap: 8,
  },
});
