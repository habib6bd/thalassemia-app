export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "app_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      appreciation_messages: {
        Row: {
          created_at: string;
          donation_id: string;
          hidden_by_recipient_at: string | null;
          id: string;
          message: string;
          recipient_id: string;
          removed_at: string | null;
          removed_by: string | null;
          sender_id: string;
        };
        Insert: {
          created_at?: string;
          donation_id: string;
          hidden_by_recipient_at?: string | null;
          id?: string;
          message: string;
          recipient_id: string;
          removed_at?: string | null;
          removed_by?: string | null;
          sender_id: string;
        };
        Update: {
          created_at?: string;
          donation_id?: string;
          hidden_by_recipient_at?: string | null;
          id?: string;
          message?: string;
          recipient_id?: string;
          removed_at?: string | null;
          removed_by?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appreciation_messages_donation_id_fkey";
            columns: ["donation_id"];
            isOneToOne: true;
            referencedRelation: "donations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appreciation_messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "appreciation_messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "appreciation_messages_removed_by_fkey";
            columns: ["removed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "appreciation_messages_removed_by_fkey";
            columns: ["removed_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "appreciation_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "appreciation_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: number;
          new_data: Json | null;
          old_data: Json | null;
          row_id: string | null;
          table_name: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          new_data?: Json | null;
          old_data?: Json | null;
          row_id?: string | null;
          table_name: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          new_data?: Json | null;
          old_data?: Json | null;
          row_id?: string | null;
          table_name?: string;
        };
        Relationships: [];
      };
      awareness_content: {
        Row: {
          body_bn: string;
          body_en: string;
          category: Database["public"]["Enums"]["awareness_category"];
          created_at: string;
          drafted_by: string;
          id: string;
          kind: Database["public"]["Enums"]["content_kind"];
          last_edited_by: string | null;
          next_review_due: string | null;
          published_at: string | null;
          review_note: string | null;
          review_reminded_at: string | null;
          review_status: Database["public"]["Enums"]["content_review_status"];
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          sort_order: number;
          summary_bn: string | null;
          summary_en: string | null;
          title_bn: string;
          title_en: string;
          updated_at: string;
        };
        Insert: {
          body_bn: string;
          body_en: string;
          category: Database["public"]["Enums"]["awareness_category"];
          created_at?: string;
          drafted_by?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["content_kind"];
          last_edited_by?: string | null;
          next_review_due?: string | null;
          published_at?: string | null;
          review_note?: string | null;
          review_reminded_at?: string | null;
          review_status?: Database["public"]["Enums"]["content_review_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug: string;
          sort_order?: number;
          summary_bn?: string | null;
          summary_en?: string | null;
          title_bn: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          body_bn?: string;
          body_en?: string;
          category?: Database["public"]["Enums"]["awareness_category"];
          created_at?: string;
          drafted_by?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["content_kind"];
          last_edited_by?: string | null;
          next_review_due?: string | null;
          published_at?: string | null;
          review_note?: string | null;
          review_reminded_at?: string | null;
          review_status?: Database["public"]["Enums"]["content_review_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string;
          sort_order?: number;
          summary_bn?: string | null;
          summary_en?: string | null;
          title_bn?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "awareness_content_last_edited_by_fkey";
            columns: ["last_edited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "awareness_content_last_edited_by_fkey";
            columns: ["last_edited_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "awareness_content_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "awareness_content_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      blood_requests: {
        Row: {
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          cancel_reason: string | null;
          closed_at: string | null;
          component: string | null;
          created_at: string;
          created_by: string;
          current_tier: Database["public"]["Enums"]["request_tier"];
          district_id: number;
          emergency_acknowledged_at: string | null;
          id: string;
          is_emergency: boolean;
          notes: string | null;
          organization_id: string | null;
          patient_id: string;
          published_at: string | null;
          required_at: string;
          status: Database["public"]["Enums"]["request_status"];
          tier_changed_at: string | null;
          treating_centre: string;
          units_needed: number;
          updated_at: string;
        };
        Insert: {
          area?: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          cancel_reason?: string | null;
          closed_at?: string | null;
          component?: string | null;
          created_at?: string;
          created_by: string;
          current_tier?: Database["public"]["Enums"]["request_tier"];
          district_id: number;
          emergency_acknowledged_at?: string | null;
          id?: string;
          is_emergency?: boolean;
          notes?: string | null;
          organization_id?: string | null;
          patient_id: string;
          published_at?: string | null;
          required_at: string;
          status?: Database["public"]["Enums"]["request_status"];
          tier_changed_at?: string | null;
          treating_centre: string;
          units_needed: number;
          updated_at?: string;
        };
        Update: {
          area?: string | null;
          blood_group?: Database["public"]["Enums"]["blood_group"];
          cancel_reason?: string | null;
          closed_at?: string | null;
          component?: string | null;
          created_at?: string;
          created_by?: string;
          current_tier?: Database["public"]["Enums"]["request_tier"];
          district_id?: number;
          emergency_acknowledged_at?: string | null;
          id?: string;
          is_emergency?: boolean;
          notes?: string | null;
          organization_id?: string | null;
          patient_id?: string;
          published_at?: string | null;
          required_at?: string;
          status?: Database["public"]["Enums"]["request_status"];
          tier_changed_at?: string | null;
          treating_centre?: string;
          units_needed?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blood_requests_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "blood_requests_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "blood_requests_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blood_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blood_requests_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patient_cards_for_donor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blood_requests_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      community_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_note: string | null;
          post_id: string;
          report_count: number;
          status: Database["public"]["Enums"]["community_content_status"];
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_note?: string | null;
          post_id: string;
          report_count?: number;
          status?: Database["public"]["Enums"]["community_content_status"];
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_note?: string | null;
          post_id?: string;
          report_count?: number;
          status?: Database["public"]["Enums"]["community_content_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "community_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "community_comments_moderated_by_fkey";
            columns: ["moderated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "community_comments_moderated_by_fkey";
            columns: ["moderated_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "community_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_guideline_acceptances: {
        Row: {
          accepted_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          accepted_at?: string;
          user_id: string;
          version: number;
        };
        Update: {
          accepted_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "community_guideline_acceptances_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "community_guideline_acceptances_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      community_posts: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_note: string | null;
          report_count: number;
          status: Database["public"]["Enums"]["community_content_status"];
          title: string;
          topic: Database["public"]["Enums"]["community_topic"];
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_note?: string | null;
          report_count?: number;
          status?: Database["public"]["Enums"]["community_content_status"];
          title: string;
          topic: Database["public"]["Enums"]["community_topic"];
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_note?: string | null;
          report_count?: number;
          status?: Database["public"]["Enums"]["community_content_status"];
          title?: string;
          topic?: Database["public"]["Enums"]["community_topic"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "community_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "community_posts_moderated_by_fkey";
            columns: ["moderated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "community_posts_moderated_by_fkey";
            columns: ["moderated_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      content_source_links: {
        Row: {
          content_id: string;
          source_id: string;
        };
        Insert: {
          content_id: string;
          source_id: string;
        };
        Update: {
          content_id?: string;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_source_links_content_id_fkey";
            columns: ["content_id"];
            isOneToOne: false;
            referencedRelation: "awareness_content";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_source_links_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "content_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      content_sources: {
        Row: {
          accessed_at: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          organization: string | null;
          title: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          accessed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization?: string | null;
          title: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          accessed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization?: string | null;
          title?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_sources_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "content_sources_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      districts: {
        Row: {
          division_id: number;
          id: number;
          name_bn: string;
          name_en: string;
        };
        Insert: {
          division_id: number;
          id: number;
          name_bn: string;
          name_en: string;
        };
        Update: {
          division_id?: number;
          id?: number;
          name_bn?: string;
          name_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "districts_division_id_fkey";
            columns: ["division_id"];
            isOneToOne: false;
            referencedRelation: "divisions";
            referencedColumns: ["id"];
          },
        ];
      };
      divisions: {
        Row: {
          id: number;
          name_bn: string;
          name_en: string;
        };
        Insert: {
          id: number;
          name_bn: string;
          name_en: string;
        };
        Update: {
          id?: number;
          name_bn?: string;
          name_en?: string;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          confirmed_at: string;
          confirmed_by: string;
          created_at: string;
          donated_on: string;
          donor_id: string;
          id: string;
          patient_id: string;
          request_id: string;
          response_id: string;
          verification: Database["public"]["Enums"]["donation_verification"];
        };
        Insert: {
          confirmed_at?: string;
          confirmed_by: string;
          created_at?: string;
          donated_on: string;
          donor_id: string;
          id?: string;
          patient_id: string;
          request_id: string;
          response_id: string;
          verification: Database["public"]["Enums"]["donation_verification"];
        };
        Update: {
          confirmed_at?: string;
          confirmed_by?: string;
          created_at?: string;
          donated_on?: string;
          donor_id?: string;
          id?: string;
          patient_id?: string;
          request_id?: string;
          response_id?: string;
          verification?: Database["public"]["Enums"]["donation_verification"];
        };
        Relationships: [
          {
            foreignKeyName: "donations_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "donations_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "donations_donor_id_fkey";
            columns: ["donor_id"];
            isOneToOne: false;
            referencedRelation: "donor_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "donations_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patient_cards_for_donor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "donations_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "donations_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "blood_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "donations_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: true;
            referencedRelation: "donor_responses";
            referencedColumns: ["id"];
          },
        ];
      };
      donor_profiles: {
        Row: {
          availability: Database["public"]["Enums"]["donor_availability"];
          available_from: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at: string;
          emergency_available: boolean;
          last_donation_date: string | null;
          searchable: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          availability?: Database["public"]["Enums"]["donor_availability"];
          available_from?: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at?: string;
          emergency_available?: boolean;
          last_donation_date?: string | null;
          searchable?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          availability?: Database["public"]["Enums"]["donor_availability"];
          available_from?: string | null;
          blood_group?: Database["public"]["Enums"]["blood_group"];
          created_at?: string;
          emergency_available?: boolean;
          last_donation_date?: string | null;
          searchable?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "donor_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "donor_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      donor_responses: {
        Row: {
          created_at: string;
          donor_id: string;
          donor_reported_donated_at: string | null;
          id: string;
          invited_via: Database["public"]["Enums"]["request_tier"];
          reason: string | null;
          request_id: string;
          responded_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["response_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          donor_id: string;
          donor_reported_donated_at?: string | null;
          id?: string;
          invited_via: Database["public"]["Enums"]["request_tier"];
          reason?: string | null;
          request_id: string;
          responded_at?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["response_status"];
          status_changed_at?: string;
          status_changed_by?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          donor_id?: string;
          donor_reported_donated_at?: string | null;
          id?: string;
          invited_via?: Database["public"]["Enums"]["request_tier"];
          reason?: string | null;
          request_id?: string;
          responded_at?: string | null;
          scheduled_at?: string | null;
          status?: Database["public"]["Enums"]["response_status"];
          status_changed_at?: string;
          status_changed_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "donor_responses_donor_id_fkey";
            columns: ["donor_id"];
            isOneToOne: false;
            referencedRelation: "donor_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "donor_responses_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "blood_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "donor_responses_status_changed_by_fkey";
            columns: ["status_changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "donor_responses_status_changed_by_fkey";
            columns: ["status_changed_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      guardian_invites: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          patient_id: string;
          revoked_at: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          code: string;
          created_at?: string;
          created_by: string;
          expires_at: string;
          id?: string;
          patient_id: string;
          revoked_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          patient_id?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "guardian_invites_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "guardian_invites_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "guardian_invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "guardian_invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "guardian_invites_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patient_cards_for_donor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guardian_invites_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          push_enabled: boolean;
          type: string;
          user_id: string;
        };
        Insert: {
          push_enabled?: boolean;
          type: string;
          user_id: string;
        };
        Update: {
          push_enabled?: boolean;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          params: NonNullable<Json>;
          pushed_at: string | null;
          read_at: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          params?: NonNullable<Json>;
          pushed_at?: string | null;
          read_at?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          params?: NonNullable<Json>;
          pushed_at?: string | null;
          read_at?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      organization_verifications: {
        Row: {
          created_at: string;
          id: string;
          method:
            | Database["public"]["Enums"]["organization_verification_method"]
            | null;
          note: string | null;
          organization_id: string;
          status: Database["public"]["Enums"]["organization_verification_status"];
          verified_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          method?:
            | Database["public"]["Enums"]["organization_verification_method"]
            | null;
          note?: string | null;
          organization_id: string;
          status: Database["public"]["Enums"]["organization_verification_status"];
          verified_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          method?:
            | Database["public"]["Enums"]["organization_verification_method"]
            | null;
          note?: string | null;
          organization_id?: string;
          status?: Database["public"]["Enums"]["organization_verification_status"];
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_verifications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_verifications_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "organization_verifications_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      organizations: {
        Row: {
          address: string | null;
          created_at: string;
          created_by: string | null;
          district_id: number;
          id: string;
          last_verified_at: string | null;
          latitude: number | null;
          longitude: number | null;
          name: string;
          name_bn: string | null;
          opening_hours: string | null;
          phone: string | null;
          reverify_reminded_at: string | null;
          services: string | null;
          type: Database["public"]["Enums"]["organization_type"];
          updated_at: string;
          verification_method:
            | Database["public"]["Enums"]["organization_verification_method"]
            | null;
          verification_note: string | null;
          verification_status: Database["public"]["Enums"]["organization_verification_status"];
          verified_by: string | null;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          district_id: number;
          id?: string;
          last_verified_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          name_bn?: string | null;
          opening_hours?: string | null;
          phone?: string | null;
          reverify_reminded_at?: string | null;
          services?: string | null;
          type: Database["public"]["Enums"]["organization_type"];
          updated_at?: string;
          verification_method?:
            | Database["public"]["Enums"]["organization_verification_method"]
            | null;
          verification_note?: string | null;
          verification_status?: Database["public"]["Enums"]["organization_verification_status"];
          verified_by?: string | null;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          district_id?: number;
          id?: string;
          last_verified_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          name_bn?: string | null;
          opening_hours?: string | null;
          phone?: string | null;
          reverify_reminded_at?: string | null;
          services?: string | null;
          type?: Database["public"]["Enums"]["organization_type"];
          updated_at?: string;
          verification_method?:
            | Database["public"]["Enums"]["organization_verification_method"]
            | null;
          verification_note?: string | null;
          verification_status?: Database["public"]["Enums"]["organization_verification_status"];
          verified_by?: string | null;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "organizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "organizations_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organizations_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "organizations_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      patient_donor_connections: {
        Row: {
          created_at: string;
          donor_id: string;
          end_reason: string | null;
          id: string;
          initiated_by: Database["public"]["Enums"]["connection_initiator"];
          patient_id: string;
          status: Database["public"]["Enums"]["connection_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          tier: Database["public"]["Enums"]["connection_tier"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          donor_id: string;
          end_reason?: string | null;
          id?: string;
          initiated_by: Database["public"]["Enums"]["connection_initiator"];
          patient_id: string;
          status?: Database["public"]["Enums"]["connection_status"];
          status_changed_at?: string;
          status_changed_by?: string | null;
          tier?: Database["public"]["Enums"]["connection_tier"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          donor_id?: string;
          end_reason?: string | null;
          id?: string;
          initiated_by?: Database["public"]["Enums"]["connection_initiator"];
          patient_id?: string;
          status?: Database["public"]["Enums"]["connection_status"];
          status_changed_at?: string;
          status_changed_by?: string | null;
          tier?: Database["public"]["Enums"]["connection_tier"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_donor_connections_donor_id_fkey";
            columns: ["donor_id"];
            isOneToOne: false;
            referencedRelation: "donor_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "patient_donor_connections_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patient_cards_for_donor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_donor_connections_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_donor_connections_status_changed_by_fkey";
            columns: ["status_changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "patient_donor_connections_status_changed_by_fkey";
            columns: ["status_changed_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      patient_managers: {
        Row: {
          created_at: string;
          is_primary: boolean;
          patient_id: string;
          relation: Database["public"]["Enums"]["manager_relation"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          is_primary?: boolean;
          patient_id: string;
          relation: Database["public"]["Enums"]["manager_relation"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          is_primary?: boolean;
          patient_id?: string;
          relation?: Database["public"]["Enums"]["manager_relation"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_managers_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patient_cards_for_donor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_managers_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_managers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "patient_managers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      patients: {
        Row: {
          archived_at: string | null;
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at: string;
          created_by: string;
          display_name: string;
          district_id: number;
          id: string;
          invite_code: string;
          next_transfusion_date: string | null;
          show_area: boolean;
          show_next_transfusion: boolean;
          show_thalassemia_type: boolean;
          show_treating_centre: boolean;
          thalassemia_type: string | null;
          treating_centre: string | null;
          treating_organization_id: string | null;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          area?: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at?: string;
          created_by: string;
          display_name: string;
          district_id: number;
          id?: string;
          invite_code: string;
          next_transfusion_date?: string | null;
          show_area?: boolean;
          show_next_transfusion?: boolean;
          show_thalassemia_type?: boolean;
          show_treating_centre?: boolean;
          thalassemia_type?: string | null;
          treating_centre?: string | null;
          treating_organization_id?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          area?: string | null;
          blood_group?: Database["public"]["Enums"]["blood_group"];
          created_at?: string;
          created_by?: string;
          display_name?: string;
          district_id?: number;
          id?: string;
          invite_code?: string;
          next_transfusion_date?: string | null;
          show_area?: boolean;
          show_next_transfusion?: boolean;
          show_thalassemia_type?: boolean;
          show_treating_centre?: boolean;
          thalassemia_type?: string | null;
          treating_centre?: string | null;
          treating_organization_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "patients_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "patients_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patients_treating_organization_id_fkey";
            columns: ["treating_organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          area: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          district_id: number | null;
          language: string;
          onboarded_at: string | null;
          phone: string | null;
          preferred_contact: Database["public"]["Enums"]["contact_method"];
          share_contact_on_accept: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          area?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name: string;
          district_id?: number | null;
          language?: string;
          onboarded_at?: string | null;
          phone?: string | null;
          preferred_contact?: Database["public"]["Enums"]["contact_method"];
          share_contact_on_accept?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          area?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          district_id?: number | null;
          language?: string;
          onboarded_at?: string | null;
          phone?: string | null;
          preferred_contact?: Database["public"]["Enums"]["contact_method"];
          share_contact_on_accept?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          platform: string;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          platform?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      reports: {
        Row: {
          comment_id: string | null;
          created_at: string;
          details: string | null;
          id: string;
          post_id: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["report_status"];
        };
        Insert: {
          comment_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          post_id?: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
        };
        Update: {
          comment_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          post_id?: string | null;
          reason?: Database["public"]["Enums"]["report_reason"];
          reporter_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
        };
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "community_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          granted_by: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          granted_by?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          granted_by?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
    };
    Views: {
      patient_cards_for_donor: {
        Row: {
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"] | null;
          display_name: string | null;
          district_id: number | null;
          id: string | null;
          next_transfusion_date: string | null;
          thalassemia_type: string | null;
          treating_centre: string | null;
        };
        Insert: {
          area?: never;
          blood_group?: Database["public"]["Enums"]["blood_group"] | null;
          display_name?: string | null;
          district_id?: number | null;
          id?: string | null;
          next_transfusion_date?: never;
          thalassemia_type?: never;
          treating_centre?: never;
        };
        Update: {
          area?: never;
          blood_group?: Database["public"]["Enums"]["blood_group"] | null;
          display_name?: string | null;
          district_id?: number | null;
          id?: string | null;
          next_transfusion_date?: never;
          thalassemia_type?: never;
          treating_centre?: never;
        };
        Relationships: [
          {
            foreignKeyName: "patients_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
        ];
      };
      public_profiles: {
        Row: {
          display_name: string | null;
          user_id: string | null;
        };
        Insert: {
          display_name?: string | null;
          user_id?: string | null;
        };
        Update: {
          display_name?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_community_guidelines: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      accept_guardian_invite: { Args: { code: string }; Returns: string };
      add_role: {
        Args: { role: Database["public"]["Enums"]["app_role"] };
        Returns: undefined;
      };
      admin_get_content: { Args: { content_id: string }; Returns: Json };
      admin_list_content: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category: Database["public"]["Enums"]["awareness_category"];
          drafted_by: string;
          id: string;
          kind: Database["public"]["Enums"]["content_kind"];
          next_review_due: string;
          published_at: string;
          review_status: Database["public"]["Enums"]["content_review_status"];
          reviewed_at: string;
          slug: string;
          source_count: number;
          title_bn: string;
          title_en: string;
          updated_at: string;
        }[];
      };
      admin_list_organizations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          address: string | null;
          created_at: string;
          created_by: string | null;
          district_id: number;
          id: string;
          last_verified_at: string | null;
          latitude: number | null;
          longitude: number | null;
          name: string;
          name_bn: string | null;
          opening_hours: string | null;
          phone: string | null;
          reverify_reminded_at: string | null;
          services: string | null;
          type: Database["public"]["Enums"]["organization_type"];
          updated_at: string;
          verification_method:
            | Database["public"]["Enums"]["organization_verification_method"]
            | null;
          verification_note: string | null;
          verification_status: Database["public"]["Enums"]["organization_verification_status"];
          verified_by: string | null;
          website: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "organizations";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      admin_request_overview: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_search_users: {
        Args: { max_rows?: number; query?: string };
        Returns: {
          created_at: string;
          deleted: boolean;
          display_name: string;
          email: string;
          roles: Database["public"]["Enums"]["app_role"][];
          user_id: string;
        }[];
      };
      admin_set_content_sources: {
        Args: { content_id: string; source_ids: string[] };
        Returns: undefined;
      };
      admin_set_organization_verification: {
        Args: {
          method?: Database["public"]["Enums"]["organization_verification_method"];
          note?: string;
          organization_id: string;
          status: Database["public"]["Enums"]["organization_verification_status"];
        };
        Returns: {
          address: string | null;
          created_at: string;
          created_by: string | null;
          district_id: number;
          id: string;
          last_verified_at: string | null;
          latitude: number | null;
          longitude: number | null;
          name: string;
          name_bn: string | null;
          opening_hours: string | null;
          phone: string | null;
          reverify_reminded_at: string | null;
          services: string | null;
          type: Database["public"]["Enums"]["organization_type"];
          updated_at: string;
          verification_method:
            | Database["public"]["Enums"]["organization_verification_method"]
            | null;
          verification_note: string | null;
          verification_status: Database["public"]["Enums"]["organization_verification_status"];
          verified_by: string | null;
          website: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "organizations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_set_user_role: {
        Args: {
          granted: boolean;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Returns: undefined;
      };
      admin_transition_content: {
        Args: {
          content_id: string;
          note?: string;
          to_status: Database["public"]["Enums"]["content_review_status"];
        };
        Returns: {
          body_bn: string;
          body_en: string;
          category: Database["public"]["Enums"]["awareness_category"];
          created_at: string;
          drafted_by: string;
          id: string;
          kind: Database["public"]["Enums"]["content_kind"];
          last_edited_by: string | null;
          next_review_due: string | null;
          published_at: string | null;
          review_note: string | null;
          review_reminded_at: string | null;
          review_status: Database["public"]["Enums"]["content_review_status"];
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          sort_order: number;
          summary_bn: string | null;
          summary_en: string | null;
          title_bn: string;
          title_en: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "awareness_content";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_update_setting: {
        Args: { key: string; value: Json };
        Returns: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        SetofOptions: {
          from: "*";
          to: "app_settings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_upsert_content: {
        Args: {
          body_bn: string;
          body_en: string;
          category: Database["public"]["Enums"]["awareness_category"];
          content_id: string;
          kind: Database["public"]["Enums"]["content_kind"];
          slug: string;
          sort_order?: number;
          summary_bn?: string;
          summary_en?: string;
          title_bn: string;
          title_en: string;
        };
        Returns: {
          body_bn: string;
          body_en: string;
          category: Database["public"]["Enums"]["awareness_category"];
          created_at: string;
          drafted_by: string;
          id: string;
          kind: Database["public"]["Enums"]["content_kind"];
          last_edited_by: string | null;
          next_review_due: string | null;
          published_at: string | null;
          review_note: string | null;
          review_reminded_at: string | null;
          review_status: Database["public"]["Enums"]["content_review_status"];
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          sort_order: number;
          summary_bn: string | null;
          summary_en: string | null;
          title_bn: string;
          title_en: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "awareness_content";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_upsert_content_source: {
        Args: {
          accessed_at?: string;
          organization?: string;
          source_id: string;
          title: string;
          url: string;
        };
        Returns: {
          accessed_at: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          organization: string | null;
          title: string;
          updated_at: string;
          url: string;
        };
        SetofOptions: {
          from: "*";
          to: "content_sources";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_upsert_organization: {
        Args: {
          address?: string;
          district_id: number;
          latitude?: number;
          longitude?: number;
          name: string;
          name_bn?: string;
          opening_hours?: string;
          organization_id: string;
          phone?: string;
          services?: string;
          type: Database["public"]["Enums"]["organization_type"];
          website?: string;
        };
        Returns: {
          address: string | null;
          created_at: string;
          created_by: string | null;
          district_id: number;
          id: string;
          last_verified_at: string | null;
          latitude: number | null;
          longitude: number | null;
          name: string;
          name_bn: string | null;
          opening_hours: string | null;
          phone: string | null;
          reverify_reminded_at: string | null;
          services: string | null;
          type: Database["public"]["Enums"]["organization_type"];
          updated_at: string;
          verification_method:
            | Database["public"]["Enums"]["organization_verification_method"]
            | null;
          verification_note: string | null;
          verification_status: Database["public"]["Enums"]["organization_verification_status"];
          verified_by: string | null;
          website: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "organizations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      assert_can_post_in_community: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      assert_verified_organization: {
        Args: { p_organization_id: string };
        Returns: undefined;
      };
      bd_date: { Args: { ts: string }; Returns: string };
      block_user: { Args: { user_id: string }; Returns: undefined };
      cancel_blood_request: {
        Args: { reason?: string; request_id: string };
        Returns: {
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          cancel_reason: string | null;
          closed_at: string | null;
          component: string | null;
          created_at: string;
          created_by: string;
          current_tier: Database["public"]["Enums"]["request_tier"];
          district_id: number;
          emergency_acknowledged_at: string | null;
          id: string;
          is_emergency: boolean;
          notes: string | null;
          organization_id: string | null;
          patient_id: string;
          published_at: string | null;
          required_at: string;
          status: Database["public"]["Enums"]["request_status"];
          tier_changed_at: string | null;
          treating_centre: string;
          units_needed: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "blood_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cancel_connection_request: {
        Args: { connection_id: string };
        Returns: {
          created_at: string;
          donor_id: string;
          end_reason: string | null;
          id: string;
          initiated_by: Database["public"]["Enums"]["connection_initiator"];
          patient_id: string;
          status: Database["public"]["Enums"]["connection_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          tier: Database["public"]["Enums"]["connection_tier"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patient_donor_connections";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      community_setting_int: {
        Args: { p_default: number; p_key: string };
        Returns: number;
      };
      complete_onboarding: {
        Args: {
          area?: string;
          display_name: string;
          district_id?: number;
          language?: string;
          phone?: string;
          roles: Database["public"]["Enums"]["app_role"][];
          share_contact_on_accept?: boolean;
        };
        Returns: {
          area: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          district_id: number | null;
          language: string;
          onboarded_at: string | null;
          phone: string | null;
          preferred_contact: Database["public"]["Enums"]["contact_method"];
          share_contact_on_accept: boolean;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      confirm_donation: {
        Args: { donated_on: string; response_id: string };
        Returns: {
          confirmed_at: string;
          confirmed_by: string;
          created_at: string;
          donated_on: string;
          donor_id: string;
          id: string;
          patient_id: string;
          request_id: string;
          response_id: string;
          verification: Database["public"]["Enums"]["donation_verification"];
        };
        SetofOptions: {
          from: "*";
          to: "donations";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_blood_request: {
        Args: {
          area?: string;
          blood_group?: Database["public"]["Enums"]["blood_group"];
          component?: string;
          district_id: number;
          is_emergency?: boolean;
          notes?: string;
          patient_id: string;
          required_at: string;
          treating_centre: string;
          units_needed?: number;
        };
        Returns: {
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          cancel_reason: string | null;
          closed_at: string | null;
          component: string | null;
          created_at: string;
          created_by: string;
          current_tier: Database["public"]["Enums"]["request_tier"];
          district_id: number;
          emergency_acknowledged_at: string | null;
          id: string;
          is_emergency: boolean;
          notes: string | null;
          organization_id: string | null;
          patient_id: string;
          published_at: string | null;
          required_at: string;
          status: Database["public"]["Enums"]["request_status"];
          tier_changed_at: string | null;
          treating_centre: string;
          units_needed: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "blood_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_community_comment: {
        Args: { body: string; post_id: string };
        Returns: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_note: string | null;
          post_id: string;
          report_count: number;
          status: Database["public"]["Enums"]["community_content_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "community_comments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_community_post: {
        Args: {
          body: string;
          title: string;
          topic: Database["public"]["Enums"]["community_topic"];
        };
        Returns: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_note: string | null;
          report_count: number;
          status: Database["public"]["Enums"]["community_content_status"];
          title: string;
          topic: Database["public"]["Enums"]["community_topic"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "community_posts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_guardian_invite: {
        Args: { patient_id: string };
        Returns: {
          accepted_at: string | null;
          accepted_by: string | null;
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          patient_id: string;
          revoked_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "guardian_invites";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_patient: {
        Args: {
          area?: string;
          as_self?: boolean;
          blood_group: Database["public"]["Enums"]["blood_group"];
          display_name: string;
          district_id: number;
          next_transfusion_date?: string;
          show_area?: boolean;
          show_next_transfusion?: boolean;
          show_thalassemia_type?: boolean;
          show_treating_centre?: boolean;
          thalassemia_type?: string;
          treating_centre?: string;
        };
        Returns: {
          archived_at: string | null;
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at: string;
          created_by: string;
          display_name: string;
          district_id: number;
          id: string;
          invite_code: string;
          next_transfusion_date: string | null;
          show_area: boolean;
          show_next_transfusion: boolean;
          show_thalassemia_type: boolean;
          show_treating_centre: boolean;
          thalassemia_type: string | null;
          treating_centre: string | null;
          treating_organization_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patients";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      delete_community_comment: {
        Args: { comment_id: string };
        Returns: undefined;
      };
      delete_community_post: { Args: { post_id: string }; Returns: undefined };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      enqueue_notification: {
        Args: {
          p_entity_id: string;
          p_entity_type: string;
          p_params?: Json;
          p_type: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      ensure_primary_manager: {
        Args: { p_patient_id: string };
        Returns: undefined;
      };
      export_my_data: { Args: Record<PropertyKey, never>; Returns: Json };
      generate_guardian_invite_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      generate_invite_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_community_post: {
        Args: { post_id: string };
        Returns: {
          author_id: string;
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          is_mine: boolean;
          reported_by_me: boolean;
          status: Database["public"]["Enums"]["community_content_status"];
          title: string;
          topic: Database["public"]["Enums"]["community_topic"];
        }[];
      };
      get_connection_parties: {
        Args: { connection_id: string };
        Returns: {
          donor_availability: Database["public"]["Enums"]["donor_availability"];
          donor_blood_group: Database["public"]["Enums"]["blood_group"];
          donor_display_name: string;
          patient_blood_group: Database["public"]["Enums"]["blood_group"];
          patient_display_name: string;
          patient_district_id: number;
        }[];
      };
      get_my_donation_history: {
        Args: Record<PropertyKey, never>;
        Returns: {
          appreciation_created_at: string;
          appreciation_id: string;
          appreciation_message: string;
          donated_on: string;
          donation_id: string;
          patient_display_name: string;
          verification: Database["public"]["Enums"]["donation_verification"];
        }[];
      };
      get_patient_donation_history: {
        Args: { patient_id: string };
        Returns: {
          appreciation_sent: boolean;
          donated_on: string;
          donation_id: string;
          donor_deleted: boolean;
          donor_display_name: string;
          request_id: string;
          verification: Database["public"]["Enums"]["donation_verification"];
        }[];
      };
      get_patient_managers: {
        Args: { patient_id: string };
        Returns: {
          display_name: string;
          is_me: boolean;
          is_primary: boolean;
          relation: Database["public"]["Enums"]["manager_relation"];
          user_id: string;
        }[];
      };
      get_request_for_donor: {
        Args: { request_id: string };
        Returns: {
          area: string;
          blood_group: Database["public"]["Enums"]["blood_group"];
          component: string;
          district_id: number;
          id: string;
          is_emergency: boolean;
          my_response_status: Database["public"]["Enums"]["response_status"];
          patient_display_name: string;
          required_at: string;
          status: Database["public"]["Enums"]["request_status"];
          treating_centre: string;
          units_needed: number;
        }[];
      };
      get_response_contact: {
        Args: { response_id: string };
        Returns: {
          donor_phone: string;
          donor_preferred_contact: Database["public"]["Enums"]["contact_method"];
          manager_phone: string;
          manager_preferred_contact: Database["public"]["Enums"]["contact_method"];
        }[];
      };
      has_accepted_community_guidelines: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      has_role: {
        Args: { target_role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
      hide_appreciation: {
        Args: { appreciation_id: string };
        Returns: undefined;
      };
      invite_broad_donor: {
        Args: { donor_id: string; request_id: string };
        Returns: {
          created_at: string;
          donor_id: string;
          donor_reported_donated_at: string | null;
          id: string;
          invited_via: Database["public"]["Enums"]["request_tier"];
          reason: string | null;
          request_id: string;
          responded_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["response_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "donor_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      invite_connected_donors: {
        Args: {
          p_request: Database["public"]["Tables"]["blood_requests"]["Row"];
          p_tiers: Database["public"]["Enums"]["connection_tier"][];
        };
        Returns: number;
      };
      invite_donor_to_request: {
        Args: {
          p_donor_id: string;
          p_request: Database["public"]["Tables"]["blood_requests"]["Row"];
          p_via: Database["public"]["Enums"]["request_tier"];
        };
        Returns: boolean;
      };
      invite_emergency_donors: {
        Args: { p_request_id: string };
        Returns: number;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_blocked_between: { Args: { other_user_id: string }; Returns: boolean };
      is_broad_eligible_donor: {
        Args: {
          p_donor_id: string;
          p_emergency: boolean;
          p_include_division: boolean;
          p_request: Database["public"]["Tables"]["blood_requests"]["Row"];
        };
        Returns: boolean;
      };
      is_connected_donor: {
        Args: { target_patient_id: string };
        Returns: boolean;
      };
      is_invited_donor: {
        Args: { target_request_id: string };
        Returns: boolean;
      };
      is_patient_manager: {
        Args: { target_patient_id: string };
        Returns: boolean;
      };
      list_blocked_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          display_name: string;
          user_id: string;
        }[];
      };
      list_community_comments: {
        Args: { post_id: string };
        Returns: {
          author_id: string;
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          is_mine: boolean;
          reported_by_me: boolean;
          status: Database["public"]["Enums"]["community_content_status"];
        }[];
      };
      list_community_posts: {
        Args: {
          before_created_at?: string;
          page_size?: number;
          topic_filter?: Database["public"]["Enums"]["community_topic"];
        };
        Returns: {
          author_id: string;
          author_name: string;
          body: string;
          comment_count: number;
          created_at: string;
          id: string;
          is_mine: boolean;
          status: Database["public"]["Enums"]["community_content_status"];
          title: string;
          topic: Database["public"]["Enums"]["community_topic"];
        }[];
      };
      list_moderation_queue: {
        Args: Record<PropertyKey, never>;
        Returns: {
          author_id: string;
          author_name: string;
          body: string;
          details: string[];
          has_selling_blood: boolean;
          last_reported_at: string;
          open_reports: number;
          post_id: string;
          reasons: Database["public"]["Enums"]["report_reason"][];
          status: Database["public"]["Enums"]["community_content_status"];
          target_id: string;
          target_type: string;
          title: string;
        }[];
      };
      manages_connected_donor: {
        Args: { target_donor_id: string };
        Returns: boolean;
      };
      manages_request_with_donor: {
        Args: { target_donor_id: string };
        Returns: boolean;
      };
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      mark_notification_read: {
        Args: { id: string };
        Returns: {
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          params: NonNullable<Json>;
          pushed_at: string | null;
          read_at: string | null;
          type: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "notifications";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      moderate_community_content: {
        Args: {
          action: string;
          note?: string;
          target_id: string;
          target_type: string;
        };
        Returns: undefined;
      };
      process_content_review_due: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      process_organization_reverification: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      process_request_timers: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      publish_blood_request: {
        Args: {
          emergency_acknowledged?: boolean;
          notify_emergency_donors?: boolean;
          request_id: string;
        };
        Returns: {
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          cancel_reason: string | null;
          closed_at: string | null;
          component: string | null;
          created_at: string;
          created_by: string;
          current_tier: Database["public"]["Enums"]["request_tier"];
          district_id: number;
          emergency_acknowledged_at: string | null;
          id: string;
          is_emergency: boolean;
          notes: string | null;
          organization_id: string | null;
          patient_id: string;
          published_at: string | null;
          required_at: string;
          status: Database["public"]["Enums"]["request_status"];
          tier_changed_at: string | null;
          treating_centre: string;
          units_needed: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "blood_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      recompute_request_status: {
        Args: { request_id: string };
        Returns: undefined;
      };
      register_push_token: {
        Args: { platform: string; token: string };
        Returns: {
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "push_tokens";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      remove_appreciation: {
        Args: { appreciation_id: string };
        Returns: undefined;
      };
      remove_patient_manager: {
        Args: { patient_id: string; user_id: string };
        Returns: undefined;
      };
      report_community_content: {
        Args: {
          details?: string;
          reason: Database["public"]["Enums"]["report_reason"];
          target_id: string;
          target_type: string;
        };
        Returns: {
          comment_id: string | null;
          created_at: string;
          details: string | null;
          id: string;
          post_id: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["report_status"];
        };
        SetofOptions: {
          from: "*";
          to: "reports";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      report_donated: {
        Args: { response_id: string };
        Returns: {
          created_at: string;
          donor_id: string;
          donor_reported_donated_at: string | null;
          id: string;
          invited_via: Database["public"]["Enums"]["request_tier"];
          reason: string | null;
          request_id: string;
          responded_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["response_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "donor_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      request_connection_by_code: {
        Args: { invite_code: string };
        Returns: {
          created_at: string;
          donor_id: string;
          end_reason: string | null;
          id: string;
          initiated_by: Database["public"]["Enums"]["connection_initiator"];
          patient_id: string;
          status: Database["public"]["Enums"]["connection_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          tier: Database["public"]["Enums"]["connection_tier"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patient_donor_connections";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      request_connection_to_donor: {
        Args: {
          donor_id: string;
          patient_id: string;
          tier?: Database["public"]["Enums"]["connection_tier"];
        };
        Returns: {
          created_at: string;
          donor_id: string;
          end_reason: string | null;
          id: string;
          initiated_by: Database["public"]["Enums"]["connection_initiator"];
          patient_id: string;
          status: Database["public"]["Enums"]["connection_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          tier: Database["public"]["Enums"]["connection_tier"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patient_donor_connections";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      respond_connection: {
        Args: {
          accept: boolean;
          connection_id: string;
          tier?: Database["public"]["Enums"]["connection_tier"];
        };
        Returns: {
          created_at: string;
          donor_id: string;
          end_reason: string | null;
          id: string;
          initiated_by: Database["public"]["Enums"]["connection_initiator"];
          patient_id: string;
          status: Database["public"]["Enums"]["connection_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          tier: Database["public"]["Enums"]["connection_tier"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patient_donor_connections";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      respond_to_request: {
        Args: { accept: boolean; reason?: string; response_id: string };
        Returns: {
          created_at: string;
          donor_id: string;
          donor_reported_donated_at: string | null;
          id: string;
          invited_via: Database["public"]["Enums"]["request_tier"];
          reason: string | null;
          request_id: string;
          responded_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["response_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "donor_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      revoke_guardian_invite: {
        Args: { invite_id: string };
        Returns: {
          accepted_at: string | null;
          accepted_by: string | null;
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          patient_id: string;
          revoked_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "guardian_invites";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      rotate_invite_code: {
        Args: { patient_id: string };
        Returns: {
          archived_at: string | null;
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at: string;
          created_by: string;
          display_name: string;
          district_id: number;
          id: string;
          invite_code: string;
          next_transfusion_date: string | null;
          show_area: boolean;
          show_next_transfusion: boolean;
          show_thalassemia_type: boolean;
          show_treating_centre: boolean;
          thalassemia_type: string | null;
          treating_centre: string | null;
          treating_organization_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patients";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      schedule_donation: {
        Args: { response_id: string; scheduled_at: string };
        Returns: {
          created_at: string;
          donor_id: string;
          donor_reported_donated_at: string | null;
          id: string;
          invited_via: Database["public"]["Enums"]["request_tier"];
          reason: string | null;
          request_id: string;
          responded_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["response_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "donor_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      search_broad_donors: {
        Args: { include_division?: boolean; request_id: string };
        Returns: {
          activity: string;
          area: string;
          display_name: string;
          district_id: number;
          donor_id: string;
        }[];
      };
      send_appreciation: {
        Args: { donation_id: string; message: string };
        Returns: {
          created_at: string;
          donation_id: string;
          hidden_by_recipient_at: string | null;
          id: string;
          message: string;
          recipient_id: string;
          removed_at: string | null;
          removed_by: string | null;
          sender_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "appreciation_messages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_connection_status: {
        Args: {
          connection_id: string;
          new_status: Database["public"]["Enums"]["connection_status"];
          reason?: string;
        };
        Returns: {
          created_at: string;
          donor_id: string;
          end_reason: string | null;
          id: string;
          initiated_by: Database["public"]["Enums"]["connection_initiator"];
          patient_id: string;
          status: Database["public"]["Enums"]["connection_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          tier: Database["public"]["Enums"]["connection_tier"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patient_donor_connections";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_connection_tier: {
        Args: {
          connection_id: string;
          tier: Database["public"]["Enums"]["connection_tier"];
        };
        Returns: {
          created_at: string;
          donor_id: string;
          end_reason: string | null;
          id: string;
          initiated_by: Database["public"]["Enums"]["connection_initiator"];
          patient_id: string;
          status: Database["public"]["Enums"]["connection_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          tier: Database["public"]["Enums"]["connection_tier"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patient_donor_connections";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_patient_organization: {
        Args: { organization_id: string; patient_id: string };
        Returns: {
          archived_at: string | null;
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at: string;
          created_by: string;
          display_name: string;
          district_id: number;
          id: string;
          invite_code: string;
          next_transfusion_date: string | null;
          show_area: boolean;
          show_next_transfusion: boolean;
          show_thalassemia_type: boolean;
          show_treating_centre: boolean;
          thalassemia_type: string | null;
          treating_centre: string | null;
          treating_organization_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patients";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_request_organization: {
        Args: { organization_id: string; request_id: string };
        Returns: {
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          cancel_reason: string | null;
          closed_at: string | null;
          component: string | null;
          created_at: string;
          created_by: string;
          current_tier: Database["public"]["Enums"]["request_tier"];
          district_id: number;
          emergency_acknowledged_at: string | null;
          id: string;
          is_emergency: boolean;
          notes: string | null;
          organization_id: string | null;
          patient_id: string;
          published_at: string | null;
          required_at: string;
          status: Database["public"]["Enums"]["request_status"];
          tier_changed_at: string | null;
          treating_centre: string;
          units_needed: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "blood_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      shares_active_connection: {
        Args: { other_user_id: string };
        Returns: boolean;
      };
      unblock_user: { Args: { user_id: string }; Returns: undefined };
      update_blood_request: {
        Args: {
          area?: string;
          blood_group?: Database["public"]["Enums"]["blood_group"];
          component?: string;
          district_id?: number;
          is_emergency?: boolean;
          notes?: string;
          request_id: string;
          required_at?: string;
          treating_centre?: string;
          units_needed?: number;
        };
        Returns: {
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          cancel_reason: string | null;
          closed_at: string | null;
          component: string | null;
          created_at: string;
          created_by: string;
          current_tier: Database["public"]["Enums"]["request_tier"];
          district_id: number;
          emergency_acknowledged_at: string | null;
          id: string;
          is_emergency: boolean;
          notes: string | null;
          organization_id: string | null;
          patient_id: string;
          published_at: string | null;
          required_at: string;
          status: Database["public"]["Enums"]["request_status"];
          tier_changed_at: string | null;
          treating_centre: string;
          units_needed: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "blood_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_patient: {
        Args: {
          area?: string;
          blood_group?: Database["public"]["Enums"]["blood_group"];
          display_name?: string;
          district_id?: number;
          next_transfusion_date?: string;
          patient_id: string;
          show_area?: boolean;
          show_next_transfusion?: boolean;
          show_thalassemia_type?: boolean;
          show_treating_centre?: boolean;
          thalassemia_type?: string;
          treating_centre?: string;
        };
        Returns: {
          archived_at: string | null;
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at: string;
          created_by: string;
          display_name: string;
          district_id: number;
          id: string;
          invite_code: string;
          next_transfusion_date: string | null;
          show_area: boolean;
          show_next_transfusion: boolean;
          show_thalassemia_type: boolean;
          show_treating_centre: boolean;
          thalassemia_type: string | null;
          treating_centre: string | null;
          treating_organization_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "patients";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      upsert_donor_profile: {
        Args: {
          availability?: Database["public"]["Enums"]["donor_availability"];
          available_from?: string;
          blood_group: Database["public"]["Enums"]["blood_group"];
          emergency_available?: boolean;
          searchable?: boolean;
        };
        Returns: {
          availability: Database["public"]["Enums"]["donor_availability"];
          available_from: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          created_at: string;
          emergency_available: boolean;
          last_donation_date: string | null;
          searchable: boolean;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "donor_profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      widen_request_search: {
        Args: { request_id: string };
        Returns: {
          area: string | null;
          blood_group: Database["public"]["Enums"]["blood_group"];
          cancel_reason: string | null;
          closed_at: string | null;
          component: string | null;
          created_at: string;
          created_by: string;
          current_tier: Database["public"]["Enums"]["request_tier"];
          district_id: number;
          emergency_acknowledged_at: string | null;
          id: string;
          is_emergency: boolean;
          notes: string | null;
          organization_id: string | null;
          patient_id: string;
          published_at: string | null;
          required_at: string;
          status: Database["public"]["Enums"]["request_status"];
          tier_changed_at: string | null;
          treating_centre: string;
          units_needed: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "blood_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      withdraw_response: {
        Args: { reason?: string; response_id: string };
        Returns: {
          created_at: string;
          donor_id: string;
          donor_reported_donated_at: string | null;
          id: string;
          invited_via: Database["public"]["Enums"]["request_tier"];
          reason: string | null;
          request_id: string;
          responded_at: string | null;
          scheduled_at: string | null;
          status: Database["public"]["Enums"]["response_status"];
          status_changed_at: string;
          status_changed_by: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "donor_responses";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      write_audit: {
        Args: {
          p_action: string;
          p_new_data: Json;
          p_old_data: Json;
          p_row_id: string;
          p_table_name: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "patient" | "guardian" | "donor" | "organization" | "admin";
      awareness_category:
        | "what_is_thalassemia"
        | "what_is_carrier"
        | "why_screening"
        | "both_carriers"
        | "genetic_counselling"
        | "screening"
        | "family_awareness"
        | "living_with_thalassemia"
        | "medicines";
      blood_group:
        | "A_POS"
        | "A_NEG"
        | "B_POS"
        | "B_NEG"
        | "AB_POS"
        | "AB_NEG"
        | "O_POS"
        | "O_NEG";
      community_content_status: "published" | "hidden" | "removed" | "deleted";
      community_topic:
        | "treatment_centre_experience"
        | "transfusion_experience"
        | "managing_transfusions"
        | "family_experience"
        | "emotional_support"
        | "support_resources"
        | "newly_diagnosed"
        | "questions";
      connection_initiator: "patient_side" | "donor";
      connection_status:
        | "requested"
        | "active"
        | "declined"
        | "cancelled"
        | "paused"
        | "removed";
      connection_tier: "regular" | "backup";
      contact_method: "phone" | "whatsapp" | "in_app";
      content_kind: "article" | "faq" | "medicine";
      content_review_status:
        "draft" | "in_review" | "approved" | "published" | "retired";
      donation_verification: "guardian_confirmed" | "org_verified";
      donor_availability: "available" | "unavailable" | "paused";
      manager_relation: "self" | "guardian";
      organization_type:
        | "treatment_centre"
        | "hospital"
        | "blood_bank"
        | "diagnostic_centre"
        | "genetic_counselling"
        | "support_org";
      organization_verification_method:
        "phone_call" | "official_website" | "in_person" | "official_document";
      organization_verification_status:
        "pending" | "verified" | "stale" | "rejected";
      report_reason:
        | "selling_blood"
        | "medical_misinformation"
        | "harassment"
        | "privacy"
        | "spam"
        | "other";
      report_status: "open" | "actioned" | "dismissed";
      request_status:
        | "draft"
        | "open"
        | "responding"
        | "partially_fulfilled"
        | "fulfilled"
        | "cancelled"
        | "expired";
      request_tier: "regular" | "backup" | "broad";
      response_status:
        | "invited"
        | "accepted"
        | "declined"
        | "donation_pending"
        | "completed"
        | "cancelled"
        | "expired";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["patient", "guardian", "donor", "organization", "admin"],
      awareness_category: [
        "what_is_thalassemia",
        "what_is_carrier",
        "why_screening",
        "both_carriers",
        "genetic_counselling",
        "screening",
        "family_awareness",
        "living_with_thalassemia",
        "medicines",
      ],
      blood_group: [
        "A_POS",
        "A_NEG",
        "B_POS",
        "B_NEG",
        "AB_POS",
        "AB_NEG",
        "O_POS",
        "O_NEG",
      ],
      community_content_status: ["published", "hidden", "removed", "deleted"],
      community_topic: [
        "treatment_centre_experience",
        "transfusion_experience",
        "managing_transfusions",
        "family_experience",
        "emotional_support",
        "support_resources",
        "newly_diagnosed",
        "questions",
      ],
      connection_initiator: ["patient_side", "donor"],
      connection_status: [
        "requested",
        "active",
        "declined",
        "cancelled",
        "paused",
        "removed",
      ],
      connection_tier: ["regular", "backup"],
      contact_method: ["phone", "whatsapp", "in_app"],
      content_kind: ["article", "faq", "medicine"],
      content_review_status: [
        "draft",
        "in_review",
        "approved",
        "published",
        "retired",
      ],
      donation_verification: ["guardian_confirmed", "org_verified"],
      donor_availability: ["available", "unavailable", "paused"],
      manager_relation: ["self", "guardian"],
      organization_type: [
        "treatment_centre",
        "hospital",
        "blood_bank",
        "diagnostic_centre",
        "genetic_counselling",
        "support_org",
      ],
      organization_verification_method: [
        "phone_call",
        "official_website",
        "in_person",
        "official_document",
      ],
      organization_verification_status: [
        "pending",
        "verified",
        "stale",
        "rejected",
      ],
      report_reason: [
        "selling_blood",
        "medical_misinformation",
        "harassment",
        "privacy",
        "spam",
        "other",
      ],
      report_status: ["open", "actioned", "dismissed"],
      request_status: [
        "draft",
        "open",
        "responding",
        "partially_fulfilled",
        "fulfilled",
        "cancelled",
        "expired",
      ],
      request_tier: ["regular", "backup", "broad"],
      response_status: [
        "invited",
        "accepted",
        "declined",
        "donation_pending",
        "completed",
        "cancelled",
        "expired",
      ],
    },
  },
} as const;
