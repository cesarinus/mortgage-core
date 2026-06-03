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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blog_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          points: number
          post_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          points?: number
          post_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          points?: number
          post_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          category: string | null
          content_html: string
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          keywords: string[] | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string | null
          content_html?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string | null
          content_html?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_sessions: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          posts_viewed: number
          session_id: string
          total_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          posts_viewed?: number
          session_id: string
          total_score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          posts_viewed?: number
          session_id?: string
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_variant_metrics: {
        Row: {
          created_at: string
          cta_position: string
          cta_text: string
          event_type: string
          id: string
          post_id: string | null
          session_id: string
          sidebar_module: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          cta_position: string
          cta_text: string
          event_type: string
          id?: string
          post_id?: string | null
          session_id: string
          sidebar_module: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          cta_position?: string
          cta_text?: string
          event_type?: string
          id?: string
          post_id?: string | null
          session_id?: string
          sidebar_module?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_variant_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_variant_metrics_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "blog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_variants: {
        Row: {
          created_at: string
          cta_position: string
          cta_text: string
          id: string
          post_id: string | null
          session_id: string
          sidebar_module: string
        }
        Insert: {
          created_at?: string
          cta_position?: string
          cta_text?: string
          id?: string
          post_id?: string | null
          session_id: string
          sidebar_module?: string
        }
        Update: {
          created_at?: string
          cta_position?: string
          cta_text?: string
          id?: string
          post_id?: string | null
          session_id?: string
          sidebar_module?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_variants_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_blackout_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      booking_settings: {
        Row: {
          buffer_minutes: number
          created_at: string
          id: string
          notify_email: string
          slot_minutes: number
          timezone: string
          updated_at: string
          weekday_hours: Json
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string
          id?: string
          notify_email?: string
          slot_minutes?: number
          timezone?: string
          updated_at?: string
          weekday_hours?: Json
        }
        Update: {
          buffer_minutes?: number
          created_at?: string
          id?: string
          notify_email?: string
          slot_minutes?: number
          timezone?: string
          updated_at?: string
          weekday_hours?: Json
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          email: string
          end_at: string
          first_name: string
          id: string
          last_name: string
          lead_id: string | null
          loan_type: string | null
          meeting_type: string
          notes: string | null
          phone: string
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          end_at: string
          first_name: string
          id?: string
          last_name: string
          lead_id?: string | null
          loan_type?: string | null
          meeting_type?: string
          notes?: string | null
          phone: string
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          end_at?: string
          first_name?: string
          id?: string
          last_name?: string
          lead_id?: string | null
          loan_type?: string | null
          meeting_type?: string
          notes?: string | null
          phone?: string
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          first_message_at: string
          id: string
          last_message_at: string
          lead_id: string | null
          messages_count: number
          session_id: string
          total_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_message_at?: string
          id?: string
          last_message_at?: string
          lead_id?: string | null
          messages_count?: number
          session_id: string
          total_score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_message_at?: string
          id?: string
          last_message_at?: string
          lead_id?: string | null
          messages_count?: number
          session_id?: string
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          lead_id: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          lead_id?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lead_id?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      content_change_log: {
        Row: {
          content_hash: string | null
          created_at: string
          id: string
          last_excerpt: string | null
          last_payload: Json | null
          last_result: Json | null
          last_title: string | null
          last_triggered_at: string | null
          last_type: string | null
          trigger_count: number
          updated_at: string
          url: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          id?: string
          last_excerpt?: string | null
          last_payload?: Json | null
          last_result?: Json | null
          last_title?: string | null
          last_triggered_at?: string | null
          last_type?: string | null
          trigger_count?: number
          updated_at?: string
          url: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          id?: string
          last_excerpt?: string | null
          last_payload?: Json | null
          last_result?: Json | null
          last_title?: string | null
          last_triggered_at?: string | null
          last_type?: string | null
          trigger_count?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          activity_type: string
          actor_id: string | null
          body: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          ref_id: string | null
          title: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          body?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          ref_id?: string | null
          title?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          body?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          ref_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_attachments: {
        Row: {
          category_slug: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          expires_at: string | null
          file_name: string
          file_path: string
          id: string
          lead_id: string | null
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
          version: number
        }
        Insert: {
          category_slug?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          expires_at?: string | null
          file_name: string
          file_path: string
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          category_slug?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          expires_at?: string | null
          file_name?: string
          file_path?: string
          id?: string
          lead_id?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_attachments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_attachments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_calls: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          direction: string
          duration_sec: number | null
          follow_up_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          outcome: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string
          duration_sec?: number | null
          follow_up_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string
          duration_sec?: number | null
          follow_up_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          created_at: string
          created_by: string | null
          employer_contact_name: string | null
          employer_contact_phone: string | null
          id: string
          industry: string | null
          is_self_employed: boolean
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employer_contact_name?: string | null
          employer_contact_phone?: string | null
          id?: string
          industry?: string | null
          is_self_employed?: boolean
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employer_contact_name?: string | null
          employer_contact_phone?: string | null
          id?: string
          industry?: string | null
          is_self_employed?: boolean
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      crm_contact_companies: {
        Row: {
          company_id: string
          contact_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          role: string | null
        }
        Insert: {
          company_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          role?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_companies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_companies_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_document_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      crm_meetings: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          lead_id: string | null
          location: string | null
          notes: string | null
          start_at: string
          title: string
          updated_at: string
          video_link: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          start_at: string
          title: string
          updated_at?: string
          video_link?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          lead_id?: string | null
          location?: string | null
          notes?: string | null
          start_at?: string
          title?: string
          updated_at?: string
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_meetings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          body_html: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          lead_id: string | null
          updated_at: string
        }
        Insert: {
          body_html?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          lead_id?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_documents: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          stage_document_id: string
          status: Database["public"]["Enums"]["deal_document_status"]
          updated_at: string
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          stage_document_id: string
          status?: Database["public"]["Enums"]["deal_document_status"]
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          stage_document_id?: string
          status?: Database["public"]["Enums"]["deal_document_status"]
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_documents_stage_document_id_fkey"
            columns: ["stage_document_id"]
            isOneToOne: false
            referencedRelation: "stage_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_events: {
        Row: {
          actor_id: string | null
          created_at: string
          deal_id: string
          event_type: string
          from_status: string | null
          id: string
          metadata: Json
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          deal_id: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: Json
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          deal_id?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          to_status?: string | null
        }
        Relationships: []
      }
      deal_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          deal_id: string
          id: string
          new_stage: Database["public"]["Enums"]["deal_stage"]
          old_stage: Database["public"]["Enums"]["deal_stage"] | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          deal_id: string
          id?: string
          new_stage: Database["public"]["Enums"]["deal_stage"]
          old_stage?: Database["public"]["Enums"]["deal_stage"] | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          deal_id?: string
          id?: string
          new_stage?: Database["public"]["Enums"]["deal_stage"]
          old_stage?: Database["public"]["Enums"]["deal_stage"] | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          loan_amount: number | null
          loan_officer_id: string | null
          loan_type: string | null
          notes: string | null
          property_address: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loan_amount?: number | null
          loan_officer_id?: string | null
          loan_type?: string | null
          notes?: string | null
          property_address?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loan_amount?: number | null
          loan_officer_id?: string | null
          loan_type?: string | null
          notes?: string | null
          property_address?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          clicked_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          opened_at: string | null
          provider_message_id: string | null
          recipient_email: string
          sent_at: string
          status: string
          subject: string | null
          subscriber_id: string | null
          template_alias: string | null
          template_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string
          status?: string
          subject?: string | null
          subscriber_id?: string | null
          template_alias?: string | null
          template_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string
          status?: string
          subject?: string | null
          subscriber_id?: string | null
          template_alias?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          alias: string | null
          category: string | null
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          is_system: boolean
          name: string
          subject: string
          text_content: string
          updated_at: string
        }
        Insert: {
          alias?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_system?: boolean
          name: string
          subject?: string
          text_content?: string
          updated_at?: string
        }
        Update: {
          alias?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_system?: boolean
          name?: string
          subject?: string
          text_content?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_statements: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          id: string
          json_data: Json
          lead_id: string | null
          notes: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          statement_type: Database["public"]["Enums"]["financial_statement_type"]
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          json_data?: Json
          lead_id?: string | null
          notes?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          statement_type: Database["public"]["Enums"]["financial_statement_type"]
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          json_data?: Json
          lead_id?: string | null
          notes?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          statement_type?: Database["public"]["Enums"]["financial_statement_type"]
        }
        Relationships: []
      }
      lead_contacts: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          role: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          role?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          role?: string | null
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          lead_id: string
          metadata: Json | null
          points: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          metadata?: Json | null
          points?: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sentiment: {
        Row: {
          challenges: Json | null
          generated_at: string
          id: string
          lead_id: string | null
          positives: Json | null
          recommendations: Json | null
          summary: string | null
          temperature: string
        }
        Insert: {
          challenges?: Json | null
          generated_at?: string
          id?: string
          lead_id?: string | null
          positives?: Json | null
          recommendations?: Json | null
          summary?: string | null
          temperature?: string
        }
        Update: {
          challenges?: Json | null
          generated_at?: string
          id?: string
          lead_id?: string | null
          positives?: Json | null
          recommendations?: Json | null
          summary?: string | null
          temperature?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sentiment_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      lead_stage_history: {
        Row: {
          changed_at: string
          id: string
          lead_id: string
          new_status: string
          old_status: string | null
          trigger_event: string | null
          trigger_event_id: string | null
        }
        Insert: {
          changed_at?: string
          id?: string
          lead_id: string
          new_status: string
          old_status?: string | null
          trigger_event?: string | null
          trigger_event_id?: string | null
        }
        Update: {
          changed_at?: string
          id?: string
          lead_id?: string
          new_status?: string
          old_status?: string | null
          trigger_event?: string | null
          trigger_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          tag: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          annual_income: number | null
          assigned_to: string | null
          blog_session_id: string | null
          chat_session_id: string | null
          created_at: string
          created_by: string | null
          credit_range: string | null
          email: string | null
          employment_type: string | null
          first_name: string
          id: string
          intent_tag: string | null
          is_stuck: boolean | null
          last_activity_at: string | null
          last_name: string
          lead_score: number | null
          loan_purpose: string | null
          notes: string | null
          phone: string | null
          property_type: string | null
          property_value: number | null
          source: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          timeline: string | null
          updated_at: string
          variant_shown: Json | null
        }
        Insert: {
          annual_income?: number | null
          assigned_to?: string | null
          blog_session_id?: string | null
          chat_session_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_range?: string | null
          email?: string | null
          employment_type?: string | null
          first_name: string
          id?: string
          intent_tag?: string | null
          is_stuck?: boolean | null
          last_activity_at?: string | null
          last_name: string
          lead_score?: number | null
          loan_purpose?: string | null
          notes?: string | null
          phone?: string | null
          property_type?: string | null
          property_value?: number | null
          source?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          timeline?: string | null
          updated_at?: string
          variant_shown?: Json | null
        }
        Update: {
          annual_income?: number | null
          assigned_to?: string | null
          blog_session_id?: string | null
          chat_session_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_range?: string | null
          email?: string | null
          employment_type?: string | null
          first_name?: string
          id?: string
          intent_tag?: string | null
          is_stuck?: boolean | null
          last_activity_at?: string | null
          last_name?: string
          lead_score?: number | null
          loan_purpose?: string | null
          notes?: string | null
          phone?: string | null
          property_type?: string | null
          property_value?: number | null
          source?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          timeline?: string | null
          updated_at?: string
          variant_shown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_scenario_acknowledgements: {
        Row: {
          acknowledged_at: string
          deal_id: string
          id: string
          ip: string | null
          scenario_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          deal_id: string
          id?: string
          ip?: string | null
          scenario_id: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          acknowledged_at?: string
          deal_id?: string
          id?: string
          ip?: string | null
          scenario_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loan_scenarios: {
        Row: {
          bought_down_rate: number | null
          breakeven_vs_a_months: number | null
          breakeven_vs_b_months: number | null
          buydown_mode: boolean | null
          created_at: string
          created_by: string | null
          down_payment_amt: number | null
          down_payment_pct: number | null
          dues: number | null
          hoi: number | null
          id: string
          interest_rate: number | null
          label: string
          lead_id: string
          lien_position: string | null
          loan_amount: number | null
          loan_term_years: number | null
          ltv: number | null
          mi: number | null
          mortgage_type: string | null
          other_amount: number | null
          other_label: string | null
          pi: number | null
          points_budget: number | null
          points_purchasable: number | null
          property_address: string | null
          property_taxes: number | null
          purchase_price: number | null
          rate_reduction_pct: number | null
          rate_source: string | null
          reduction_per_point: number | null
          sublabel: string | null
          supplemental: number | null
          total_piti: number | null
          updated_at: string
        }
        Insert: {
          bought_down_rate?: number | null
          breakeven_vs_a_months?: number | null
          breakeven_vs_b_months?: number | null
          buydown_mode?: boolean | null
          created_at?: string
          created_by?: string | null
          down_payment_amt?: number | null
          down_payment_pct?: number | null
          dues?: number | null
          hoi?: number | null
          id?: string
          interest_rate?: number | null
          label?: string
          lead_id: string
          lien_position?: string | null
          loan_amount?: number | null
          loan_term_years?: number | null
          ltv?: number | null
          mi?: number | null
          mortgage_type?: string | null
          other_amount?: number | null
          other_label?: string | null
          pi?: number | null
          points_budget?: number | null
          points_purchasable?: number | null
          property_address?: string | null
          property_taxes?: number | null
          purchase_price?: number | null
          rate_reduction_pct?: number | null
          rate_source?: string | null
          reduction_per_point?: number | null
          sublabel?: string | null
          supplemental?: number | null
          total_piti?: number | null
          updated_at?: string
        }
        Update: {
          bought_down_rate?: number | null
          breakeven_vs_a_months?: number | null
          breakeven_vs_b_months?: number | null
          buydown_mode?: boolean | null
          created_at?: string
          created_by?: string | null
          down_payment_amt?: number | null
          down_payment_pct?: number | null
          dues?: number | null
          hoi?: number | null
          id?: string
          interest_rate?: number | null
          label?: string
          lead_id?: string
          lien_position?: string | null
          loan_amount?: number | null
          loan_term_years?: number | null
          ltv?: number | null
          mi?: number | null
          mortgage_type?: string | null
          other_amount?: number | null
          other_label?: string | null
          pi?: number | null
          points_budget?: number | null
          points_purchasable?: number | null
          property_address?: string | null
          property_taxes?: number | null
          purchase_price?: number | null
          rate_reduction_pct?: number | null
          rate_source?: string | null
          reduction_per_point?: number | null
          sublabel?: string | null
          supplemental?: number | null
          total_piti?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_scenarios_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      mortgage_profiles: {
        Row: {
          created_at: string
          down_payment: number | null
          est_dti: number | null
          est_income: number | null
          est_monthly_payment: number | null
          id: string
          lead_id: string | null
          loan_program: string | null
          notes: string | null
          occupancy_type: string | null
          pipeline_stage: string | null
          property_type: string | null
          purchase_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          down_payment?: number | null
          est_dti?: number | null
          est_income?: number | null
          est_monthly_payment?: number | null
          id?: string
          lead_id?: string | null
          loan_program?: string | null
          notes?: string | null
          occupancy_type?: string | null
          pipeline_stage?: string | null
          property_type?: string | null
          purchase_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          down_payment?: number | null
          est_dti?: number | null
          est_income?: number | null
          est_monthly_payment?: number | null
          id?: string
          lead_id?: string | null
          loan_program?: string | null
          notes?: string | null
          occupancy_type?: string | null
          pipeline_stage?: string | null
          property_type?: string | null
          purchase_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortgage_profiles_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          deal_id: string
          email: string
          expires_at: string
          id: string
          lead_id: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deal_id: string
          email: string
          expires_at?: string
          id?: string
          lead_id?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string
          email?: string
          expires_at?: string
          id?: string
          lead_id?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      portal_messages: {
        Row: {
          body: string
          created_at: string
          deal_id: string
          id: string
          read_at: string | null
          sender_role: string
          sender_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deal_id: string
          id?: string
          read_at?: string | null
          sender_role: string
          sender_user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          deal_id?: string
          id?: string
          read_at?: string | null
          sender_role?: string
          sender_user_id?: string
        }
        Relationships: []
      }
      portal_users: {
        Row: {
          contact_id: string | null
          created_at: string
          deal_id: string
          invite_id: string | null
          lead_id: string | null
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          deal_id: string
          invite_id?: string | null
          lead_id?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          deal_id?: string
          invite_id?: string | null
          lead_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_decisions: {
        Row: {
          confidence: string
          created_at: string
          created_by: string | null
          decision_date: string
          explanation: string | null
          id: string
          mbs_direction: string
          rate_change: number
          recommendation: string
          risk_profile: string
          time_of_day: string | null
          total_score: number
          trend_indicator: string
          updated_at: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          created_by?: string | null
          decision_date?: string
          explanation?: string | null
          id?: string
          mbs_direction?: string
          rate_change?: number
          recommendation?: string
          risk_profile?: string
          time_of_day?: string | null
          total_score?: number
          trend_indicator?: string
          updated_at?: string
        }
        Update: {
          confidence?: string
          created_at?: string
          created_by?: string | null
          decision_date?: string
          explanation?: string | null
          id?: string
          mbs_direction?: string
          rate_change?: number
          recommendation?: string
          risk_profile?: string
          time_of_day?: string | null
          total_score?: number
          trend_indicator?: string
          updated_at?: string
        }
        Relationships: []
      }
      self_employed_profiles: {
        Row: {
          borrower_type: Database["public"]["Enums"]["borrower_employment_type"]
          business_name: string | null
          business_type: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          id: string
          lead_id: string | null
          line_items: Json
          period_end: string | null
          period_start: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          borrower_type?: Database["public"]["Enums"]["borrower_employment_type"]
          business_name?: string | null
          business_type?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          line_items?: Json
          period_end?: string | null
          period_start?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          borrower_type?: Database["public"]["Enums"]["borrower_employment_type"]
          business_name?: string | null
          business_type?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          id?: string
          lead_id?: string | null
          line_items?: Json
          period_end?: string | null
          period_start?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_account_settings: {
        Row: {
          brand_voice: string | null
          business_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          default_image_url: string | null
          facebook_page_id: string | null
          id: string
          instagram_business_id: string | null
          linkedin_org_urn: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          brand_voice?: string | null
          business_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_image_url?: string | null
          facebook_page_id?: string | null
          id?: string
          instagram_business_id?: string | null
          linkedin_org_urn?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          brand_voice?: string | null
          business_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_image_url?: string | null
          facebook_page_id?: string | null
          id?: string
          instagram_business_id?: string | null
          linkedin_org_urn?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      social_debug_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          post_id: string | null
          status: string
          step: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          post_id?: string | null
          status: string
          step: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          post_id?: string | null
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_debug_logs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_analytics: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          lead_id: string | null
          post_id: string
          source_platform: Database["public"]["Enums"]["social_platform"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          lead_id?: string | null
          post_id: string
          source_platform?:
            | Database["public"]["Enums"]["social_platform"]
            | null
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          lead_id?: string | null
          post_id?: string
          source_platform?:
            | Database["public"]["Enums"]["social_platform"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "social_media_analytics_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_media_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_media_posts: {
        Row: {
          created_at: string
          created_by: string | null
          cta_link: string | null
          engagement_clicks: number | null
          facebook_post_id: string | null
          hashtags: string[] | null
          id: string
          image_placeholder: string | null
          image_url: string | null
          instagram_post_id: string | null
          leads_generated: number | null
          linkedin_post_id: string | null
          location_tags: string[] | null
          mentions: string[] | null
          meta_post_id: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_text: string
          post_type: Database["public"]["Enums"]["social_post_type"]
          published_at: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["social_post_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cta_link?: string | null
          engagement_clicks?: number | null
          facebook_post_id?: string | null
          hashtags?: string[] | null
          id?: string
          image_placeholder?: string | null
          image_url?: string | null
          instagram_post_id?: string | null
          leads_generated?: number | null
          linkedin_post_id?: string | null
          location_tags?: string[] | null
          mentions?: string[] | null
          meta_post_id?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_text: string
          post_type: Database["public"]["Enums"]["social_post_type"]
          published_at?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cta_link?: string | null
          engagement_clicks?: number | null
          facebook_post_id?: string | null
          hashtags?: string[] | null
          id?: string
          image_placeholder?: string | null
          image_url?: string | null
          instagram_post_id?: string | null
          leads_generated?: number | null
          linkedin_post_id?: string | null
          location_tags?: string[] | null
          mentions?: string[] | null
          meta_post_id?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_text?: string
          post_type?: Database["public"]["Enums"]["social_post_type"]
          published_at?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["social_post_status"]
          updated_at?: string
        }
        Relationships: []
      }
      social_media_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          default_time: string | null
          description: string | null
          id: string
          is_active: boolean | null
          post_type: Database["public"]["Enums"]["social_post_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          default_time?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          post_type: Database["public"]["Enums"]["social_post_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          default_time?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          post_type?: Database["public"]["Enums"]["social_post_type"]
          updated_at?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caption: string
          created_at: string
          hashtags: string[] | null
          id: string
          media_type: string
          platform: string
          published_at: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          media_type?: string
          platform?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          media_type?: string
          platform?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      stage_documents: {
        Row: {
          created_at: string
          id: string
          label: string
          required: boolean
          sort_order: number
          stage: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          required?: boolean
          sort_order?: number
          stage: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          required?: boolean
          sort_order?: number
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_transitions: {
        Row: {
          created_at: string
          entity_type: string
          from_status: string
          id: string
          required_fields: Json
          to_status: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          from_status: string
          id?: string
          required_fields?: Json
          to_status: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          from_status?: string
          id?: string
          required_fields?: Json
          to_status?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          lead_id: string | null
          notes: string | null
          source: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          lead_id?: string | null
          notes?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          lead_id?: string | null
          notes?: string | null
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          priority: string
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_portal_user_deal: { Args: never; Returns: string }
      get_available_slots: { Args: { p_date: string }; Returns: string[] }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_portal_user_for_deal: { Args: { _deal_id: string }; Returns: boolean }
      user_owns_contact: { Args: { _contact_id: string }; Returns: boolean }
      user_owns_lead: { Args: { _lead_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "loan_officer" | "processor"
      blog_post_status: "draft" | "published"
      borrower_employment_type: "employee" | "self_employed"
      contact_type: "borrower" | "partner" | "other"
      deal_document_status: "missing" | "uploaded" | "verified"
      deal_stage:
        | "new_lead"
        | "contacted"
        | "application_sent"
        | "docs_received"
        | "underwriting"
        | "approved"
        | "clear_to_close"
        | "closed"
        | "lost"
      financial_statement_type:
        | "pnl"
        | "balance_sheet"
        | "cash_flow"
        | "combined"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "unqualified"
        | "converted"
        | "lost"
        | "pre_qualified"
        | "application_started"
        | "underwriting"
        | "approved"
        | "closed"
      social_platform: "facebook" | "instagram" | "linkedin" | "all"
      social_post_status: "draft" | "scheduled" | "published" | "failed"
      social_post_type:
        | "featured_business"
        | "local_tips"
        | "events_promotions"
        | "ai_tools"
        | "success_stories"
        | "community_highlight"
        | "summary_reminder"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "loan_officer", "processor"],
      blog_post_status: ["draft", "published"],
      borrower_employment_type: ["employee", "self_employed"],
      contact_type: ["borrower", "partner", "other"],
      deal_document_status: ["missing", "uploaded", "verified"],
      deal_stage: [
        "new_lead",
        "contacted",
        "application_sent",
        "docs_received",
        "underwriting",
        "approved",
        "clear_to_close",
        "closed",
        "lost",
      ],
      financial_statement_type: [
        "pnl",
        "balance_sheet",
        "cash_flow",
        "combined",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "unqualified",
        "converted",
        "lost",
        "pre_qualified",
        "application_started",
        "underwriting",
        "approved",
        "closed",
      ],
      social_platform: ["facebook", "instagram", "linkedin", "all"],
      social_post_status: ["draft", "scheduled", "published", "failed"],
      social_post_type: [
        "featured_business",
        "local_tips",
        "events_promotions",
        "ai_tools",
        "success_stories",
        "community_highlight",
        "summary_reminder",
      ],
    },
  },
} as const
