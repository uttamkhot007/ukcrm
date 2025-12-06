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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      approval_workflows: {
        Row: {
          approval_level: number
          approved_at: string | null
          approver_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          required_role: string
          status: string
        }
        Insert: {
          approval_level?: number
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          required_role?: string
          status?: string
        }
        Update: {
          approval_level?: number
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          required_role?: string
          status?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
          work_hours: number | null
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
          work_hours?: number | null
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
          work_hours?: number | null
        }
        Relationships: []
      }
      compliance_assessments: {
        Row: {
          assessment_date: string
          assessor_id: string
          compliant_count: number | null
          created_at: string
          findings: string | null
          framework_id: string
          id: string
          in_progress_count: number | null
          non_compliant_count: number | null
          overall_status: Database["public"]["Enums"]["compliance_status"]
          recommendations: string | null
          updated_at: string
        }
        Insert: {
          assessment_date?: string
          assessor_id: string
          compliant_count?: number | null
          created_at?: string
          findings?: string | null
          framework_id: string
          id?: string
          in_progress_count?: number | null
          non_compliant_count?: number | null
          overall_status?: Database["public"]["Enums"]["compliance_status"]
          recommendations?: string | null
          updated_at?: string
        }
        Update: {
          assessment_date?: string
          assessor_id?: string
          compliant_count?: number | null
          created_at?: string
          findings?: string | null
          framework_id?: string
          id?: string
          in_progress_count?: number | null
          non_compliant_count?: number | null
          overall_status?: Database["public"]["Enums"]["compliance_status"]
          recommendations?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_assessments_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_controls: {
        Row: {
          assigned_to: string | null
          category: string | null
          control_id: string
          created_at: string
          description: string | null
          due_date: string | null
          framework_id: string
          id: string
          last_assessed_at: string | null
          notes: string | null
          status: Database["public"]["Enums"]["compliance_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          control_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          framework_id: string
          id?: string
          last_assessed_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          control_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          framework_id?: string
          id?: string
          last_assessed_at?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["compliance_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_controls_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "compliance_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_evidence: {
        Row: {
          control_id: string
          created_at: string
          description: string | null
          file_name: string | null
          file_url: string | null
          id: string
          title: string
          uploaded_by: string
        }
        Insert: {
          control_id: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          title: string
          uploaded_by: string
        }
        Update: {
          control_id?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_evidence_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "compliance_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_frameworks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["framework_type"]
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: Database["public"]["Enums"]["framework_type"]
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["framework_type"]
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          designation: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_activities: {
        Row: {
          activity_type: string
          created_at: string
          deal_id: string
          description: string
          id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          deal_id: string
          description: string
          id?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          deal_id?: string
          description?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_close_date: string | null
          assigned_to: string | null
          closed_won_substage:
            | Database["public"]["Enums"]["closed_won_substage"]
            | null
          contact_id: string | null
          created_at: string
          description: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          loss_reason: string | null
          probability: number | null
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          actual_close_date?: string | null
          assigned_to?: string | null
          closed_won_substage?:
            | Database["public"]["Enums"]["closed_won_substage"]
            | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          loss_reason?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          actual_close_date?: string | null
          assigned_to?: string | null
          closed_won_substage?:
            | Database["public"]["Enums"]["closed_won_substage"]
            | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          loss_reason?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          is_recurring: boolean | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type: string
          id?: string
          is_recurring?: boolean | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      employee_requests: {
        Row: {
          advance_amount: number | null
          advance_reason: string | null
          assigned_team: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          escalated: boolean | null
          escalation_level: number | null
          hardware_description: string | null
          hardware_type: string | null
          id: string
          leave_end_date: string | null
          leave_start_date: string | null
          leave_type: string | null
          priority: Database["public"]["Enums"]["request_priority"]
          request_number: string
          resolved_at: string | null
          reviewed_at: string | null
          sla_deadline: string | null
          sla_hours: number
          status: Database["public"]["Enums"]["request_status"]
          submitted_at: string
          title: string
          type: Database["public"]["Enums"]["request_type"]
          updated_at: string
          user_id: string
          wfh_date: string | null
          wfh_reason: string | null
        }
        Insert: {
          advance_amount?: number | null
          advance_reason?: string | null
          assigned_team?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          escalated?: boolean | null
          escalation_level?: number | null
          hardware_description?: string | null
          hardware_type?: string | null
          id?: string
          leave_end_date?: string | null
          leave_start_date?: string | null
          leave_type?: string | null
          priority?: Database["public"]["Enums"]["request_priority"]
          request_number: string
          resolved_at?: string | null
          reviewed_at?: string | null
          sla_deadline?: string | null
          sla_hours?: number
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
          title: string
          type: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id: string
          wfh_date?: string | null
          wfh_reason?: string | null
        }
        Update: {
          advance_amount?: number | null
          advance_reason?: string | null
          assigned_team?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          escalated?: boolean | null
          escalation_level?: number | null
          hardware_description?: string | null
          hardware_type?: string | null
          id?: string
          leave_end_date?: string | null
          leave_start_date?: string | null
          leave_type?: string | null
          priority?: Database["public"]["Enums"]["request_priority"]
          request_number?: string
          resolved_at?: string | null
          reviewed_at?: string | null
          sla_deadline?: string | null
          sla_hours?: number
          status?: Database["public"]["Enums"]["request_status"]
          submitted_at?: string
          title?: string
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id?: string
          wfh_date?: string | null
          wfh_reason?: string | null
        }
        Relationships: []
      }
      event_wishes: {
        Row: {
          created_at: string
          emoji: string | null
          event_id: string
          id: string
          is_read: boolean | null
          message: string | null
          recipient_id: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          event_id: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          event_id?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_wishes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "employee_events"
            referencedColumns: ["id"]
          },
        ]
      }
      inside_sales_prospects: {
        Row: {
          assigned_to: string | null
          company_name: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          follow_up_date: string | null
          id: string
          last_contacted_at: string | null
          loss_reason: string | null
          notes: string | null
          original_deal_title: string
          original_deal_value: number | null
          priority: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          loss_reason?: string | null
          notes?: string | null
          original_deal_title: string
          original_deal_value?: number | null
          priority?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          loss_reason?: string | null
          notes?: string | null
          original_deal_title?: string
          original_deal_value?: number | null
          priority?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inside_sales_prospects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inside_sales_prospects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          provider: string
          refresh_token: string | null
          settings: Json | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider: string
          refresh_token?: string | null
          settings?: Json | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          settings?: Json | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          billing_frequency: Database["public"]["Enums"]["billing_frequency"]
          contact_id: string | null
          created_at: string
          created_by: string
          currency: string | null
          deal_id: string | null
          discount_amount: number | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number | null
          terms: string | null
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          contact_id?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          contact_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          terms?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          estimated_value: number | null
          id: string
          notes: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          notes?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          notes?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_approvals: {
        Row: {
          action: string
          created_at: string
          document_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          document_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_comments: {
        Row: {
          comment: string
          comment_type: string
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          comment: string
          comment_type?: string
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          comment?: string
          comment_type?: string
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          file_name: string | null
          file_url: string | null
          id: string
          status: Database["public"]["Enums"]["legal_document_status"]
          title: string
          type: Database["public"]["Enums"]["legal_document_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["legal_document_status"]
          title: string
          type?: Database["public"]["Enums"]["legal_document_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["legal_document_status"]
          title?: string
          type?: Database["public"]["Enums"]["legal_document_type"]
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_approvals: boolean
          email_compliance: boolean
          email_deals: boolean
          email_enabled: boolean
          email_renewals: boolean
          email_requests: boolean
          email_tickets: boolean
          id: string
          in_app_approvals: boolean
          in_app_compliance: boolean
          in_app_deals: boolean
          in_app_enabled: boolean
          in_app_renewals: boolean
          in_app_requests: boolean
          in_app_tickets: boolean
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          sound_enabled: boolean
          sound_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_approvals?: boolean
          email_compliance?: boolean
          email_deals?: boolean
          email_enabled?: boolean
          email_renewals?: boolean
          email_requests?: boolean
          email_tickets?: boolean
          id?: string
          in_app_approvals?: boolean
          in_app_compliance?: boolean
          in_app_deals?: boolean
          in_app_enabled?: boolean
          in_app_renewals?: boolean
          in_app_requests?: boolean
          in_app_tickets?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          sound_enabled?: boolean
          sound_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_approvals?: boolean
          email_compliance?: boolean
          email_deals?: boolean
          email_enabled?: boolean
          email_renewals?: boolean
          email_requests?: boolean
          email_tickets?: boolean
          id?: string
          in_app_approvals?: boolean
          in_app_compliance?: boolean
          in_app_deals?: boolean
          in_app_enabled?: boolean
          in_app_renewals?: boolean
          in_app_requests?: boolean
          in_app_tickets?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          sound_enabled?: boolean
          sound_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          address: string | null
          alert_managers_on_early_departure: boolean | null
          alert_managers_on_late: boolean | null
          cities: string[] | null
          consecutive_late_threshold: number | null
          countries: string[] | null
          created_at: string
          currency: string | null
          early_departure_alert_enabled: boolean | null
          early_departure_threshold_minutes: number | null
          id: string
          late_arrival_alert_enabled: boolean | null
          late_threshold_minutes: number | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          senior_management: Json | null
          total_employees: number | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          address?: string | null
          alert_managers_on_early_departure?: boolean | null
          alert_managers_on_late?: boolean | null
          cities?: string[] | null
          consecutive_late_threshold?: number | null
          countries?: string[] | null
          created_at?: string
          currency?: string | null
          early_departure_alert_enabled?: boolean | null
          early_departure_threshold_minutes?: number | null
          id?: string
          late_arrival_alert_enabled?: boolean | null
          late_threshold_minutes?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          senior_management?: Json | null
          total_employees?: number | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          address?: string | null
          alert_managers_on_early_departure?: boolean | null
          alert_managers_on_late?: boolean | null
          cities?: string[] | null
          consecutive_late_threshold?: number | null
          countries?: string[] | null
          created_at?: string
          currency?: string | null
          early_departure_alert_enabled?: boolean | null
          early_departure_threshold_minutes?: number | null
          id?: string
          late_arrival_alert_enabled?: boolean | null
          late_threshold_minutes?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          senior_management?: Json | null
          total_employees?: number | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          recorded_by: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          quotation_id: string
          sort_order: number | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          quotation_id: string
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quotation_id?: string
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          contact_id: string | null
          created_at: string
          currency: string | null
          deal_id: string | null
          description: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          quotation_number: string
          status: Database["public"]["Enums"]["quotation_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number | null
          terms: string | null
          title: string
          total: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quotation_number: string
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          terms?: string | null
          title: string
          total?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          deal_id?: string | null
          description?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quotation_number?: string
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number | null
          terms?: string | null
          title?: string
          total?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      renewals: {
        Row: {
          assigned_to: string | null
          auto_renew: boolean | null
          contact_id: string | null
          cost: number | null
          created_at: string
          created_by: string
          deal_id: string | null
          expiry_date: string
          id: string
          name: string
          notes: string | null
          notified_1_week: boolean | null
          notified_2_weeks: boolean | null
          notified_3_weeks: boolean | null
          notified_4_weeks: boolean | null
          reminder_days: number | null
          start_date: string
          status: Database["public"]["Enums"]["renewal_status"]
          type: Database["public"]["Enums"]["renewal_type"]
          updated_at: string
          vendor: string | null
        }
        Insert: {
          assigned_to?: string | null
          auto_renew?: boolean | null
          contact_id?: string | null
          cost?: number | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          expiry_date: string
          id?: string
          name: string
          notes?: string | null
          notified_1_week?: boolean | null
          notified_2_weeks?: boolean | null
          notified_3_weeks?: boolean | null
          notified_4_weeks?: boolean | null
          reminder_days?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["renewal_status"]
          type?: Database["public"]["Enums"]["renewal_type"]
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          assigned_to?: string | null
          auto_renew?: boolean | null
          contact_id?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          expiry_date?: string
          id?: string
          name?: string
          notes?: string | null
          notified_1_week?: boolean | null
          notified_2_weeks?: boolean | null
          notified_3_weeks?: boolean | null
          notified_4_weeks?: boolean | null
          reminder_days?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["renewal_status"]
          type?: Database["public"]["Enums"]["renewal_type"]
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renewals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      request_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_internal: boolean | null
          request_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          request_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "employee_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["request_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["request_status"] | null
          request_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["request_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["request_status"] | null
          request_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["request_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["request_status"] | null
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "employee_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_images: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          sop_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          sop_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          sop_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_images_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_versions: {
        Row: {
          change_notes: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          sop_id: string
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          sop_id: string
          version_number: number
        }
        Update: {
          change_notes?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          sop_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sop_versions_sop_id_fkey"
            columns: ["sop_id"]
            isOneToOne: false
            referencedRelation: "sops"
            referencedColumns: ["id"]
          },
        ]
      }
      sops: {
        Row: {
          category: string
          created_at: string
          created_by: string
          current_version: number
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          current_version?: number
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          current_version?: number
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_internal: boolean | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          description: string | null
          escalated_to: string | null
          escalation_level: number | null
          first_response_at: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          sla_deadline: string | null
          sla_hours: number
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_deadline?: string | null
          sla_hours?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          first_response_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_deadline?: string | null
          sla_hours?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_teams: {
        Row: {
          created_at: string
          id: string
          team: Database["public"]["Enums"]["team_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team: Database["public"]["Enums"]["team_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team?: Database["public"]["Enums"]["team_type"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          status: string
          workflow_type: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          status?: string
          workflow_type: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          status?: string
          workflow_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_team: {
        Args: {
          _teams: Database["public"]["Enums"]["team_type"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_sales_access: { Args: { _user_id: string }; Returns: boolean }
      has_team: {
        Args: {
          _team: Database["public"]["Enums"]["team_type"]
          _user_id: string
        }
        Returns: boolean
      }
      is_management: { Args: { _user_id: string }; Returns: boolean }
      promote_to_admin: { Args: { _user_email: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
      billing_frequency: "one_time" | "monthly" | "quarterly" | "annually"
      closed_won_substage:
        | "odf_created"
        | "odf_approved"
        | "invoice_raised"
        | "payment_received"
      compliance_status:
        | "not_started"
        | "in_progress"
        | "compliant"
        | "non_compliant"
        | "needs_review"
      deal_stage:
        | "pipeline"
        | "upside"
        | "strong_upside"
        | "commit"
        | "closed_won"
        | "closed_lost"
      framework_type:
        | "soc2"
        | "iso27001"
        | "hipaa"
        | "pci_dss"
        | "gdpr"
        | "nist"
        | "other"
      invoice_status:
        | "draft"
        | "sent"
        | "paid"
        | "overdue"
        | "cancelled"
        | "partially_paid"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "unqualified"
        | "converted"
      legal_document_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "revision_needed"
      legal_document_type:
        | "contract"
        | "nda"
        | "agreement"
        | "policy"
        | "compliance"
      quotation_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      renewal_status:
        | "active"
        | "expiring_soon"
        | "expired"
        | "renewed"
        | "cancelled"
      renewal_type:
        | "contract"
        | "license"
        | "subscription"
        | "certification"
        | "insurance"
        | "domain"
      request_priority: "low" | "medium" | "high" | "urgent"
      request_status:
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      request_type:
        | "leave"
        | "work_from_home"
        | "advance_salary"
        | "new_hardware"
        | "hardware_problem"
        | "other"
      team_type:
        | "sales"
        | "presales"
        | "technical"
        | "managed_services"
        | "management"
        | "hr"
        | "finance"
        | "inside_sales"
        | "marketing"
      ticket_category:
        | "incident"
        | "service_request"
        | "change_request"
        | "problem"
        | "security_alert"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status:
        | "open"
        | "in_progress"
        | "pending_customer"
        | "pending_vendor"
        | "escalated"
        | "resolved"
        | "closed"
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
      app_role: ["admin", "manager", "employee"],
      billing_frequency: ["one_time", "monthly", "quarterly", "annually"],
      closed_won_substage: [
        "odf_created",
        "odf_approved",
        "invoice_raised",
        "payment_received",
      ],
      compliance_status: [
        "not_started",
        "in_progress",
        "compliant",
        "non_compliant",
        "needs_review",
      ],
      deal_stage: [
        "pipeline",
        "upside",
        "strong_upside",
        "commit",
        "closed_won",
        "closed_lost",
      ],
      framework_type: [
        "soc2",
        "iso27001",
        "hipaa",
        "pci_dss",
        "gdpr",
        "nist",
        "other",
      ],
      invoice_status: [
        "draft",
        "sent",
        "paid",
        "overdue",
        "cancelled",
        "partially_paid",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "unqualified",
        "converted",
      ],
      legal_document_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "revision_needed",
      ],
      legal_document_type: [
        "contract",
        "nda",
        "agreement",
        "policy",
        "compliance",
      ],
      quotation_status: ["draft", "sent", "accepted", "rejected", "expired"],
      renewal_status: [
        "active",
        "expiring_soon",
        "expired",
        "renewed",
        "cancelled",
      ],
      renewal_type: [
        "contract",
        "license",
        "subscription",
        "certification",
        "insurance",
        "domain",
      ],
      request_priority: ["low", "medium", "high", "urgent"],
      request_status: [
        "pending",
        "under_review",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      request_type: [
        "leave",
        "work_from_home",
        "advance_salary",
        "new_hardware",
        "hardware_problem",
        "other",
      ],
      team_type: [
        "sales",
        "presales",
        "technical",
        "managed_services",
        "management",
        "hr",
        "finance",
        "inside_sales",
        "marketing",
      ],
      ticket_category: [
        "incident",
        "service_request",
        "change_request",
        "problem",
        "security_alert",
      ],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: [
        "open",
        "in_progress",
        "pending_customer",
        "pending_vendor",
        "escalated",
        "resolved",
        "closed",
      ],
    },
  },
} as const
