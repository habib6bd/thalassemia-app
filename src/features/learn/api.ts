import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AwarenessCategory,
  ContentKind,
  ReviewStatus,
} from "@/features/learn/categories";
import { supabase } from "@/lib/supabase";

// Reader-facing columns (the rest are admin-only, see the migration grants).
const readerColumns =
  "id, kind, slug, category, title_bn, title_en, summary_bn, summary_en, body_bn, body_en, sort_order, reviewed_at, published_at, updated_at";

// RLS returns only published content to users; the filter keeps the admin's
// Learn view identical to everyone else's.
export function usePublishedContent(
  filters: {
    kind?: ContentKind;
    category?: AwarenessCategory;
  } = {},
) {
  return useQuery({
    queryKey: ["learn-content", filters.kind ?? null, filters.category ?? null],
    queryFn: async () => {
      let query = supabase
        .from("awareness_content")
        .select(readerColumns)
        .eq("review_status", "published")
        .order("category")
        .order("sort_order");
      if (filters.kind) query = query.eq("kind", filters.kind);
      if (filters.category) query = query.eq("category", filters.category);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function usePublishedItem(contentId: string | undefined) {
  return useQuery({
    queryKey: ["learn-item", contentId],
    enabled: !!contentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("awareness_content")
        .select(readerColumns)
        .eq("id", contentId as string)
        .eq("review_status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useContentSources(contentId: string | undefined) {
  return useQuery({
    queryKey: ["learn-sources", contentId],
    enabled: !!contentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_source_links")
        .select("content_sources (id, title, organization, url, accessed_at)")
        .eq("content_id", contentId as string);
      if (error) throw error;
      return data.flatMap((row) =>
        row.content_sources ? [row.content_sources] : [],
      );
    },
  });
}

// Anonymous per-day counter for analytics (no user id is stored).
export function useRecordContentView(contentId: string | undefined) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("record_content_view", {
        content_id: contentId as string,
      });
      if (error) throw error;
    },
  });
}

// === admin ===================================================================
export type AdminContent = {
  id: string;
  kind: ContentKind;
  slug: string;
  category: AwarenessCategory;
  title_bn: string;
  title_en: string;
  summary_bn: string | null;
  summary_en: string | null;
  body_bn: string;
  body_en: string;
  sort_order: number;
  review_status: ReviewStatus;
  drafted_by: "agent" | "human";
  reviewed_at: string | null;
  reviewer_name: string | null;
  review_note: string | null;
  published_at: string | null;
  next_review_due: string | null;
  updated_at: string;
  source_ids: string[];
};

export function useAdminContentList(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-content"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_content");
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminContent(contentId: string | undefined) {
  return useQuery({
    queryKey: ["admin-content", contentId],
    enabled: !!contentId && contentId !== "new",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_content", {
        content_id: contentId as string,
      });
      if (error) throw error;
      return data as unknown as AdminContent;
    },
  });
}

export function useAdminSources(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-sources"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_sources")
        .select("id, title, organization, url, accessed_at")
        .order("title");
      if (error) throw error;
      return data;
    },
  });
}

function invalidateContent(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["admin-content"] });
  void queryClient.invalidateQueries({ queryKey: ["learn-content"] });
  void queryClient.invalidateQueries({ queryKey: ["learn-item"] });
  void queryClient.invalidateQueries({ queryKey: ["learn-sources"] });
}

export type ContentInput = {
  kind: ContentKind;
  slug: string;
  category: AwarenessCategory;
  titleBn: string;
  titleEn: string;
  summaryBn?: string;
  summaryEn?: string;
  bodyBn: string;
  bodyEn: string;
  sortOrder: number;
};

export function useUpsertContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContentInput & { contentId: string | null }) => {
      const { data, error } = await supabase.rpc("admin_upsert_content", {
        content_id: input.contentId as string,
        kind: input.kind,
        slug: input.slug,
        category: input.category,
        title_bn: input.titleBn,
        title_en: input.titleEn,
        summary_bn: input.summaryBn || undefined,
        summary_en: input.summaryEn || undefined,
        body_bn: input.bodyBn,
        body_en: input.bodyEn,
        sort_order: input.sortOrder,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateContent(queryClient),
  });
}

export function useSetContentSources(contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceIds: string[]) => {
      const { error } = await supabase.rpc("admin_set_content_sources", {
        content_id: contentId,
        source_ids: sourceIds,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateContent(queryClient),
  });
}

export function useTransitionContent(contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { toStatus: ReviewStatus; note?: string }) => {
      const { error } = await supabase.rpc("admin_transition_content", {
        content_id: contentId,
        to_status: input.toStatus,
        note: input.note || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateContent(queryClient),
  });
}

export function useUpsertSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sourceId: string | null;
      title: string;
      url: string;
      organization?: string;
      accessedAt?: string | null;
    }) => {
      const { error } = await supabase.rpc("admin_upsert_content_source", {
        source_id: input.sourceId as string,
        title: input.title,
        url: input.url,
        organization: input.organization || undefined,
        accessed_at: input.accessedAt ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
      invalidateContent(queryClient);
    },
  });
}
