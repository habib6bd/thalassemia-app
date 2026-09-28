import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { StatusChip } from "@/components/StatusChip";
import { useMyPatients } from "@/features/patients/api";
import { bloodGroupLabels } from "@/lib/bloodGroups";

export default function MyPatientsScreen() {
  const { t } = useTranslation();
  const patientsQuery = useMyPatients();

  return (
    <Screen>
      <View style={styles.content}>
        <PrimaryButton
          label={t("patients.addPatient")}
          onPress={() => router.push("/(tabs)/patients/new")}
        />
        <PrimaryButton
          label={t("patients.joinAsGuardian")}
          mode="outlined"
          icon="account-key"
          onPress={() => router.push("/(tabs)/patients/join")}
        />

        {patientsQuery.data?.length === 0 ? (
          <EmptyState
            title={t("patients.emptyTitle")}
            description={t("patients.emptyDescription")}
          />
        ) : (
          <FlatList
            data={patientsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Card
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/patients/[id]",
                    params: { id: item.id },
                  })
                }
              >
                <Card.Content style={styles.cardContent}>
                  <Text variant="titleMedium">{item.display_name}</Text>
                  <StatusChip
                    label={bloodGroupLabels[item.blood_group]}
                    tone="neutral"
                  />
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
    gap: 12,
  },
  list: {
    gap: 8,
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
