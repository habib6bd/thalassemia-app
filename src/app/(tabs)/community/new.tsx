import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip, HelperText, Text } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import {
  useAcceptCommunityGuidelines,
  useCommunityGuidelinesAccepted,
  useCreateCommunityPost,
} from "@/features/community/api";
import { GuidelinesList } from "@/features/community/components/GuidelinesList";
import {
  communityPostSchema,
  communityTopics,
  type CommunityPostInput,
} from "@/features/community/schema";
import { mapSupabaseError } from "@/lib/errors";

export default function NewCommunityPostScreen() {
  const { t } = useTranslation();
  const acceptedQuery = useCommunityGuidelinesAccepted();
  const accept = useAcceptCommunityGuidelines();
  const createPost = useCreateCommunityPost();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CommunityPostInput>({
    resolver: zodResolver(communityPostSchema),
    defaultValues: { topic: "questions", title: "", body: "" },
  });

  const onPublish = handleSubmit((values) => {
    setError(null);
    createPost.mutate(values, {
      onSuccess: (post) =>
        router.replace({
          pathname: "/(tabs)/community/[id]",
          params: { id: post.id },
        }),
      onError: (err) => setError(mapSupabaseError(err)),
    });
  });

  if (acceptedQuery.isPending) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  // Posting requires accepting the guidelines first (phase-2 2c).
  if (!acceptedQuery.data) {
    return (
      <Screen scroll>
        <View style={styles.content}>
          <GuidelinesList />
          <PrimaryButton
            label={t("community.acceptGuidelines")}
            icon="check"
            loading={accept.isPending}
            onPress={() => {
              setError(null);
              accept.mutate(undefined, {
                onError: (err) => setError(mapSupabaseError(err)),
              });
            }}
          />
          {error ? <ErrorText message={error} /> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Disclaimer textKey="community.composerWarning" />

        <Text variant="labelLarge">{t("community.topicLabel")}</Text>
        <Controller
          control={control}
          name="topic"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipRow}>
              {communityTopics.map((topic) => (
                <Chip
                  key={topic}
                  selected={value === topic}
                  showSelectedCheck
                  onPress={() => onChange(topic)}
                >
                  {t(`community.topics.${topic}`)}
                </Chip>
              ))}
            </View>
          )}
        />

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label={t("community.titleLabel")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={120}
              mode="outlined"
              error={!!errors.title}
            />
          )}
        />
        <Controller
          control={control}
          name="body"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label={t("community.bodyLabel")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={8}
              maxLength={5000}
              mode="outlined"
              error={!!errors.body}
            />
          )}
        />
        {errors.title || errors.body ? (
          <HelperText type="error">{t("errors.invalid_post")}</HelperText>
        ) : null}
        {error ? <ErrorText message={error} /> : null}

        <PrimaryButton
          label={t("community.publish")}
          loading={createPost.isPending}
          onPress={onPublish}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
