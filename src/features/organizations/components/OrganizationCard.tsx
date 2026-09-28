import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Card, Chip, Text } from "react-native-paper";

import { useDistricts } from "@/features/onboarding/api";
import type { OrganizationType } from "@/features/organizations/schema";
import { useAppStore } from "@/stores/useAppStore";

type OrganizationCardProps = {
  organization: {
    name: string;
    name_bn: string | null;
    type: OrganizationType;
    district_id: number;
    address: string | null;
    last_verified_at: string | null;
  };
  onPress?: () => void;
};

export function organizationDisplayName(
  organization: { name: string; name_bn: string | null },
  language: string,
) {
  return language === "bn" && organization.name_bn
    ? organization.name_bn
    : organization.name;
}

export function OrganizationCard({
  organization,
  onPress,
}: OrganizationCardProps) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const districtsQuery = useDistricts();
  const district = districtsQuery.data?.find(
    (d) => d.id === organization.district_id,
  );

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.content}>
        <Text variant="titleMedium">
          {organizationDisplayName(organization, language)}
        </Text>
        <View style={styles.chipRow}>
          <Chip compact icon="domain">
            {t(`directory.types.${organization.type}`)}
          </Chip>
          {organization.last_verified_at ? (
            <Chip compact icon="check-decagram">
              {t("directory.lastVerified", {
                date: new Date(
                  organization.last_verified_at,
                ).toLocaleDateString(),
              })}
            </Chip>
          ) : null}
        </View>
        <Text variant="bodySmall">
          {[
            organization.address,
            district
              ? language === "bn"
                ? district.name_bn
                : district.name_en
              : null,
          ]
            .filter(Boolean)
            .join(", ")}
        </Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  content: {
    gap: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
