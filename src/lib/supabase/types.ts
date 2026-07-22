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
      admin_users: {
        Row: {
          avatar_initials: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          invited_by: string | null
          role: string
          sidebar_role_label: string
          status: Database["public"]["Enums"]["admin_user_status"]
          updated_at: string
        }
        Insert: {
          avatar_initials?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          invited_by?: string | null
          role?: string
          sidebar_role_label?: string
          status?: Database["public"]["Enums"]["admin_user_status"]
          updated_at?: string
        }
        Update: {
          avatar_initials?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          role?: string
          sidebar_role_label?: string
          status?: Database["public"]["Enums"]["admin_user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      bt_schedule_assignments: {
        Row: {
          assigned_staff_id: string | null
          client_id: string
          covering_for_staff_id: string | null
          created_at: string
          id: string
          session_date: string
          session_period: Database["public"]["Enums"]["session_period"]
          status: Database["public"]["Enums"]["schedule_status"]
          updated_at: string
          updated_by: string | null
          week_id: string
        }
        Insert: {
          assigned_staff_id?: string | null
          client_id: string
          covering_for_staff_id?: string | null
          created_at?: string
          id?: string
          session_date: string
          session_period: Database["public"]["Enums"]["session_period"]
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
          updated_by?: string | null
          week_id: string
        }
        Update: {
          assigned_staff_id?: string | null
          client_id?: string
          covering_for_staff_id?: string | null
          created_at?: string
          id?: string
          session_date?: string
          session_period?: Database["public"]["Enums"]["session_period"]
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
          updated_by?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bt_schedule_assignments_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bt_schedule_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bt_schedule_assignments_covering_for_staff_id_fkey"
            columns: ["covering_for_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bt_schedule_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bt_schedule_assignments_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "compliance_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      case_note_checkoffs: {
        Row: {
          assigned_staff_id: string | null
          client_id: string
          confirmed_via: Database["public"]["Enums"]["checkoff_source"] | null
          created_at: string
          id: string
          matched_upload_id: string | null
          session_date: string
          session_period: Database["public"]["Enums"]["session_period"]
          session_time_range: string | null
          slot: number
          status: Database["public"]["Enums"]["checkoff_status"]
          updated_at: string
          week_id: string
        }
        Insert: {
          assigned_staff_id?: string | null
          client_id: string
          confirmed_via?: Database["public"]["Enums"]["checkoff_source"] | null
          created_at?: string
          id?: string
          matched_upload_id?: string | null
          session_date: string
          session_period: Database["public"]["Enums"]["session_period"]
          session_time_range?: string | null
          slot: number
          status?: Database["public"]["Enums"]["checkoff_status"]
          updated_at?: string
          week_id: string
        }
        Update: {
          assigned_staff_id?: string | null
          client_id?: string
          confirmed_via?: Database["public"]["Enums"]["checkoff_source"] | null
          created_at?: string
          id?: string
          matched_upload_id?: string | null
          session_date?: string
          session_period?: Database["public"]["Enums"]["session_period"]
          session_time_range?: string | null
          slot?: number
          status?: Database["public"]["Enums"]["checkoff_status"]
          updated_at?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_note_checkoffs_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_note_checkoffs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_note_checkoffs_matched_upload_id_fkey"
            columns: ["matched_upload_id"]
            isOneToOne: false
            referencedRelation: "catalyst_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_note_checkoffs_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "compliance_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      case_note_overrides: {
        Row: {
          checkoff_id: string
          id: string
          logged_at: string
          logged_by: string | null
          reason_code: Database["public"]["Enums"]["override_reason"]
          reason_note: string | null
        }
        Insert: {
          checkoff_id: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          reason_code: Database["public"]["Enums"]["override_reason"]
          reason_note?: string | null
        }
        Update: {
          checkoff_id?: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          reason_code?: Database["public"]["Enums"]["override_reason"]
          reason_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_note_overrides_checkoff_id_fkey"
            columns: ["checkoff_id"]
            isOneToOne: false
            referencedRelation: "case_note_checkoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_note_overrides_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      catalyst_uploads: {
        Row: {
          file_name: string
          id: string
          rows_matched: number
          rows_total: number
          uploaded_at: string
          uploaded_by: string | null
          week_id: string
        }
        Insert: {
          file_name: string
          id?: string
          rows_matched?: number
          rows_total?: number
          uploaded_at?: string
          uploaded_by?: string | null
          week_id: string
        }
        Update: {
          file_name?: string
          id?: string
          rows_matched?: number
          rows_total?: number
          uploaded_at?: string
          uploaded_by?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalyst_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalyst_uploads_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "compliance_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          doc_type: Database["public"]["Enums"]["client_doc_type"]
          drive_file_id: string | null
          drive_url: string | null
          expires_on: string | null
          id: string
          status: Database["public"]["Enums"]["client_doc_status"]
          updated_at: string
          uploaded_on: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          doc_type: Database["public"]["Enums"]["client_doc_type"]
          drive_file_id?: string | null
          drive_url?: string | null
          expires_on?: string | null
          id?: string
          status?: Database["public"]["Enums"]["client_doc_status"]
          updated_at?: string
          uploaded_on?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["client_doc_type"]
          drive_file_id?: string | null
          drive_url?: string | null
          expires_on?: string | null
          id?: string
          status?: Database["public"]["Enums"]["client_doc_status"]
          updated_at?: string
          uploaded_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          body: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      client_stage_history: {
        Row: {
          changed_by: string | null
          client_id: string
          entered_at: string
          id: string
          note: string | null
          stage_id: string
        }
        Insert: {
          changed_by?: string | null
          client_id: string
          entered_at?: string
          id?: string
          note?: string | null
          stage_id: string
        }
        Update: {
          changed_by?: string | null
          client_id?: string
          entered_at?: string
          id?: string
          note?: string | null
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_stage_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_stage_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_stage_history_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          aba_status: Database["public"]["Enums"]["aba_status"]
          age_label: string | null
          assigned_bcba_id: string | null
          cmde_submitted_on: string | null
          corrections_requested: boolean
          created_at: string
          current_stage_id: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          handled_by_admin_id: string | null
          id: string
          itp_drafting_started_on: string | null
          itp_submitted_on: string | null
          ma_status: Database["public"]["Enums"]["ma_status"]
          phone_screen_due_on: string | null
          ref_code: string
          referral_source: Database["public"]["Enums"]["referral_source"] | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          aba_status?: Database["public"]["Enums"]["aba_status"]
          age_label?: string | null
          assigned_bcba_id?: string | null
          cmde_submitted_on?: string | null
          corrections_requested?: boolean
          created_at?: string
          current_stage_id?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          handled_by_admin_id?: string | null
          id?: string
          itp_drafting_started_on?: string | null
          itp_submitted_on?: string | null
          ma_status?: Database["public"]["Enums"]["ma_status"]
          phone_screen_due_on?: string | null
          ref_code: string
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          aba_status?: Database["public"]["Enums"]["aba_status"]
          age_label?: string | null
          assigned_bcba_id?: string | null
          cmde_submitted_on?: string | null
          corrections_requested?: boolean
          created_at?: string
          current_stage_id?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          handled_by_admin_id?: string | null
          id?: string
          itp_drafting_started_on?: string | null
          itp_submitted_on?: string | null
          ma_status?: Database["public"]["Enums"]["ma_status"]
          phone_screen_due_on?: string | null
          ref_code?: string
          referral_source?:
            | Database["public"]["Enums"]["referral_source"]
            | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_bcba_id_fkey"
            columns: ["assigned_bcba_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_handled_by_admin_id_fkey"
            columns: ["handled_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_weeks: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["compliance_week_status"]
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["compliance_week_status"]
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["compliance_week_status"]
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      drive_watch_channels: {
        Row: {
          channel_id: string
          client_id: string | null
          created_at: string
          expiration: string | null
          id: string
          resource_id: string
          resource_uri: string | null
        }
        Insert: {
          channel_id: string
          client_id?: string | null
          created_at?: string
          expiration?: string | null
          id?: string
          resource_id: string
          resource_uri?: string | null
        }
        Update: {
          channel_id?: string
          client_id?: string | null
          created_at?: string
          expiration?: string | null
          id?: string
          resource_id?: string
          resource_uri?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_watch_channels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      esign_requests: {
        Row: {
          client_id: string
          created_at: string
          document_type: Database["public"]["Enums"]["esign_doc_type"]
          external_id: string | null
          id: string
          provider: string
          sent_at: string | null
          signed_at: string | null
          signed_drive_file_id: string | null
          status: Database["public"]["Enums"]["esign_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          document_type: Database["public"]["Enums"]["esign_doc_type"]
          external_id?: string | null
          id?: string
          provider?: string
          sent_at?: string | null
          signed_at?: string | null
          signed_drive_file_id?: string | null
          status?: Database["public"]["Enums"]["esign_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          document_type?: Database["public"]["Enums"]["esign_doc_type"]
          external_id?: string | null
          id?: string
          provider?: string
          sent_at?: string | null
          signed_at?: string | null
          signed_drive_file_id?: string | null
          status?: Database["public"]["Enums"]["esign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "esign_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      global_training_status: {
        Row: {
          completed: boolean
          completed_by: string | null
          completed_on: string | null
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_by?: string | null
          completed_on?: string | null
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_by?: string | null
          completed_on?: string | null
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_training_status_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          access_token: string | null
          refresh_token: string | null
          scope: string | null
          service: Database["public"]["Enums"]["integration_service"]
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          refresh_token?: string | null
          scope?: string | null
          service: Database["public"]["Enums"]["integration_service"]
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          refresh_token?: string | null
          scope?: string | null
          service?: Database["public"]["Enums"]["integration_service"]
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_service_fkey"
            columns: ["service"]
            isOneToOne: true
            referencedRelation: "integrations"
            referencedColumns: ["service"]
          },
        ]
      }
      integrations: {
        Row: {
          connected_account_email: string | null
          connected_at: string | null
          id: string
          service: Database["public"]["Enums"]["integration_service"]
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
        }
        Insert: {
          connected_account_email?: string | null
          connected_at?: string | null
          id?: string
          service: Database["public"]["Enums"]["integration_service"]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
        }
        Update: {
          connected_account_email?: string | null
          connected_at?: string | null
          id?: string
          service?: Database["public"]["Enums"]["integration_service"]
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          detail: string | null
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          sent_at: string
          status: string
        }
        Insert: {
          detail?: string | null
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          sent_at?: string
          status?: string
        }
        Update: {
          detail?: string | null
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          cadence_label: string
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
        }
        Insert: {
          cadence_label: string
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Update: {
          cadence_label?: string
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          admin_user_id: string | null
          created_at: string
          email: string | null
          id: string
          notification_preference_id: string
          target_type: Database["public"]["Enums"]["recipient_target"]
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notification_preference_id: string
          target_type: Database["public"]["Enums"]["recipient_target"]
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notification_preference_id?: string
          target_type?: Database["public"]["Enums"]["recipient_target"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_notification_preference_id_fkey"
            columns: ["notification_preference_id"]
            isOneToOne: false
            referencedRelation: "notification_preferences"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          address: string | null
          document_gate_enabled: boolean
          id: boolean
          itp_weekly_repeat_enabled: boolean
          phone: string | null
          practice_name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          document_gate_enabled?: boolean
          id?: boolean
          itp_weekly_repeat_enabled?: boolean
          phone?: string | null
          practice_name?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          document_gate_enabled?: boolean
          id?: boolean
          itp_weekly_repeat_enabled?: boolean
          phone?: string | null
          practice_name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          advance_trigger: string | null
          created_at: string
          id: string
          is_terminal: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          advance_trigger?: string | null
          created_at?: string
          id?: string
          is_terminal?: boolean
          key: string
          name: string
          sort_order: number
        }
        Update: {
          advance_trigger?: string | null
          created_at?: string
          id?: string
          is_terminal?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      renewal_rules: {
        Row: {
          document_type: Database["public"]["Enums"]["renewal_doc_type"]
          id: string
          interval_count: number
          interval_unit: Database["public"]["Enums"]["interval_unit"]
          reminder_lead_count: number
          reminder_lead_unit: Database["public"]["Enums"]["interval_unit"]
          updated_at: string
        }
        Insert: {
          document_type: Database["public"]["Enums"]["renewal_doc_type"]
          id?: string
          interval_count: number
          interval_unit: Database["public"]["Enums"]["interval_unit"]
          reminder_lead_count: number
          reminder_lead_unit: Database["public"]["Enums"]["interval_unit"]
          updated_at?: string
        }
        Update: {
          document_type?: Database["public"]["Enums"]["renewal_doc_type"]
          id?: string
          interval_count?: number
          interval_unit?: Database["public"]["Enums"]["interval_unit"]
          reminder_lead_count?: number
          reminder_lead_unit?: Database["public"]["Enums"]["interval_unit"]
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          avatar_bg: string | null
          avatar_color: string | null
          avatar_initials: string | null
          background_study_number: string | null
          bcba_cert_number: string | null
          created_at: string
          drive_folder_id: string | null
          drive_folder_url: string | null
          email: string | null
          full_name: string
          hired_on: string | null
          id: string
          notes: string | null
          phone: string | null
          role: string
          role_type: string | null
          status: Database["public"]["Enums"]["staff_status"]
          updated_at: string
        }
        Insert: {
          avatar_bg?: string | null
          avatar_color?: string | null
          avatar_initials?: string | null
          background_study_number?: string | null
          bcba_cert_number?: string | null
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          full_name: string
          hired_on?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          role: string
          role_type?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
        }
        Update: {
          avatar_bg?: string | null
          avatar_color?: string | null
          avatar_initials?: string | null
          background_study_number?: string | null
          bcba_cert_number?: string | null
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          email?: string | null
          full_name?: string
          hired_on?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          role?: string
          role_type?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
        }
        Relationships: []
      }
      staff_background_checks: {
        Row: {
          completed_on: string | null
          created_at: string
          id: string
          note: string | null
          sort_order: number
          staff_id: string
          status: Database["public"]["Enums"]["background_status"]
          step: Database["public"]["Enums"]["background_step"]
          updated_at: string
        }
        Insert: {
          completed_on?: string | null
          created_at?: string
          id?: string
          note?: string | null
          sort_order?: number
          staff_id: string
          status?: Database["public"]["Enums"]["background_status"]
          step: Database["public"]["Enums"]["background_step"]
          updated_at?: string
        }
        Update: {
          completed_on?: string | null
          created_at?: string
          id?: string
          note?: string | null
          sort_order?: number
          staff_id?: string
          status?: Database["public"]["Enums"]["background_status"]
          step?: Database["public"]["Enums"]["background_step"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_background_checks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_checklist_template: {
        Row: {
          active: boolean
          checklist_group: Database["public"]["Enums"]["staff_checklist_group"]
          created_at: string
          default_due_offset_days: number | null
          id: string
          is_global_one_time: boolean
          is_training: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          checklist_group: Database["public"]["Enums"]["staff_checklist_group"]
          created_at?: string
          default_due_offset_days?: number | null
          id?: string
          is_global_one_time?: boolean
          is_training?: boolean
          name: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          checklist_group?: Database["public"]["Enums"]["staff_checklist_group"]
          created_at?: string
          default_due_offset_days?: number | null
          id?: string
          is_global_one_time?: boolean
          is_training?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_documents: {
        Row: {
          created_at: string
          drive_file_id: string | null
          drive_url: string | null
          id: string
          name: string
          staff_id: string
          status: Database["public"]["Enums"]["staff_doc_status"]
          submitted_on: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          name: string
          staff_id: string
          status?: Database["public"]["Enums"]["staff_doc_status"]
          submitted_on?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          name?: string
          staff_id?: string
          status?: Database["public"]["Enums"]["staff_doc_status"]
          submitted_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_onboarding_items: {
        Row: {
          blocked: boolean
          checklist_group: Database["public"]["Enums"]["staff_checklist_group"]
          completed_on: string | null
          created_at: string
          done: boolean
          due_on: string | null
          id: string
          label: string
          lock_reason: string | null
          locked: boolean
          sort_order: number
          staff_id: string
          template_item_id: string | null
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          checklist_group: Database["public"]["Enums"]["staff_checklist_group"]
          completed_on?: string | null
          created_at?: string
          done?: boolean
          due_on?: string | null
          id?: string
          label: string
          lock_reason?: string | null
          locked?: boolean
          sort_order?: number
          staff_id: string
          template_item_id?: string | null
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          checklist_group?: Database["public"]["Enums"]["staff_checklist_group"]
          completed_on?: string | null
          created_at?: string
          done?: boolean
          due_on?: string | null
          id?: string
          label?: string
          lock_reason?: string | null
          locked?: boolean
          sort_order?: number
          staff_id?: string
          template_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_onboarding_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_onboarding_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "staff_checklist_template"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_trainings: {
        Row: {
          cert_drive_file_id: string | null
          cert_drive_url: string | null
          completed_on: string | null
          created_at: string
          due_on: string | null
          id: string
          name: string
          staff_id: string
          status: Database["public"]["Enums"]["training_status"]
          updated_at: string
        }
        Insert: {
          cert_drive_file_id?: string | null
          cert_drive_url?: string | null
          completed_on?: string | null
          created_at?: string
          due_on?: string | null
          id?: string
          name: string
          staff_id: string
          status?: Database["public"]["Enums"]["training_status"]
          updated_at?: string
        }
        Update: {
          cert_drive_file_id?: string | null
          cert_drive_url?: string | null
          completed_on?: string | null
          created_at?: string
          due_on?: string | null
          id?: string
          name?: string
          staff_id?: string
          status?: Database["public"]["Enums"]["training_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_trainings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      aba_status: "new" | "not_new" | "unknown"
      admin_user_status: "active" | "invited" | "disabled"
      background_status:
        | "pending"
        | "in_progress"
        | "complete"
        | "overdue"
        | "blocked"
        | "logged"
        | "not_assigned"
      background_step:
        | "step1_application"
        | "step2_fingerprinting"
        | "step3_approval"
        | "study_number"
      checkoff_source: "manual" | "upload"
      checkoff_status:
        | "pending"
        | "confirmed"
        | "missing"
        | "overridden"
        | "not_applicable"
      client_doc_status:
        | "missing"
        | "requested"
        | "uploaded"
        | "submitted"
        | "pending_approval"
        | "approved"
        | "signed"
        | "awaiting_esig"
        | "not_sent"
        | "not_yet_created"
      client_doc_type:
        | "medical_documentation"
        | "insurance_card"
        | "food_allergies"
        | "student_questionnaire"
        | "roi"
        | "discharge_doc"
        | "medication_questionnaire"
        | "prev_diagnostic"
        | "cmde"
        | "itp"
        | "iep"
        | "wellness_assessment"
        | "parent_handbook"
        | "service_agreement"
        | "transport_agreement"
      client_status:
        | "active"
        | "onboarding"
        | "inactive"
        | "referred_out"
        | "closed"
      compliance_week_status: "open" | "finalized"
      esign_doc_type:
        | "parent_handbook"
        | "service_agreement"
        | "transport_agreement"
        | "roi"
      esign_status: "not_sent" | "sent" | "viewed" | "signed" | "declined"
      integration_service: "drive" | "gmail_workspace" | "docseal" | "resend"
      integration_status: "connected" | "not_connected" | "error"
      interval_unit: "day" | "week" | "month" | "year"
      ma_status: "verified" | "unverified" | "none" | "unknown"
      notification_type:
        | "document_expiring"
        | "itp_drafting_reminder"
        | "missing_case_note"
        | "weekly_compliance_report"
        | "staff_training_uploaded"
        | "new_referral"
      override_reason:
        | "cancelled_absent"
        | "bt_sick_no_coverage"
        | "pending_bcba_review"
        | "clinic_closure"
        | "other"
      recipient_target: "admin_user" | "email" | "assigned_bt_plus_admin"
      referral_source:
        | "website"
        | "phone"
        | "email"
        | "provider"
        | "walk_in"
        | "other"
      renewal_doc_type:
        | "cmde"
        | "itp"
        | "iep"
        | "wellness_assessment"
        | "transport_agreement"
      schedule_status: "assigned" | "covering" | "unassigned" | "no_session"
      session_period: "am" | "pm"
      staff_checklist_group:
        | "hiring_paperwork"
        | "background_study"
        | "required_training"
        | "global_one_time"
        | "program_onboarding"
        | "locked_needs_bg_check"
      staff_doc_status: "missing" | "pending" | "uploaded"
      staff_status:
        | "onboarding"
        | "active"
        | "needs_action"
        | "fully_onboarded"
        | "inactive"
      training_status:
        | "pending"
        | "in_progress"
        | "complete"
        | "overdue"
        | "upcoming"
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
      aba_status: ["new", "not_new", "unknown"],
      admin_user_status: ["active", "invited", "disabled"],
      background_status: [
        "pending",
        "in_progress",
        "complete",
        "overdue",
        "blocked",
        "logged",
        "not_assigned",
      ],
      background_step: [
        "step1_application",
        "step2_fingerprinting",
        "step3_approval",
        "study_number",
      ],
      checkoff_source: ["manual", "upload"],
      checkoff_status: [
        "pending",
        "confirmed",
        "missing",
        "overridden",
        "not_applicable",
      ],
      client_doc_status: [
        "missing",
        "requested",
        "uploaded",
        "submitted",
        "pending_approval",
        "approved",
        "signed",
        "awaiting_esig",
        "not_sent",
        "not_yet_created",
      ],
      client_doc_type: [
        "medical_documentation",
        "insurance_card",
        "food_allergies",
        "student_questionnaire",
        "roi",
        "discharge_doc",
        "medication_questionnaire",
        "prev_diagnostic",
        "cmde",
        "itp",
        "iep",
        "wellness_assessment",
        "parent_handbook",
        "service_agreement",
        "transport_agreement",
      ],
      client_status: [
        "active",
        "onboarding",
        "inactive",
        "referred_out",
        "closed",
      ],
      compliance_week_status: ["open", "finalized"],
      esign_doc_type: [
        "parent_handbook",
        "service_agreement",
        "transport_agreement",
        "roi",
      ],
      esign_status: ["not_sent", "sent", "viewed", "signed", "declined"],
      integration_service: ["drive", "gmail_workspace", "docseal", "resend"],
      integration_status: ["connected", "not_connected", "error"],
      interval_unit: ["day", "week", "month", "year"],
      ma_status: ["verified", "unverified", "none", "unknown"],
      notification_type: [
        "document_expiring",
        "itp_drafting_reminder",
        "missing_case_note",
        "weekly_compliance_report",
        "staff_training_uploaded",
        "new_referral",
      ],
      override_reason: [
        "cancelled_absent",
        "bt_sick_no_coverage",
        "pending_bcba_review",
        "clinic_closure",
        "other",
      ],
      recipient_target: ["admin_user", "email", "assigned_bt_plus_admin"],
      referral_source: [
        "website",
        "phone",
        "email",
        "provider",
        "walk_in",
        "other",
      ],
      renewal_doc_type: [
        "cmde",
        "itp",
        "iep",
        "wellness_assessment",
        "transport_agreement",
      ],
      schedule_status: ["assigned", "covering", "unassigned", "no_session"],
      session_period: ["am", "pm"],
      staff_checklist_group: [
        "hiring_paperwork",
        "background_study",
        "required_training",
        "global_one_time",
        "program_onboarding",
        "locked_needs_bg_check",
      ],
      staff_doc_status: ["missing", "pending", "uploaded"],
      staff_status: [
        "onboarding",
        "active",
        "needs_action",
        "fully_onboarded",
        "inactive",
      ],
      training_status: [
        "pending",
        "in_progress",
        "complete",
        "overdue",
        "upcoming",
      ],
    },
  },
} as const
