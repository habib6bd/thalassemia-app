import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip } from "react-native-paper";

import { Disclaimer } from "@/components/Disclaimer";
import { EmptyState } from "@/components/EmptyState";
import { ErrorText } from "@/components/ErrorText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useCommunityFeed } from "@/features/community/api";
import { PostCard } from "@/features/community/components/PostCard";
import {
  communityTopics,
  type CommunityTopic,
} from "@/features/community/schema";
import { mapSupabaseError } from "@/lib/errors";

export default function CommunityFeedScreen() {
  const { t } = useTranslation();
  const [topic, setTopic] = useState<CommunityTopic | null>(null);
  const feedQuery = useCommunityFeed(topic);
  const posts = feedQuery.data?.pages.flat() ?? [];

  return (
    <Screen>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Disclaimer textKey="community.banner" />
            <PrimaryButton
              label={t("community.newPost")}
              icon="pencil"
              onPress={() => router.push("/(tabs)/community/new")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <Chip
                selected={topic === null}
                showSelectedCheck
                onPress={() => setTopic(null)}
              >
                {t("community.allTopics")}
              </Chip>
              {communityTopics.map((item) => (
                <Chip
                  key={item}
                  selected={topic === item}
                  showSelectedCheck
                  onPress={() => setTopic(item)}
                >
                  {t(`community.topics.${item}`)}
                </Chip>
              ))}
            </ScrollView>
            {feedQuery.isError ? (
              <ErrorText message={mapSupabaseError(feedQuery.error)} />
            ) : null}
            {feedQuery.isPending ? <ActivityIndicator /> : null}
          </View>
        }
        ListEmptyComponent={
          feedQuery.isSuccess ? (
            <EmptyState
              title={t("community.feedEmptyTitle")}
              description={t("community.feedEmptyDescription")}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            preview
            onPress={() =>
              router.push({
                pathname: "/(tabs)/community/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
        ListFooterComponent={
          feedQuery.hasNextPage ? (
            <PrimaryButton
              label={t("community.loadMore")}
              mode="outlined"
              loading={feedQuery.isFetchingNextPage}
              onPress={() => void feedQuery.fetchNextPage()}
            />
          ) : null
        }
        onRefresh={() => void feedQuery.refetch()}
        refreshing={feedQuery.isRefetching && !feedQuery.isFetchingNextPage}
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
});
