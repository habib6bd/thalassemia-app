import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { useMyDonations } from "@/features/requests/api";
import { useAppStore } from "@/stores/useAppStore";

export default function DonationHistoryScreen() {
  const { t } = useTranslation();
  const session = useAppStore((state) => state.session);
  const donationsQuery = useMyDonations(session?.user.id);

  return (
    <Screen>
      <View style={styles.content}>
        {donationsQuery.data?.length === 0 ? (
          <EmptyState
            title={t("donorProfile.donationHistoryEmptyTitle")}
            description={t("donorProfile.donationHistoryEmptyDescription")}
          />
        ) : (
          <FlatList
            data={donationsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium">
                    {new Date(item.donated_on).toLocaleDateString()}
                  </Text>
                  <Text variant="bodySmall">
                    {t(`donorProfile.verification.${item.verification}`)}
                  </Text>
                </Card.Content>
              </Card>
            )}
          />
        )}
      </View>
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
});
