import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  useAcceptCommunityGuidelines,
  useCommunityGuidelinesAccepted,
} from "@/features/community/api";
import { GuidelinesList } from "@/features/community/components/GuidelinesList";
import { mapSupabaseError } from "@/lib/errors";

export default function CommunityGuidelinesScreen() {
  const { t } = useTranslation();
  const acceptedQuery = useCommunityGuidelinesAccepted();
  const accept = useAcceptCommunityGuidelines();
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen scroll>
      <View style={styles.content}>
        <GuidelinesList />
        {acceptedQuery.data ? (
          <Text variant="bodyMedium">{t("community.guidelinesAccepted")}</Text>
        ) : (
          <PrimaryButton
            label={t("community.acceptGuidelines")}
            icon="check"
            loading={accept.isPending}
            onPress={() => {
              setError(null);
              accept.mutate(undefined, {
                onSuccess: () => router.back(),
                onError: (err) => setError(mapSupabaseError(err)),
              });
            }}
          />
        )}
        {error ? <ErrorText message={error} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});
