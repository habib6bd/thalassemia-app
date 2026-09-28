import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  CommunityPostInput,
  CommunityTargetType,
  CommunityTopic,
  ModerationAction,
  ReportInput,
} from "@/features/community/schema";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 20;

export function useCommunityGuidelinesAccepted() {
  return useQuery({
    queryKey: ["community-guidelines-accepted"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "has_accepted_community_guidelines",
      );
      if (error) throw error;
      return data;
    },
  });
}

export function useAcceptCommunityGuidelines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("accept_community_guidelines");
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-guidelines-accepted"],
      });
    },
  });
}

// Keyset pagination on created_at (newest first).
export function useCommunityFeed(topic: CommunityTopic | null) {
  return useInfiniteQuery({
    queryKey: ["community-posts", topic],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("list_community_posts", {
        topic_filter: topic ?? undefined,
        before_created_at: pageParam ?? undefined,
        page_size: PAGE_SIZE,
      });
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === PAGE_SIZE
        ? lastPage[lastPage.length - 1].created_at
        : undefined,
  });
}

export function useCommunityPost(postId: string | undefined) {
  return useQuery({
    queryKey: ["community-post", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_community_post", { post_id: postId as string })
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCommunityComments(postId: string | undefined) {
  return useQuery({
    queryKey: ["community-comments", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_community_comments", {
        post_id: postId as string,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCommunityPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommunityPostInput) => {
      const { data, error } = await supabase.rpc("create_community_post", {
        topic: input.topic,
        title: input.title,
        body: input.body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useDeleteCommunityPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.rpc("delete_community_post", {
        post_id: postId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useCreateCommunityComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.rpc("create_community_comment", {
        post_id: postId,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-comments", postId],
      });
      void queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useDeleteCommunityComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.rpc("delete_community_comment", {
        comment_id: commentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-comments", postId],
      });
      void queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export function useReportCommunityContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: ReportInput & {
        targetType: CommunityTargetType;
        targetId: string;
      },
    ) => {
      const { error } = await supabase.rpc("report_community_content", {
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-post"] });
      void queryClient.invalidateQueries({ queryKey: ["community-comments"] });
    },
  });
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: ["blocked-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_blocked_users");
      if (error) throw error;
      return data;
    },
  });
}

function invalidateAfterBlockChange(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
  void queryClient.invalidateQueries({ queryKey: ["community-posts"] });
  void queryClient.invalidateQueries({ queryKey: ["community-post"] });
  void queryClient.invalidateQueries({ queryKey: ["community-comments"] });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("block_user", { user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterBlockChange(queryClient),
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("unblock_user", { user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterBlockChange(queryClient),
  });
}

export function useModerationQueue(enabled: boolean) {
  return useQuery({
    queryKey: ["moderation-queue"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_moderation_queue");
      if (error) throw error;
      return data;
    },
  });
}

export function useModerateContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      targetType: CommunityTargetType;
      targetId: string;
      action: ModerationAction;
      note?: string;
    }) => {
      const { error } = await supabase.rpc("moderate_community_content", {
        target_type: input.targetType,
        target_id: input.targetId,
        action: input.action,
        note: input.note || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["moderation-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}
