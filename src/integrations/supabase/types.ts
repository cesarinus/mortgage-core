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
      ai_feedback: {
        Row: {
          context: Json | null
          created_at: string
          feature: string
          id: string
          profile: string
          rating: string
          reason: string | null
          resolved: boolean
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          feature: string
          id?: string
          profile: string
          rating: string
          reason?: string | null
          resolved?: boolean
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          feature?: string
          id?: string
          profile?: string
          rating?: string
          reason?: string | null
          resolved?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      arive_sync_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          direction: string
          error: string | null
          finished_at: string | null
          id: string
          object_id: string | null
          object_type: string
          payload: Json | null
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          direction?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          object_id?: string | null
          object_type: string
          payload?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          direction?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          object_id?: string | null
          object_type?: string
          payload?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      assistant_interactions: {
        Row: {
          created_at: string
          id: string
          latency_ms: number | null
          question: string
          result_clicked_id: string | null
          result_clicked_kind: string | null
          session_id: string | null
          tool_calls: Json
          tool_results_summary: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latency_ms?: number | null
          question: string
          result_clicked_id?: string | null
          result_clicked_kind?: string | null
          session_id?: string | null
          tool_calls?: Json
          tool_results_summary?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latency_ms?: number | null
          question?: string
          result_clicked_id?: string | null
          result_clicked_kind?: string | null
          session_id?: string | null
          tool_calls?: Json
          tool_results_summary?: Json
          user_id?: string
        }
        Relationships: []
      }
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
      borrower_income_calculations: {
        Row: {
          annual_income: number | null
          base_income: number | null
          bonus: number | null
          borrower_name: string | null
          borrower_type: string
          calculated_by: string
          calculation_date: string
          commission: number | null
          contact_id: string | null
          created_at: string
          id: string
          income_breakdown: Json | null
          lead_id: string
          monthly_income: number | null
          ocr_log: Json | null
          ocr_status: string
          other_income: number | null
          overtime: number | null
          self_employment_income: number | null
          shared_with_borrower: boolean
          source: string
          supporting_doc_ids: string[] | null
          updated_at: string
          years_average: number | null
        }
        Insert: {
          annual_income?: number | null
          base_income?: number | null
          bonus?: number | null
          borrower_name?: string | null
          borrower_type: string
          calculated_by?: string
          calculation_date?: string
          commission?: number | null
          contact_id?: string | null
          created_at?: string
          id?: string
          income_breakdown?: Json | null
          lead_id: string
          monthly_income?: number | null
          ocr_log?: Json | null
          ocr_status?: string
          other_income?: number | null
          overtime?: number | null
          self_employment_income?: number | null
          shared_with_borrower?: boolean
          source?: string
          supporting_doc_ids?: string[] | null
          updated_at?: string
          years_average?: number | null
        }
        Update: {
          annual_income?: number | null
          base_income?: number | null
          bonus?: number | null
          borrower_name?: string | null
          borrower_type?: string
          calculated_by?: string
          calculation_date?: string
          commission?: number | null
          contact_id?: string | null
          created_at?: string
          id?: string
          income_breakdown?: Json | null
          lead_id?: string
          monthly_income?: number | null
          ocr_log?: Json | null
          ocr_status?: string
          other_income?: number | null
          overtime?: number | null
          self_employment_income?: number | null
          shared_with_borrower?: boolean
          source?: string
          supporting_doc_ids?: string[] | null
          updated_at?: string
          years_average?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "borrower_income_calculations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrower_income_calculations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      borrower_payment_details: {
        Row: {
          borrower_type: string
          contact_id: string | null
          created_at: string
          id: string
          lead_id: string
          pay_period_type: string
          pay_stub_bonus: number | null
          pay_stub_commission: number | null
          pay_stub_ending_date: string | null
          pay_stub_gross_base: number | null
          pay_stub_overtime: number | null
          pay_stub_period_days: number | null
          pay_stub_period_end: string | null
          pay_stub_period_start: string | null
          se_avg_monthly_net: number | null
          updated_at: string
          w2_year_1: number | null
          w2_year_1_wages: number | null
          w2_year_2: number | null
          w2_year_2_wages: number | null
          ytd_as_of_date: string | null
          ytd_base: number | null
          ytd_bonus: number | null
          ytd_commission: number | null
          ytd_overtime: number | null
          ytd_total: number | null
        }
        Insert: {
          borrower_type?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          pay_period_type?: string
          pay_stub_bonus?: number | null
          pay_stub_commission?: number | null
          pay_stub_ending_date?: string | null
          pay_stub_gross_base?: number | null
          pay_stub_overtime?: number | null
          pay_stub_period_days?: number | null
          pay_stub_period_end?: string | null
          pay_stub_period_start?: string | null
          se_avg_monthly_net?: number | null
          updated_at?: string
          w2_year_1?: number | null
          w2_year_1_wages?: number | null
          w2_year_2?: number | null
          w2_year_2_wages?: number | null
          ytd_as_of_date?: string | null
          ytd_base?: number | null
          ytd_bonus?: number | null
          ytd_commission?: number | null
          ytd_overtime?: number | null
          ytd_total?: number | null
        }
        Update: {
          borrower_type?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          pay_period_type?: string
          pay_stub_bonus?: number | null
          pay_stub_commission?: number | null
          pay_stub_ending_date?: string | null
          pay_stub_gross_base?: number | null
          pay_stub_overtime?: number | null
          pay_stub_period_days?: number | null
          pay_stub_period_end?: string | null
          pay_stub_period_start?: string | null
          se_avg_monthly_net?: number | null
          updated_at?: string
          w2_year_1?: number | null
          w2_year_1_wages?: number | null
          w2_year_2?: number | null
          w2_year_2_wages?: number | null
          ytd_as_of_date?: string | null
          ytd_base?: number | null
          ytd_bonus?: number | null
          ytd_commission?: number | null
          ytd_overtime?: number | null
          ytd_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "borrower_payment_details_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrower_payment_details_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
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
      chat_threads: {
        Row: {
          created_at: string
          id: string
          record_id: string | null
          record_kind: string | null
          scope: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          record_id?: string | null
          record_kind?: string | null
          scope: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          record_id?: string | null
          record_kind?: string | null
          scope?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          borrower_type: Database["public"]["Enums"]["borrower_employment_type"]
          company_id: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string
          created_by: string | null
          dob: string | null
          email: string | null
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          lead_id: string | null
          lead_score: number
          license_number: string | null
          middle_name: string | null
          notes: string | null
          person_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["contact_role"] | null
          temperature: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          borrower_type?: Database["public"]["Enums"]["borrower_employment_type"]
          company_id?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by?: string | null
          dob?: string | null
          email?: string | null
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          lead_id?: string | null
          lead_score?: number
          license_number?: string | null
          middle_name?: string | null
          notes?: string | null
          person_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["contact_role"] | null
          temperature?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          borrower_type?: Database["public"]["Enums"]["borrower_employment_type"]
          company_id?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by?: string | null
          dob?: string | null
          email?: string | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          lead_id?: string | null
          lead_score?: number
          license_number?: string | null
          middle_name?: string | null
          notes?: string | null
          person_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["contact_role"] | null
          temperature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
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
      crm_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          module_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          module_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          module_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_audit_logs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "crm_modules"
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
          address: string | null
          company_type: Database["public"]["Enums"]["company_type"]
          created_at: string
          created_by: string | null
          domain: string | null
          employer_contact_name: string | null
          employer_contact_phone: string | null
          id: string
          industry: string | null
          is_self_employed: boolean
          license_number: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_type?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          created_by?: string | null
          domain?: string | null
          employer_contact_name?: string | null
          employer_contact_phone?: string | null
          id?: string
          industry?: string | null
          is_self_employed?: boolean
          license_number?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_type?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          created_by?: string | null
          domain?: string | null
          employer_contact_name?: string | null
          employer_contact_phone?: string | null
          id?: string
          industry?: string | null
          is_self_employed?: boolean
          license_number?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
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
      crm_field_conditions: {
        Row: {
          action: string
          active: boolean
          created_at: string
          field_id: string
          id: string
          rule: Json
          sort_order: number
          target_id: string | null
          target_kind: string
          updated_at: string
        }
        Insert: {
          action?: string
          active?: boolean
          created_at?: string
          field_id: string
          id?: string
          rule?: Json
          sort_order?: number
          target_id?: string | null
          target_kind?: string
          updated_at?: string
        }
        Update: {
          action?: string
          active?: boolean
          created_at?: string
          field_id?: string
          id?: string
          rule?: Json
          sort_order?: number
          target_id?: string | null
          target_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_field_conditions_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_field_options: {
        Row: {
          created_at: string
          field_id: string
          id: string
          label: string
          sort_order: number
          value: string
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          label: string
          sort_order?: number
          value: string
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          label?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_field_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_field_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          field_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          field_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          field_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_field_permissions_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_field_values: {
        Row: {
          created_at: string
          created_by: string | null
          field_id: string
          id: string
          record_id: string
          record_type: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          field_id: string
          id?: string
          record_id: string
          record_type: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          field_id?: string
          id?: string
          record_id?: string
          record_type?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_fields: {
        Row: {
          active: boolean
          created_at: string
          default_value: string | null
          description: string | null
          field_type: string
          hidden: boolean
          id: string
          internal_name: string
          is_system: boolean
          label: string
          module_id: string
          placeholder: string | null
          read_only: boolean
          required: boolean
          section_id: string | null
          sort_order: number
          updated_at: string
          validation: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_value?: string | null
          description?: string | null
          field_type: string
          hidden?: boolean
          id?: string
          internal_name: string
          is_system?: boolean
          label: string
          module_id: string
          placeholder?: string | null
          read_only?: boolean
          required?: boolean
          section_id?: string | null
          sort_order?: number
          updated_at?: string
          validation?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          default_value?: string | null
          description?: string | null
          field_type?: string
          hidden?: boolean
          id?: string
          internal_name?: string
          is_system?: boolean
          label?: string
          module_id?: string
          placeholder?: string | null
          read_only?: boolean
          required?: boolean
          section_id?: string | null
          sort_order?: number
          updated_at?: string
          validation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crm_fields_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "crm_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "crm_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_layout_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          layout: Json
          module_id: string
          name: string
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          layout?: Json
          module_id: string
          name: string
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          layout?: Json
          module_id?: string
          name?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_layout_templates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "crm_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_layout_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          layout: Json
          layout_id: string
          note: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          layout: Json
          layout_id: string
          note?: string | null
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          layout?: Json
          layout_id?: string
          note?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_layout_versions_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "crm_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_layouts: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          layout: Json
          module_id: string
          name: string
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout?: Json
          module_id: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout?: Json
          module_id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_layouts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "crm_modules"
            referencedColumns: ["id"]
          },
        ]
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
      crm_modules: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      crm_section_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          section_id: string
          updated_at: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          section_id: string
          updated_at?: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_section_permissions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "crm_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sections: {
        Row: {
          created_at: string
          description: string | null
          hidden: boolean
          id: string
          is_system: boolean
          label: string
          module_id: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hidden?: boolean
          id?: string
          is_system?: boolean
          label: string
          module_id: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hidden?: boolean
          id?: string
          is_system?: boolean
          label?: string
          module_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_sections_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "crm_modules"
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
          opportunity_id: string | null
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
          opportunity_id?: string | null
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
          opportunity_id?: string | null
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
            foreignKeyName: "email_logs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "pipeline_opportunities"
            referencedColumns: ["id"]
          },
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
      email_providers: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_active: boolean
          name: string
          password: string
          port: number
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string
          host: string
          id?: string
          is_active?: boolean
          name: string
          password: string
          port?: number
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_active?: boolean
          name?: string
          password?: string
          port?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
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
          merge_fields: string[]
          name: string
          subject: string
          text_content: string
          trigger_event: string | null
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
          merge_fields?: string[]
          name: string
          subject?: string
          text_content?: string
          trigger_event?: string | null
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
          merge_fields?: string[]
          name?: string
          subject?: string
          text_content?: string
          trigger_event?: string | null
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
      income_document_extractions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          attachment_id: string
          confidence: number | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          doc_type: Database["public"]["Enums"]["income_doc_type"]
          error: string | null
          extracted: Json
          id: string
          lead_id: string | null
          model: string | null
          period_ending_date: string | null
          status: Database["public"]["Enums"]["income_extraction_status"]
          tax_year: number | null
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          attachment_id: string
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          doc_type?: Database["public"]["Enums"]["income_doc_type"]
          error?: string | null
          extracted?: Json
          id?: string
          lead_id?: string | null
          model?: string | null
          period_ending_date?: string | null
          status?: Database["public"]["Enums"]["income_extraction_status"]
          tax_year?: number | null
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          attachment_id?: string
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          doc_type?: Database["public"]["Enums"]["income_doc_type"]
          error?: string | null
          extracted?: Json
          id?: string
          lead_id?: string | null
          model?: string | null
          period_ending_date?: string | null
          status?: Database["public"]["Enums"]["income_extraction_status"]
          tax_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_document_extractions_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "crm_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_document_extractions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_document_extractions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_document_extractions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          category: string
          config: Json
          created_at: string
          credentials_secret_ref: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          credentials_secret_ref?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          credentials_secret_ref?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_health_snapshots: {
        Row: {
          checked_at: string
          connection_id: string | null
          details: Json | null
          error_count: number | null
          id: string
          latency_ms: number | null
          requests_today: number | null
          status: string
        }
        Insert: {
          checked_at?: string
          connection_id?: string | null
          details?: Json | null
          error_count?: number | null
          id?: string
          latency_ms?: number | null
          requests_today?: number | null
          status: string
        }
        Update: {
          checked_at?: string
          connection_id?: string | null
          details?: Json | null
          error_count?: number | null
          id?: string
          latency_ms?: number | null
          requests_today?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_health_snapshots_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhooks: {
        Row: {
          created_at: string
          enabled: boolean
          events: string[]
          id: string
          last_fired_at: string | null
          last_status: string | null
          provider: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          last_fired_at?: string | null
          last_status?: string | null
          provider?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          last_fired_at?: string | null
          last_status?: string | null
          provider?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_contacts: {
        Row: {
          company_id: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          lead_id: string
          role: string | null
          role_on_deal: Database["public"]["Enums"]["role_on_deal"] | null
        }
        Insert: {
          company_id?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          lead_id: string
          role?: string | null
          role_on_deal?: Database["public"]["Enums"]["role_on_deal"] | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          lead_id?: string
          role?: string | null
          role_on_deal?: Database["public"]["Enums"]["role_on_deal"] | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
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
      lead_export_logs: {
        Row: {
          created_at: string
          export_system: string
          id: string
          lead_id: string
          payload: Json | null
          response: Json | null
          status: string
          user_id: string | null
          validation_errors: Json | null
        }
        Insert: {
          created_at?: string
          export_system?: string
          id?: string
          lead_id: string
          payload?: Json | null
          response?: Json | null
          status?: string
          user_id?: string | null
          validation_errors?: Json | null
        }
        Update: {
          created_at?: string
          export_system?: string
          id?: string
          lead_id?: string
          payload?: Json | null
          response?: Json | null
          status?: string
          user_id?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_export_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_screening_audit: {
        Row: {
          actions: Json
          actor_id: string | null
          created_at: string
          emails_checked: string[]
          id: string
          matches_found: number
          notes: string | null
        }
        Insert: {
          actions?: Json
          actor_id?: string | null
          created_at?: string
          emails_checked?: string[]
          id?: string
          matches_found?: number
          notes?: string | null
        }
        Update: {
          actions?: Json
          actor_id?: string | null
          created_at?: string
          emails_checked?: string[]
          id?: string
          matches_found?: number
          notes?: string | null
        }
        Relationships: []
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
      lead_source_analytics_daily: {
        Row: {
          applications: number
          avg_close_days: number | null
          conversion_pct: number
          created_at: string
          day: string
          funded: number
          leads: number
          revenue_cents: number
          source_id: string
        }
        Insert: {
          applications?: number
          avg_close_days?: number | null
          conversion_pct?: number
          created_at?: string
          day: string
          funded?: number
          leads?: number
          revenue_cents?: number
          source_id: string
        }
        Update: {
          applications?: number
          avg_close_days?: number | null
          conversion_pct?: number
          created_at?: string
          day?: string
          funded?: number
          leads?: number
          revenue_cents?: number
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_source_analytics_daily_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_source_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          sort: number
          source_id: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort?: number
          source_id: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort?: number
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_source_rules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          default_lead_score: number
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          owner_id: string | null
          sort: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_lead_score?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name: string
          owner_id?: string | null
          sort?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_lead_score?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          owner_id?: string | null
          sort?: number
          updated_at?: string
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
          cash_out_purpose: string | null
          chat_session_id: string | null
          co_borrower_id: string | null
          company_id: string | null
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
          lien_position: string | null
          loan_amount: number | null
          loan_purpose: string | null
          los_application_id: string | null
          los_sync_status: Database["public"]["Enums"]["los_sync_status_enum"]
          name: string | null
          notes: string | null
          person_id: string | null
          phone: string | null
          portal_user_id: string | null
          property_address: string | null
          property_type: string | null
          property_value: number | null
          refinance_type: string | null
          sent_to_los_at: string | null
          source: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          subject_property_tbd: boolean
          timeline: string | null
          transaction_type: string | null
          updated_at: string
          variant_shown: Json | null
        }
        Insert: {
          annual_income?: number | null
          assigned_to?: string | null
          blog_session_id?: string | null
          cash_out_purpose?: string | null
          chat_session_id?: string | null
          co_borrower_id?: string | null
          company_id?: string | null
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
          lien_position?: string | null
          loan_amount?: number | null
          loan_purpose?: string | null
          los_application_id?: string | null
          los_sync_status?: Database["public"]["Enums"]["los_sync_status_enum"]
          name?: string | null
          notes?: string | null
          person_id?: string | null
          phone?: string | null
          portal_user_id?: string | null
          property_address?: string | null
          property_type?: string | null
          property_value?: number | null
          refinance_type?: string | null
          sent_to_los_at?: string | null
          source?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          subject_property_tbd?: boolean
          timeline?: string | null
          transaction_type?: string | null
          updated_at?: string
          variant_shown?: Json | null
        }
        Update: {
          annual_income?: number | null
          assigned_to?: string | null
          blog_session_id?: string | null
          cash_out_purpose?: string | null
          chat_session_id?: string | null
          co_borrower_id?: string | null
          company_id?: string | null
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
          lien_position?: string | null
          loan_amount?: number | null
          loan_purpose?: string | null
          los_application_id?: string | null
          los_sync_status?: Database["public"]["Enums"]["los_sync_status_enum"]
          name?: string | null
          notes?: string | null
          person_id?: string | null
          phone?: string | null
          portal_user_id?: string | null
          property_address?: string | null
          property_type?: string | null
          property_value?: number | null
          refinance_type?: string | null
          sent_to_los_at?: string | null
          source?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          subject_property_tbd?: boolean
          timeline?: string | null
          transaction_type?: string | null
          updated_at?: string
          variant_shown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_co_borrower_id_fkey"
            columns: ["co_borrower_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_conditions: {
        Row: {
          category: string
          condition_type: string
          created_at: string
          created_by: string | null
          description: string | null
          document_name: string | null
          document_url: string | null
          id: string
          lead_id: string
          notes: string | null
          ocr_raw: Json | null
          ocr_status: string
          pipeline_opportunity_id: string | null
          received_at: string | null
          received_via: string | null
          required: boolean
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          condition_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          ocr_raw?: Json | null
          ocr_status?: string
          pipeline_opportunity_id?: string | null
          received_at?: string | null
          received_via?: string | null
          required?: boolean
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_name?: string | null
          document_url?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          ocr_raw?: Json | null
          ocr_status?: string
          pipeline_opportunity_id?: string | null
          received_at?: string | null
          received_via?: string | null
          required?: boolean
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_conditions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_conditions_pipeline_opportunity_id_fkey"
            columns: ["pipeline_opportunity_id"]
            isOneToOne: false
            referencedRelation: "pipeline_opportunities"
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
      los_field_mappings: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          crm_field: string
          crm_field_id: string | null
          data_type: string
          default_value: string | null
          external_field: string
          id: string
          integration: string
          last_validated_at: string | null
          module_slug: string | null
          notes: string | null
          required: boolean
          sort_order: number
          sync_direction: string
          transform: string | null
          transform_config: Json
          transform_type: string
          updated_at: string
          validation_status: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          crm_field: string
          crm_field_id?: string | null
          data_type?: string
          default_value?: string | null
          external_field: string
          id?: string
          integration?: string
          last_validated_at?: string | null
          module_slug?: string | null
          notes?: string | null
          required?: boolean
          sort_order?: number
          sync_direction?: string
          transform?: string | null
          transform_config?: Json
          transform_type?: string
          updated_at?: string
          validation_status?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          crm_field?: string
          crm_field_id?: string | null
          data_type?: string
          default_value?: string | null
          external_field?: string
          id?: string
          integration?: string
          last_validated_at?: string | null
          module_slug?: string | null
          notes?: string | null
          required?: boolean
          sort_order?: number
          sync_direction?: string
          transform?: string | null
          transform_config?: Json
          transform_type?: string
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "los_field_mappings_crm_field_id_fkey"
            columns: ["crm_field_id"]
            isOneToOne: false
            referencedRelation: "crm_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      los_integration_logs: {
        Row: {
          created_at: string
          direction: string
          error: string | null
          event: string
          id: string
          lead_id: string | null
          payload: Json | null
          response: Json | null
          retry_count: number
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          direction?: string
          error?: string | null
          event: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          response?: Json | null
          retry_count?: number
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          error?: string | null
          event?: string
          id?: string
          lead_id?: string | null
          payload?: Json | null
          response?: Json | null
          retry_count?: number
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "los_integration_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      los_loans: {
        Row: {
          arive_loan_id: string | null
          conditions: Json | null
          created_at: string
          deal_id: string | null
          du_findings: string | null
          estimated_close_date: string | null
          id: string
          interest_rate: number | null
          last_synced_at: string
          lead_id: string
          loan_amount: number | null
          loan_program: string | null
          loan_status: string | null
          purchase_price: number | null
          raw: Json | null
          updated_at: string
        }
        Insert: {
          arive_loan_id?: string | null
          conditions?: Json | null
          created_at?: string
          deal_id?: string | null
          du_findings?: string | null
          estimated_close_date?: string | null
          id?: string
          interest_rate?: number | null
          last_synced_at?: string
          lead_id: string
          loan_amount?: number | null
          loan_program?: string | null
          loan_status?: string | null
          purchase_price?: number | null
          raw?: Json | null
          updated_at?: string
        }
        Update: {
          arive_loan_id?: string | null
          conditions?: Json | null
          created_at?: string
          deal_id?: string | null
          du_findings?: string | null
          estimated_close_date?: string | null
          id?: string
          interest_rate?: number | null
          last_synced_at?: string
          lead_id?: string
          loan_amount?: number | null
          loan_program?: string | null
          loan_status?: string | null
          purchase_price?: number | null
          raw?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "los_loans_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "pipeline_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "los_loans_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      los_sync_queue: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          los_application_id: string | null
          opportunity_id: string
          retry_count: number
          sync_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          los_application_id?: string | null
          opportunity_id: string
          retry_count?: number
          sync_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          los_application_id?: string | null
          opportunity_id?: string
          retry_count?: number
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "los_sync_queue_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "pipeline_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_settings: {
        Row: {
          channel: string
          created_at: string
          enabled: boolean
          id: string
          secret_ref: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          secret_ref?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          secret_ref?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      mortgage_market_rates: {
        Row: {
          active: boolean
          adjusted_rate: number
          created_at: string
          fetched_at: string
          id: string
          is_manual_override: boolean
          rate_30yr: number
          source: string
        }
        Insert: {
          active?: boolean
          adjusted_rate: number
          created_at?: string
          fetched_at?: string
          id?: string
          is_manual_override?: boolean
          rate_30yr: number
          source?: string
        }
        Update: {
          active?: boolean
          adjusted_rate?: number
          created_at?: string
          fetched_at?: string
          id?: string
          is_manual_override?: boolean
          rate_30yr?: number
          source?: string
        }
        Relationships: []
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
      mortgage_snapshots: {
        Row: {
          application_started_at: string | null
          application_updated_at: string | null
          assigned_lo_id: string | null
          borrower_email: string | null
          borrower_name: string | null
          borrower_phone: string | null
          completion_pct: number | null
          created_at: string
          deal_id: string | null
          documents_required: number | null
          documents_uploaded: number | null
          down_payment: number | null
          down_payment_pct: number | null
          dti: number | null
          estimated_value: number | null
          generated_at: string
          id: string
          interest_rate: number | null
          lead_id: string | null
          loan_amount: number | null
          loan_program: string | null
          loan_purpose: string | null
          loan_term_years: number | null
          ltv: number | null
          monthly_income: number | null
          monthly_payment: number | null
          occupancy: string | null
          opportunity_id: string | null
          person_id: string | null
          property_address: string | null
          property_type: string | null
          purchase_price: number | null
          updated_at: string
        }
        Insert: {
          application_started_at?: string | null
          application_updated_at?: string | null
          assigned_lo_id?: string | null
          borrower_email?: string | null
          borrower_name?: string | null
          borrower_phone?: string | null
          completion_pct?: number | null
          created_at?: string
          deal_id?: string | null
          documents_required?: number | null
          documents_uploaded?: number | null
          down_payment?: number | null
          down_payment_pct?: number | null
          dti?: number | null
          estimated_value?: number | null
          generated_at?: string
          id?: string
          interest_rate?: number | null
          lead_id?: string | null
          loan_amount?: number | null
          loan_program?: string | null
          loan_purpose?: string | null
          loan_term_years?: number | null
          ltv?: number | null
          monthly_income?: number | null
          monthly_payment?: number | null
          occupancy?: string | null
          opportunity_id?: string | null
          person_id?: string | null
          property_address?: string | null
          property_type?: string | null
          purchase_price?: number | null
          updated_at?: string
        }
        Update: {
          application_started_at?: string | null
          application_updated_at?: string | null
          assigned_lo_id?: string | null
          borrower_email?: string | null
          borrower_name?: string | null
          borrower_phone?: string | null
          completion_pct?: number | null
          created_at?: string
          deal_id?: string | null
          documents_required?: number | null
          documents_uploaded?: number | null
          down_payment?: number | null
          down_payment_pct?: number | null
          dti?: number | null
          estimated_value?: number | null
          generated_at?: string
          id?: string
          interest_rate?: number | null
          lead_id?: string | null
          loan_amount?: number | null
          loan_program?: string | null
          loan_purpose?: string | null
          loan_term_years?: number | null
          ltv?: number | null
          monthly_income?: number | null
          monthly_payment?: number | null
          occupancy?: string | null
          opportunity_id?: string | null
          person_id?: string | null
          property_address?: string | null
          property_type?: string | null
          purchase_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortgage_snapshots_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortgage_snapshots_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortgage_snapshots_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "pipeline_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortgage_snapshots_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_digests: {
        Row: {
          created_at: string
          id: string
          items: Json
          mode: string
          sent_at: string | null
          user_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          mode: string
          sent_at?: string | null
          user_id: string
          window_end: string
          window_start: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          mode?: string
          sent_at?: string | null
          user_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          body: string | null
          channel: string
          clicked_at: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          opened_at: string | null
          payload: Json
          priority: string
          sent_at: string | null
          status: string
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: string
          clicked_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          opened_at?: string | null
          payload?: Json
          priority?: string
          sent_at?: string | null
          status?: string
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          clicked_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          opened_at?: string | null
          payload?: Json
          priority?: string
          sent_at?: string | null
          status?: string
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channels: Json
          created_at: string
          digest_mode: string
          id: string
          quiet_hours: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          digest_mode?: string
          id?: string
          quiet_hours?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          channels?: Json
          created_at?: string
          digest_mode?: string
          id?: string
          quiet_hours?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          subject: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      people: {
        Row: {
          address: string | null
          alternate_phone: string | null
          city: string | null
          company: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          email_normalized: string | null
          first_name: string
          full_name: string
          id: string
          last_name: string
          middle_name: string | null
          phone: string | null
          phone_normalized: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          alternate_phone?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_normalized?: string | null
          first_name?: string
          full_name?: string
          id?: string
          last_name?: string
          middle_name?: string | null
          phone?: string | null
          phone_normalized?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          alternate_phone?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_normalized?: string | null
          first_name?: string
          full_name?: string
          id?: string
          last_name?: string
          middle_name?: string | null
          phone?: string | null
          phone_normalized?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          id: string
          resource: string
        }
        Insert: {
          action: string
          id?: string
          resource: string
        }
        Update: {
          action?: string
          id?: string
          resource?: string
        }
        Relationships: []
      }
      person_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          person_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          person_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_audit_log_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          person_id: string
          role_type: Database["public"]["Enums"]["person_role_type"]
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          person_id: string
          role_type: Database["public"]["Enums"]["person_role_type"]
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          person_id?: string
          role_type?: Database["public"]["Enums"]["person_role_type"]
        }
        Relationships: [
          {
            foreignKeyName: "person_roles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_opportunities: {
        Row: {
          arive_loan_id: string | null
          close_date: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          lender_company_id: string | null
          loan_amount: number | null
          notes: string | null
          primary_contact_id: string | null
          property_address: string | null
          stage: string
          title_company_id: string | null
          updated_at: string
        }
        Insert: {
          arive_loan_id?: string | null
          close_date?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          lender_company_id?: string | null
          loan_amount?: number | null
          notes?: string | null
          primary_contact_id?: string | null
          property_address?: string | null
          stage?: string
          title_company_id?: string | null
          updated_at?: string
        }
        Update: {
          arive_loan_id?: string | null
          close_date?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          lender_company_id?: string | null
          loan_amount?: number | null
          notes?: string | null
          primary_contact_id?: string | null
          property_address?: string | null
          stage?: string
          title_company_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_opportunities_lender_company_id_fkey"
            columns: ["lender_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_opportunities_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_opportunities_title_company_id_fkey"
            columns: ["title_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_analytics_daily: {
        Row: {
          avg_time_hours: number
          conversion_pct: number
          created_at: string
          day: string
          drop_off_pct: number
          funded: number
          revenue_cents: number
          stage_id: string
        }
        Insert: {
          avg_time_hours?: number
          conversion_pct?: number
          created_at?: string
          day: string
          drop_off_pct?: number
          funded?: number
          revenue_cents?: number
          stage_id: string
        }
        Update: {
          avg_time_hours?: number
          conversion_pct?: number
          created_at?: string
          day?: string
          drop_off_pct?: number
          funded?: number
          revenue_cents?: number
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_analytics_daily_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_requirements: {
        Row: {
          created_at: string
          field_id: string | null
          field_key: string | null
          id: string
          required: boolean
          sort: number
          stage_id: string
        }
        Insert: {
          created_at?: string
          field_id?: string | null
          field_key?: string | null
          id?: string
          required?: boolean
          sort?: number
          stage_id: string
        }
        Update: {
          created_at?: string
          field_id?: string | null
          field_key?: string | null
          id?: string
          required?: boolean
          sort?: number
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_requirements_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stage_requirements_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_rules: {
        Row: {
          actions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort: number
          stage_id: string
          trigger: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort?: number
          stage_id: string
          trigger?: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort?: number
          stage_id?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_rules_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          arive_stage_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expected_days: number
          icon: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          is_terminal: boolean
          key: string
          name: string
          probability_pct: number
          sort: number
          updated_at: string
        }
        Insert: {
          arive_stage_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_days?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_terminal?: boolean
          key: string
          name: string
          probability_pct?: number
          sort?: number
          updated_at?: string
        }
        Update: {
          arive_stage_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_days?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_terminal?: boolean
          key?: string
          name?: string
          probability_pct?: number
          sort?: number
          updated_at?: string
        }
        Relationships: []
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
          assistant_enabled: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          theme_preference: string
          updated_at: string
        }
        Insert: {
          assistant_enabled?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          theme_preference?: string
          updated_at?: string
        }
        Update: {
          assistant_enabled?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          theme_preference?: string
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
      record_permissions: {
        Row: {
          created_at: string
          id: string
          resource: string
          role_id: string
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource: string
          role_id: string
          scope?: string
        }
        Update: {
          created_at?: string
          id?: string
          resource?: string
          role_id?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
          scope?: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          base_role: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          base_role?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          base_role?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip: string | null
          metadata: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          id: string
          lockout_minutes: number
          lockout_threshold: number
          mfa_default_channel: string
          mfa_mode: string
          password_policy: Json
          session_timeout_minutes: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          lockout_minutes?: number
          lockout_threshold?: number
          mfa_default_channel?: string
          mfa_mode?: string
          password_policy?: Json
          session_timeout_minutes?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          lockout_minutes?: number
          lockout_threshold?: number
          mfa_default_channel?: string
          mfa_mode?: string
          password_policy?: Json
          session_timeout_minutes?: number
          singleton?: boolean
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
          discord_message_id: string | null
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
          discord_message_id?: string | null
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
          discord_message_id?: string | null
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
          notes: string | null
          opportunity_id: string | null
          person_id: string | null
          priority: string
          related_id: string | null
          related_type: string | null
          reminded_at: string | null
          reminder_at: string | null
          status: string
          task_type: string
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
          notes?: string | null
          opportunity_id?: string | null
          person_id?: string | null
          priority?: string
          related_id?: string | null
          related_type?: string | null
          reminded_at?: string | null
          reminder_at?: string | null
          status?: string
          task_type?: string
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
          notes?: string | null
          opportunity_id?: string | null
          person_id?: string | null
          priority?: string
          related_id?: string | null
          related_type?: string | null
          reminded_at?: string | null
          reminder_at?: string | null
          status?: string
          task_type?: string
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
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "pipeline_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role_id: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role_id?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          actor_id: string | null
          application_id: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          event_source: string
          event_type: string
          id: string
          lead_id: string | null
          metadata: Json
          opportunity_id: string | null
          person_id: string | null
          source_ref_id: string | null
          title: string
        }
        Insert: {
          actor_id?: string | null
          application_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          event_source: string
          event_type: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          opportunity_id?: string | null
          person_id?: string | null
          source_ref_id?: string | null
          title: string
        }
        Update: {
          actor_id?: string | null
          application_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          event_source?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          opportunity_id?: string | null
          person_id?: string | null
          source_ref_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "pipeline_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
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
      user_sessions: {
        Row: {
          created_at: string
          device: string | null
          id: string
          ip: string | null
          last_seen_at: string
          location: string | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          ip?: string | null
          last_seen_at?: string
          location?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          ip?: string | null
          last_seen_at?: string
          location?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_targets: {
        Row: {
          applications_target: number
          calls_target: number
          created_at: string
          funded_target: number
          preapprovals_target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          applications_target?: number
          calls_target?: number
          created_at?: string
          funded_target?: number
          preapprovals_target?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          applications_target?: number
          calls_target?: number
          created_at?: string
          funded_target?: number
          preapprovals_target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      convert_person_to_lead: {
        Args: { _person_id: string }
        Returns: {
          lead_id: string
          was_existing: boolean
        }[]
      }
      convert_portal_applicant_to_lead: {
        Args: { _portal_user_id: string }
        Returns: {
          lead_id: string
          person_id: string
          was_existing: boolean
        }[]
      }
      crm_format_option_label: { Args: { _raw: string }; Returns: string }
      current_portal_user_deal: { Args: never; Returns: string }
      find_person_matches: {
        Args: { _email?: string; _name?: string; _phone?: string }
        Returns: {
          city: string
          company: string
          confidence: string
          email: string
          full_name: string
          match_reason: string
          match_tier: number
          person_id: string
          phone: string
          similarity: number
          zip: string
        }[]
      }
      generate_mortgage_snapshot: {
        Args: { _person_id: string }
        Returns: string
      }
      get_available_slots: { Args: { p_date: string }; Returns: string[] }
      get_portal_applicant_summary: {
        Args: { _lead_id: string }
        Returns: {
          completion_pct: number
          deal_id: string
          documents_required: number
          documents_uploaded: number
          email: string
          invite_accepted_at: string
          invite_sent_at: string
          last_login_at: string
          missing_items: string[]
          portal_user_id: string
          stage: string
        }[]
      }
      has_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_portal_user_for_deal: { Args: { _deal_id: string }; Returns: boolean }
      normalize_email: { Args: { _email: string }; Returns: string }
      normalize_phone: { Args: { _phone: string }; Returns: string }
      run_document_reminders: { Args: never; Returns: number }
      search_portal_applicants: {
        Args: { _email?: string; _name?: string; _phone?: string }
        Returns: {
          completion_pct: number
          confidence: string
          deal_id: string
          documents_required: number
          documents_uploaded: number
          email: string
          full_name: string
          invite_accepted_at: string
          last_login_at: string
          lead_id: string
          loan_amount: number
          loan_type: string
          match_reason: string
          person_id: string
          phone: string
          portal_user_id: string
          property_address: string
          stage: string
          started_at: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      timeline_log: {
        Args: {
          _actor_id?: string
          _application_id?: string
          _created_at?: string
          _deal_id?: string
          _description?: string
          _event_source: string
          _event_type: string
          _lead_id?: string
          _metadata?: Json
          _opportunity_id?: string
          _person_id?: string
          _source_ref_id?: string
          _title: string
        }
        Returns: string
      }
      user_owns_contact: { Args: { _contact_id: string }; Returns: boolean }
      user_owns_lead: { Args: { _lead_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "loan_officer"
        | "processor"
        | "assistant"
        | "realtor"
        | "portal_user"
      blog_post_status: "draft" | "published"
      borrower_employment_type: "employee" | "self_employed"
      company_type:
        | "lender"
        | "title_company"
        | "insurance_agency"
        | "real_estate_brokerage"
        | "other"
      contact_role:
        | "lead"
        | "borrower"
        | "co_borrower"
        | "real_estate_agent"
        | "title_agent"
        | "insurance_agent"
        | "referral_partner"
        | "internal_staff"
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
      income_doc_type:
        | "pay_stub"
        | "w2"
        | "form_1099"
        | "form_1040"
        | "business_return"
        | "unknown"
      income_extraction_status: "pending" | "applied" | "dismissed" | "failed"
      lead_status:
        | "new_lead"
        | "contacted"
        | "qualified"
        | "unqualified"
        | "converted"
        | "lost"
        | "prequalified"
        | "application_sent"
        | "underwriting"
        | "approved"
        | "closed"
        | "clear_to_close"
      los_sync_status_enum: "pending" | "synced" | "error" | "skipped"
      person_role_type:
        | "Contact"
        | "Lead"
        | "Borrower"
        | "CoBorrower"
        | "Realtor"
        | "ReferralPartner"
        | "Builder"
        | "Attorney"
        | "Vendor"
      role_on_deal:
        | "primary_borrower"
        | "co_borrower"
        | "real_estate_agent"
        | "title_agent"
        | "insurance_agent"
        | "referral_partner"
        | "other"
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
      app_role: [
        "admin",
        "loan_officer",
        "processor",
        "assistant",
        "realtor",
        "portal_user",
      ],
      blog_post_status: ["draft", "published"],
      borrower_employment_type: ["employee", "self_employed"],
      company_type: [
        "lender",
        "title_company",
        "insurance_agency",
        "real_estate_brokerage",
        "other",
      ],
      contact_role: [
        "lead",
        "borrower",
        "co_borrower",
        "real_estate_agent",
        "title_agent",
        "insurance_agent",
        "referral_partner",
        "internal_staff",
      ],
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
      income_doc_type: [
        "pay_stub",
        "w2",
        "form_1099",
        "form_1040",
        "business_return",
        "unknown",
      ],
      income_extraction_status: ["pending", "applied", "dismissed", "failed"],
      lead_status: [
        "new_lead",
        "contacted",
        "qualified",
        "unqualified",
        "converted",
        "lost",
        "prequalified",
        "application_sent",
        "underwriting",
        "approved",
        "closed",
        "clear_to_close",
      ],
      los_sync_status_enum: ["pending", "synced", "error", "skipped"],
      person_role_type: [
        "Contact",
        "Lead",
        "Borrower",
        "CoBorrower",
        "Realtor",
        "ReferralPartner",
        "Builder",
        "Attorney",
        "Vendor",
      ],
      role_on_deal: [
        "primary_borrower",
        "co_borrower",
        "real_estate_agent",
        "title_agent",
        "insurance_agent",
        "referral_partner",
        "other",
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
