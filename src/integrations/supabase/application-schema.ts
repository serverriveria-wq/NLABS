// Application contract preserved from the source project.
// This describes required tables; it does not imply the connected database has been migrated.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_units: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          network: string
          order_index: number
          placement: string
          position: string
        }
        Insert: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          network?: string
          order_index?: number
          placement?: string
          position?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          network?: string
          order_index?: number
          placement?: string
          position?: string
        }
        Relationships: []
      }
      announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string
          emoji: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          emoji: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          emoji?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string | null
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          pinned: boolean
          title: string
          updated_at: string
          url: string | null
          url_label: string | null
        }
        Insert: {
          body?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          pinned?: boolean
          title: string
          updated_at?: string
          url?: string | null
          url_label?: string | null
        }
        Update: {
          body?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          pinned?: boolean
          title?: string
          updated_at?: string
          url?: string | null
          url_label?: string | null
        }
        Relationships: []
      }
      auth_page_settings: {
        Row: {
          background_gradient: string | null
          background_url: string | null
          email_label: string
          email_placeholder: string
          id: boolean
          identifier_label: string
          identifier_placeholder: string
          logo_url: string | null
          notice: string | null
          password_label: string
          password_placeholder: string
          show_back_link: boolean
          signin_button: string
          signup_button: string
          subtitle: string
          tab_signin_label: string
          tab_signup_label: string
          title: string
          updated_at: string
          username_label: string
          username_placeholder: string
        }
        Insert: {
          background_gradient?: string | null
          background_url?: string | null
          email_label?: string
          email_placeholder?: string
          id?: boolean
          identifier_label?: string
          identifier_placeholder?: string
          logo_url?: string | null
          notice?: string | null
          password_label?: string
          password_placeholder?: string
          show_back_link?: boolean
          signin_button?: string
          signup_button?: string
          subtitle?: string
          tab_signin_label?: string
          tab_signup_label?: string
          title?: string
          updated_at?: string
          username_label?: string
          username_placeholder?: string
        }
        Update: {
          background_gradient?: string | null
          background_url?: string | null
          email_label?: string
          email_placeholder?: string
          id?: boolean
          identifier_label?: string
          identifier_placeholder?: string
          logo_url?: string | null
          notice?: string | null
          password_label?: string
          password_placeholder?: string
          show_back_link?: boolean
          signin_button?: string
          signup_button?: string
          subtitle?: string
          tab_signin_label?: string
          tab_signup_label?: string
          title?: string
          updated_at?: string
          username_label?: string
          username_placeholder?: string
        }
        Relationships: []
      }
      dependency_types: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          label: string
          order_index: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          label: string
          order_index?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          label?: string
          order_index?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      difficulty_levels: {
        Row: {
          color: string | null
          created_at: string
          icon_url: string | null
          id: string
          label: string
          order_index: number
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon_url?: string | null
          id?: string
          label: string
          order_index?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon_url?: string | null
          id?: string
          label?: string
          order_index?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      link_types: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          label: string
          order_index: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          label: string
          order_index?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          label?: string
          order_index?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      modalities: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          project_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          project_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          project_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          avatar_url: string | null
          badge_gradient: Json | null
          badge_label: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          joined_at: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          badge_gradient?: Json | null
          badge_label?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          joined_at?: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          badge_gradient?: Json | null
          badge_label?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          joined_at?: string
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      project_activity: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json
          project_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          project_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_chat_attachments: {
        Row: {
          created_at: string
          id: string
          kind: string
          message_id: string
          name: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message_id: string
          name?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message_id?: string
          name?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "project_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_chat_messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          pinned: boolean
          project_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          project_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_chat_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comment_attachments: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          url: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_dependencies: {
        Row: {
          created_at: string
          dependency_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          dependency_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          dependency_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_dependencies_dependency_id_fkey"
            columns: ["dependency_id"]
            isOneToOne: false
            referencedRelation: "dependency_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_favorites: {
        Row: {
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          size_bytes: number | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_gallery: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_index: number
          project_id: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          project_id: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          project_id?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_gallery_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_join_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          project_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_join_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          label: string | null
          link_type_id: string | null
          project_id: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string | null
          link_type_id?: string | null
          project_id: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string | null
          link_type_id?: string | null
          project_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_links_link_type_id_fkey"
            columns: ["link_type_id"]
            isOneToOne: false
            referencedRelation: "link_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          contribution_pct: number
          created_at: string
          id: string
          modality_id: string | null
          project_id: string
          role_label: string | null
          status: string
          user_id: string
        }
        Insert: {
          contribution_pct?: number
          created_at?: string
          id?: string
          modality_id?: string | null
          project_id: string
          role_label?: string | null
          status?: string
          user_id: string
        }
        Update: {
          contribution_pct?: number
          created_at?: string
          id?: string
          modality_id?: string | null
          project_id?: string
          role_label?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_progress_history: {
        Row: {
          changed_by: string | null
          created_at: string
          gd_share_url: string | null
          id: string
          note: string | null
          progress: number
          project_id: string
          version_label: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          gd_share_url?: string | null
          id?: string
          note?: string | null
          progress: number
          project_id: string
          version_label?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          gd_share_url?: string | null
          id?: string
          note?: string | null
          progress?: number
          project_id?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          done: boolean
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          done?: boolean
          id?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          done?: boolean
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_views: {
        Row: {
          created_at: string
          id: string
          project_id: string
          view_date: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          view_date?: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          view_date?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          banner_url: string | null
          cohost_id: string | null
          created_at: string
          created_by: string
          credits: string | null
          deadline: string | null
          decoration_pct: number
          description: string | null
          difficulty: string | null
          duration_seconds: number | null
          gameplay_pct: number
          host_id: string | null
          id: string
          layout_pct: number
          name: string
          name_segments: Json | null
          notes: string | null
          preview_button_image_url: string | null
          preview_video_url: string | null
          progress: number
          required_modalities: string[]
          slug: string | null
          song_name: string | null
          song_url: string | null
          status: Database["public"]["Enums"]["project_status"]
          style: string | null
          tags: string[]
          thumbnail_url: string | null
          track_progress_history: boolean
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string
          verification_pct: number
          views_count: number
          visibility: string
        }
        Insert: {
          banner_url?: string | null
          cohost_id?: string | null
          created_at?: string
          created_by: string
          credits?: string | null
          deadline?: string | null
          decoration_pct?: number
          description?: string | null
          difficulty?: string | null
          duration_seconds?: number | null
          gameplay_pct?: number
          host_id?: string | null
          id?: string
          layout_pct?: number
          name: string
          name_segments?: Json | null
          notes?: string | null
          preview_button_image_url?: string | null
          preview_video_url?: string | null
          progress?: number
          required_modalities?: string[]
          slug?: string | null
          song_name?: string | null
          song_url?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          style?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          track_progress_history?: boolean
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          verification_pct?: number
          views_count?: number
          visibility?: string
        }
        Update: {
          banner_url?: string | null
          cohost_id?: string | null
          created_at?: string
          created_by?: string
          credits?: string | null
          deadline?: string | null
          decoration_pct?: number
          description?: string | null
          difficulty?: string | null
          duration_seconds?: number | null
          gameplay_pct?: number
          host_id?: string | null
          id?: string
          layout_pct?: number
          name?: string
          name_segments?: Json | null
          notes?: string | null
          preview_button_image_url?: string | null
          preview_video_url?: string | null
          progress?: number
          required_modalities?: string[]
          slug?: string | null
          song_name?: string | null
          song_url?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          style?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          track_progress_history?: boolean
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string
          verification_pct?: number
          views_count?: number
          visibility?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_credits: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          order_index: number
          role: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          order_index?: number
          role?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          order_index?: number
          role?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      site_dedications: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string | null
          order_index: number
          target_name: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          order_index?: number
          target_name?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          order_index?: number
          target_name?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      site_docs: {
        Row: {
          content_md: string
          created_at: string
          id: string
          order_index: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          id?: string
          order_index?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          order_index?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_honors: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          kind: string
          name: string
          order_index: number
          reason: string | null
          role: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          name: string
          order_index?: number
          reason?: string | null
          role?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          name?: string
          order_index?: number
          reason?: string | null
          role?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      site_links: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          order_index: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          order_index?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          order_index?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          adsense_client_id: string | null
          adsense_enabled: boolean
          adsense_slot_id: string | null
          favicon_url: string | null
          id: boolean
          logo_url: string | null
          preview_button_image_url: string | null
          site_name: string | null
          updated_at: string
        }
        Insert: {
          adsense_client_id?: string | null
          adsense_enabled?: boolean
          adsense_slot_id?: string | null
          favicon_url?: string | null
          id?: boolean
          logo_url?: string | null
          preview_button_image_url?: string | null
          site_name?: string | null
          updated_at?: string
        }
        Update: {
          adsense_client_id?: string | null
          adsense_enabled?: boolean
          adsense_slot_id?: string | null
          favicon_url?: string | null
          id?: boolean
          logo_url?: string | null
          preview_button_image_url?: string | null
          site_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_trophies: {
        Row: {
          awarded_at: string | null
          awarded_to: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          order_index: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          awarded_at?: string | null
          awarded_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          order_index?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          awarded_at?: string | null
          awarded_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          order_index?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      site_versions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_index: number
          released_at: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_index?: number
          released_at?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_index?: number
          released_at?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      social_types: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          label: string
          order_index: number
          slug: string
          updated_at: string
          url_prefix: string | null
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          label: string
          order_index?: number
          slug: string
          updated_at?: string
          url_prefix?: string | null
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          label?: string
          order_index?: number
          slug?: string
          updated_at?: string
          url_prefix?: string | null
        }
        Relationships: []
      }
      team_requests: {
        Row: {
          accepted_terms: boolean
          created_at: string
          id: string
          modality_id: string | null
          playtime: string | null
          reason: string
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          accepted_terms?: boolean
          created_at?: string
          id?: string
          modality_id?: string | null
          playtime?: string | null
          reason: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          accepted_terms?: boolean
          created_at?: string
          id?: string
          modality_id?: string | null
          playtime?: string | null
          reason?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_requests_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_requests_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      text_icons: {
        Row: {
          created_at: string
          id: string
          image_url: string
          key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      text_overrides: {
        Row: {
          gradient: Json | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          gradient?: Json | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          gradient?: Json | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_modalities: {
        Row: {
          modality_id: string
          user_id: string
        }
        Insert: {
          modality_id: string
          user_id: string
        }
        Update: {
          modality_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_modalities_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_socials: {
        Row: {
          created_at: string
          id: string
          social_type_id: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          social_type_id: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          social_type_id?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_socials_social_type_id_fkey"
            columns: ["social_type_id"]
            isOneToOne: false
            referencedRelation: "social_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      notify_everyone: {
        Args: {
          _body: string
          _link: string
          _project_id: string
          _title: string
        }
        Returns: undefined
      }
      slugify: { Args: { v: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role:
        | "founder"
        | "owner"
        | "administrator"
        | "moderator"
        | "project_manager"
        | "host"
        | "member"
        | "guest"
      project_status:
        | "active"
        | "paused"
        | "review"
        | "verification"
        | "showcase"
        | "cancelled"
        | "completed"
        | "published"
      project_type:
        | "solo"
        | "mini_collab"
        | "collab"
        | "megacollab"
        | "extreme_demon"
        | "art"
        | "layout"
        | "remake"
        | "contest"
        | "secret"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "founder",
        "owner",
        "administrator",
        "moderator",
        "project_manager",
        "host",
        "member",
        "guest",
      ],
      project_status: [
        "active",
        "paused",
        "review",
        "verification",
        "showcase",
        "cancelled",
        "completed",
        "published",
      ],
      project_type: [
        "solo",
        "mini_collab",
        "collab",
        "megacollab",
        "extreme_demon",
        "art",
        "layout",
        "remake",
        "contest",
        "secret",
      ],
    },
  },
} as const
