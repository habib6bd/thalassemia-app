import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { DistrictPicker } from "@/components/DistrictPicker";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { Screen } from "@/components/Screen";
import { useDirectory } from "@/features/organizations/api";
import { OrganizationCard } from "@/features/organizations/components/OrganizationCard";
import {
  organizationTypes,
  type OrganizationType,
} from "@/features/organizations/schema";
import { mapSupabaseError } from "@/lib/errors";

// `pickFor` = a patient id: opened from the patient screen to choose its centre.
export default function DirectoryScreen() {
  const { t } = useTranslation();
  const { pickFor, type: initialType } = useLocalSearchParams<{
    pickFor?: string;
    type?: OrganizationType;
  }>();
  const [type, setType] = useState<OrganizationType | null>(
    initialType ?? null,
  );
  const [districtId, setDistrictId] = useState<number | null>(null);
  const directoryQuery = useDirectory({ type, districtId });

  return (
    <Screen>
      <FlatList
        data={directoryQuery.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Disclaimer textKey="directory.disclaimer" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <Chip
                selected={type === null}
                showSelectedCheck
                onPress={() => setType(null)}
              >
                {t("directory.allTypes")}
              </Chip>
              {organizationTypes.map((item) => (
                <Chip
                  key={item}
                  selected={type === item}
                  showSelectedCheck
                  onPress={() => setType(item)}
                >
                  {t(`directory.types.${item}`)}
                </Chip>
              ))}
            </ScrollView>
            <DistrictPicker
              label={t("directory.district")}
              value={districtId}
              onChange={setDistrictId}
            />
            {districtId ? (
              <Button
                compact
                icon="close"
                style={styles.clear}
                onPress={() => setDistrictId(null)}
              >
                {t("directory.allDistricts")}
              </Button>
            ) : null}
            {directoryQuery.isError ? (
              <ErrorText message={mapSupabaseError(directoryQuery.error)} />
            ) : null}
            {directoryQuery.isPending ? <ActivityIndicator /> : null}
          </View>
        }
        ListEmptyComponent={
          directoryQuery.isSuccess ? (
            <EmptyState
              title={t("directory.emptyTitle")}
              description={t("directory.emptyDescription")}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <OrganizationCard
            organization={item}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/directory/[id]",
                params: pickFor ? { id: item.id, pickFor } : { id: item.id },
              })
            }
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    marginBottom: 12,
  },
  chipRow: {
    gap: 8,
  },
  clear: {
    alignSelf: "flex-start",
  },
});
