import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, View } from "react-native";
import { List, Text } from "react-native-paper";

import { useContentSources } from "@/features/learn/api";

export function SourcesList({ contentId }: { contentId: string }) {
  const { t } = useTranslation();
  const sourcesQuery = useContentSources(contentId);

  return (
    <View style={styles.container}>
      <Text variant="titleSmall">{t("learn.sourcesTitle")}</Text>
      {(sourcesQuery.data ?? []).map((source) => (
        <List.Item
          key={source.id}
          title={source.title}
          titleNumberOfLines={3}
          description={[
            source.organization,
            source.accessed_at
              ? t("learn.sourceChecked", {
                  date: new Date(source.accessed_at).toLocaleDateString(),
                })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          descriptionNumberOfLines={3}
          left={(props) => <List.Icon {...props} icon="book-open-variant" />}
          right={(props) => <List.Icon {...props} icon="open-in-new" />}
          onPress={() => void Linking.openURL(source.url)}
          accessibilityRole="link"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
});
