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
      accounts_workflow_stage_completions: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_current: boolean | null
          notes: string | null
          stage_id: string
          stage_order: number
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_current?: boolean | null
          notes?: string | null
          stage_id: string
          stage_order: number
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_current?: boolean | null
          notes?: string | null
          stage_id?: string
          stage_order?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_workflow_stage_completions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "accounts_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_workflows: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          current_stage: string
          deal_id: string | null
          description: string | null
          id: string
          initiated_by: string
          metadata: Json | null
          order_request_id: string | null
          parent_workflow_id: string | null
          priority: string | null
          started_at: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          current_stage: string
          deal_id?: string | null
          description?: string | null
          id?: string
          initiated_by: string
          metadata?: Json | null
          order_request_id?: string | null
          parent_workflow_id?: string | null
          priority?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          workflow_type: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          current_stage?: string
          deal_id?: string | null
          description?: string | null
          id?: string
          initiated_by?: string
          metadata?: Json | null
          order_request_id?: string | null
          parent_workflow_id?: string | null
          priority?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_workflows_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_workflows_order_request_id_fkey"
            columns: ["order_request_id"]
            isOneToOne: false
            referencedRelation: "order_processing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_workflows_parent_workflow_id_fkey"
            columns: ["parent_workflow_id"]
            isOneToOne: false
            referencedRelation: "accounts_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_definitions: {
        Row: {
          created_at: string
          department: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          team_type: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          team_type?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          team_type?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alliance_organizations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          organization_type: string | null
          services: string[] | null
          solutions: string[] | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          organization_type?: string | null
          services?: string[] | null
          solutions?: string[] | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          organization_type?: string | null
          services?: string[] | null
          solutions?: string[] | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alliance_organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alliance_users: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          escalation_manager_id: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          role: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          escalation_manager_id?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          escalation_manager_id?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alliance_users_escalation_manager_id_fkey"
            columns: ["escalation_manager_id"]
            isOneToOne: false
            referencedRelation: "alliance_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alliance_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      asset_assignments: {
        Row: {
          asset_id: string
          assigned_at: string
          assigned_by: string
          assigned_to: string
          created_at: string
          id: string
          notes: string | null
          return_condition: string | null
          returned_at: string | null
          tenant_id: string | null
        }
        Insert: {
          asset_id: string
          assigned_at?: string
          assigned_by: string
          assigned_to: string
          created_at?: string
          id?: string
          notes?: string | null
          return_condition?: string | null
          returned_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          asset_id?: string
          assigned_at?: string
          assigned_by?: string
          assigned_to?: string
          created_at?: string
          id?: string
          notes?: string | null
          return_condition?: string | null
          returned_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          created_at: string
          depreciation_rate: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string
          useful_life_years: number | null
        }
        Insert: {
          created_at?: string
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string
          useful_life_years?: number | null
        }
        Update: {
          created_at?: string
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
          useful_life_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance: {
        Row: {
          asset_id: string
          completed_date: string | null
          cost: number | null
          created_at: string
          created_by: string
          description: string
          id: string
          maintenance_type: string
          notes: string | null
          performed_by: string | null
          scheduled_date: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          asset_id: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          maintenance_type: string
          notes?: string | null
          performed_by?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          asset_id?: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          maintenance_type?: string
          notes?: string | null
          performed_by?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_number: string
          assigned_at: string | null
          assigned_to: string | null
          category_id: string | null
          created_at: string
          created_by: string
          current_value: number | null
          description: string | null
          id: string
          location: string | null
          manufacturer: string | null
          model: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          warranty_expiry: string | null
        }
        Insert: {
          asset_number: string
          assigned_at?: string | null
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string
          created_by: string
          current_value?: number | null
          description?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Update: {
          asset_number?: string
          assigned_at?: string | null
          assigned_to?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          current_value?: number | null
          description?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          mood_check_in: string | null
          mood_check_out: string | null
          notes: string | null
          tenant_id: string | null
          user_id: string
          work_hours: number | null
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          mood_check_in?: string | null
          mood_check_out?: string | null
          notes?: string | null
          tenant_id?: string | null
          user_id: string
          work_hours?: number | null
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          mood_check_in?: string | null
          mood_check_out?: string | null
          notes?: string | null
          tenant_id?: string | null
          user_id?: string
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_activities: {
        Row: {
          activity_id: string
          attendance_id: string
          created_at: string
          duration_minutes: number
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          attendance_id: string
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          activity_id?: string
          attendance_id?: string
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_activities_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          attendees: string[] | null
          created_at: string
          description: string | null
          end_time: string | null
          event_type: string
          id: string
          is_public: boolean | null
          location: string | null
          meeting_link: string | null
          owner_id: string
          related_contact_id: string | null
          related_deal_id: string | null
          reminder_minutes: number | null
          start_time: string
          status: string | null
          team_type: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_public?: boolean | null
          location?: string | null
          meeting_link?: string | null
          owner_id: string
          related_contact_id?: string | null
          related_deal_id?: string | null
          reminder_minutes?: number | null
          start_time: string
          status?: string | null
          team_type?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_public?: boolean | null
          location?: string | null
          meeting_link?: string | null
          owner_id?: string
          related_contact_id?: string | null
          related_deal_id?: string | null
          reminder_minutes?: number | null
          start_time?: string
          status?: string | null
          team_type?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["framework_type"]
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_frameworks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          company: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          created_by: string
          department: string | null
          designation: string | null
          email: string | null
          id: string
          location: string | null
          manager_id: string | null
          name: string
          notes: string | null
          phone: string | null
          rate: number | null
          rate_type: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rate?: number | null
          rate_type?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          location?: string | null
          manager_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rate?: number | null
          rate_type?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          activity_type: string
          created_at: string
          deal_id: string
          description: string
          id: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          deal_id: string
          description: string
          id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          deal_id?: string
          description?: string
          id?: string
          tenant_id?: string | null
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
          {
            foreignKeyName: "deal_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_schedules: {
        Row: {
          attendees: string[] | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          demo_type: string | null
          description: string | null
          duration_minutes: number | null
          feedback: string | null
          id: string
          meeting_link: string | null
          next_steps: string | null
          notes: string | null
          presenter_id: string | null
          scheduled_by: string
          scheduled_date: string
          status: Database["public"]["Enums"]["demo_status"]
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          demo_type?: string | null
          description?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          meeting_link?: string | null
          next_steps?: string | null
          notes?: string | null
          presenter_id?: string | null
          scheduled_by: string
          scheduled_date: string
          status?: Database["public"]["Enums"]["demo_status"]
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          demo_type?: string | null
          description?: string | null
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          meeting_link?: string | null
          next_steps?: string | null
          notes?: string | null
          presenter_id?: string | null
          scheduled_by?: string
          scheduled_date?: string
          status?: Database["public"]["Enums"]["demo_status"]
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_schedules_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_schedules_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      distributors: {
        Row: {
          address: string | null
          bank_details: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string
          credit_limit: number | null
          discount_percentage: number | null
          email: string | null
          gst_number: string | null
          id: string
          notes: string | null
          oem_brand_name: string | null
          pan_number: string | null
          payment_terms: string | null
          phone: string | null
          region: string | null
          status: string | null
          tenant_id: string | null
          territory: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          credit_limit?: number | null
          discount_percentage?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          notes?: string | null
          oem_brand_name?: string | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          region?: string | null
          status?: string | null
          tenant_id?: string | null
          territory?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          credit_limit?: number | null
          discount_percentage?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          notes?: string | null
          oem_brand_name?: string | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          region?: string | null
          status?: string | null
          tenant_id?: string | null
          territory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_verified: boolean | null
          tenant_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_verified?: boolean | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_verified?: boolean | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_mood_logs: {
        Row: {
          attendance_id: string | null
          created_at: string
          id: string
          logged_at: string
          mood: string
          mood_type: string | null
          notes: string | null
          session_duration_minutes: number | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          attendance_id?: string | null
          created_at?: string
          id?: string
          logged_at?: string
          mood: string
          mood_type?: string | null
          notes?: string | null
          session_duration_minutes?: number | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          attendance_id?: string | null
          created_at?: string
          id?: string
          logged_at?: string
          mood?: string
          mood_type?: string | null
          notes?: string | null
          session_duration_minutes?: number | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_mood_logs_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_mood_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id?: string
          wfh_date?: string | null
          wfh_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_sales_teams: {
        Row: {
          created_at: string
          id: string
          sales_sub_team: Database["public"]["Enums"]["sales_sub_team"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sales_sub_team: Database["public"]["Enums"]["sales_sub_team"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sales_sub_team?: Database["public"]["Enums"]["sales_sub_team"]
          user_id?: string
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
      exchange_rate_history: {
        Row: {
          created_at: string
          fetched_at: string
          from_currency: string
          id: string
          rate: number
          rate_date: string
          to_currency: string
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          from_currency: string
          id?: string
          rate: number
          rate_date: string
          to_currency: string
        }
        Update: {
          created_at?: string
          fetched_at?: string
          from_currency?: string
          id?: string
          rate?: number
          rate_date?: string
          to_currency?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          expense_type: string
          gl_code: string | null
          id: string
          is_active: boolean | null
          max_amount: number | null
          name: string
          requires_receipt: boolean | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expense_type?: string
          gl_code?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          name: string
          requires_receipt?: boolean | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expense_type?: string
          gl_code?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          name?: string
          requires_receipt?: boolean | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_items: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency: string | null
          description: string
          expense_date: string
          expense_report_id: string
          id: string
          is_billable: boolean | null
          merchant_name: string | null
          notes: string | null
          project_id: string | null
          receipt_file_name: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string | null
          description: string
          expense_date: string
          expense_report_id: string
          id?: string
          is_billable?: boolean | null
          merchant_name?: string | null
          notes?: string | null
          project_id?: string | null
          receipt_file_name?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          expense_date?: string
          expense_report_id?: string
          id?: string
          is_billable?: boolean | null
          merchant_name?: string | null
          notes?: string | null
          project_id?: string | null
          receipt_file_name?: string | null
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_items_expense_report_id_fkey"
            columns: ["expense_report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string | null
          description: string | null
          finance_approved_at: string | null
          finance_approved_by: string | null
          id: string
          paid_at: string | null
          rejection_reason: string | null
          report_number: string
          status: string
          submitted_at: string | null
          tenant_id: string | null
          title: string
          total_amount: number
          travel_request_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          paid_at?: string | null
          rejection_reason?: string | null
          report_number: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string | null
          title: string
          total_amount?: number
          travel_request_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          paid_at?: string | null
          rejection_reason?: string | null
          report_number?: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string | null
          title?: string
          total_amount?: number
          travel_request_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_workflows: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          current_stage: string
          description: string | null
          id: string
          initiated_by: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["request_priority"]
          source_request_id: string | null
          source_type: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["hr_workflow_status"]
          target_user_id: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          workflow_type: Database["public"]["Enums"]["hr_workflow_type"]
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          current_stage: string
          description?: string | null
          id?: string
          initiated_by: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["request_priority"]
          source_request_id?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["hr_workflow_status"]
          target_user_id?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          workflow_type: Database["public"]["Enums"]["hr_workflow_type"]
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          current_stage?: string
          description?: string | null
          id?: string
          initiated_by?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["request_priority"]
          source_request_id?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["hr_workflow_status"]
          target_user_id?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          workflow_type?: Database["public"]["Enums"]["hr_workflow_type"]
        }
        Relationships: [
          {
            foreignKeyName: "hr_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "inside_sales_prospects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          last_restocked_at: string | null
          location: string | null
          name: string
          quantity_on_hand: number
          reorder_level: number | null
          reorder_quantity: number | null
          sku: string
          supplier: string | null
          tenant_id: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restocked_at?: string | null
          location?: string | null
          name: string
          quantity_on_hand?: number
          reorder_level?: number | null
          reorder_quantity?: number | null
          sku: string
          supplier?: string | null
          tenant_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restocked_at?: string | null
          location?: string | null
          name?: string
          quantity_on_hand?: number
          reorder_level?: number | null
          reorder_quantity?: number | null
          sku?: string
          supplier?: string | null
          tenant_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          item_id: string
          notes: string | null
          performed_by: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          performed_by: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          performed_by?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["legal_document_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_definitions: {
        Row: {
          category: string | null
          created_at: string
          default_enabled: boolean | null
          description: string | null
          icon: string | null
          id: string
          is_core: boolean | null
          key: string
          name: string
          settings_schema: Json | null
          sort_order: number | null
          tier_required: Database["public"]["Enums"]["tenant_tier"] | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_enabled?: boolean | null
          description?: string | null
          icon?: string | null
          id?: string
          is_core?: boolean | null
          key: string
          name: string
          settings_schema?: Json | null
          sort_order?: number | null
          tier_required?: Database["public"]["Enums"]["tenant_tier"] | null
        }
        Update: {
          category?: string | null
          created_at?: string
          default_enabled?: boolean | null
          description?: string | null
          icon?: string | null
          id?: string
          is_core?: boolean | null
          key?: string
          name?: string
          settings_schema?: Json | null
          sort_order?: number | null
          tier_required?: Database["public"]["Enums"]["tenant_tier"] | null
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      oem_technologies: {
        Row: {
          created_at: string
          created_by: string
          id: string
          oem_id: string
          technology_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          oem_id: string
          technology_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          oem_id?: string
          technology_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oem_technologies_oem_id_fkey"
            columns: ["oem_id"]
            isOneToOne: false
            referencedRelation: "offerings_oems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oem_technologies_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "offerings_technologies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oem_technologies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings_managed_security: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          service_type: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          service_type?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          service_type?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offerings_managed_security_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings_oems: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          partnership_level: string | null
          status: string | null
          tenant_id: string | null
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          partnership_level?: string | null
          status?: string | null
          tenant_id?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          partnership_level?: string | null
          status?: string | null
          tenant_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offerings_oems_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings_offensive_security: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          service_type: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          service_type?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          service_type?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offerings_offensive_security_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings_problem_areas: {
        Row: {
          area_type: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          area_type?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          area_type?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offerings_problem_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings_professional_services: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          service_type: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          service_type?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          service_type?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offerings_professional_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings_solutions: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          oem_id: string | null
          status: string | null
          technology_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          oem_id?: string | null
          status?: string | null
          technology_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          oem_id?: string | null
          status?: string | null
          technology_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offerings_solutions_oem_id_fkey"
            columns: ["oem_id"]
            isOneToOne: false
            referencedRelation: "offerings_oems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerings_solutions_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "offerings_technologies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerings_solutions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings_technologies: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: string | null
          tenant_id: string | null
          vendor: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string | null
          tenant_id?: string | null
          vendor?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          tenant_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offerings_technologies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_requests: {
        Row: {
          budget_approved: boolean | null
          created_at: string
          department: string | null
          employment_type: string | null
          expected_salary: number | null
          expected_start_date: string | null
          headcount_approved: boolean | null
          id: string
          job_description: string | null
          job_title: string
          justification: string | null
          location: string | null
          reports_to: string | null
          requesting_manager_id: string
          requirements: string | null
          salary_range_max: number | null
          salary_range_min: number | null
          updated_at: string
          urgency: string | null
          workflow_id: string | null
        }
        Insert: {
          budget_approved?: boolean | null
          created_at?: string
          department?: string | null
          employment_type?: string | null
          expected_salary?: number | null
          expected_start_date?: string | null
          headcount_approved?: boolean | null
          id?: string
          job_description?: string | null
          job_title: string
          justification?: string | null
          location?: string | null
          reports_to?: string | null
          requesting_manager_id: string
          requirements?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          updated_at?: string
          urgency?: string | null
          workflow_id?: string | null
        }
        Update: {
          budget_approved?: boolean | null
          created_at?: string
          department?: string | null
          employment_type?: string | null
          expected_salary?: number | null
          expected_start_date?: string | null
          headcount_approved?: boolean | null
          id?: string
          job_description?: string | null
          job_title?: string
          justification?: string | null
          location?: string | null
          reports_to?: string | null
          requesting_manager_id?: string
          requirements?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          updated_at?: string
          urgency?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "hr_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      order_processing_requests: {
        Row: {
          accounts_po_date: string | null
          accounts_po_number: string | null
          accounts_po_shared_at: string | null
          accounts_po_shared_to: string | null
          accounts_po_url: string | null
          buying_cost: number | null
          contact_id: string | null
          created_at: string
          created_by: string
          current_stage: string
          customer_commitments: string | null
          customer_payment_terms: string | null
          customer_po_date: string | null
          customer_po_number: string | null
          customer_po_url: string | null
          deal_id: string | null
          distri_oem_payment_terms: string | null
          distri_oem_quote_number: string | null
          distri_oem_quote_url: string | null
          distributor_oem_name: string | null
          has_msa: boolean | null
          has_nda: boolean | null
          has_sla: boolean | null
          has_sow: boolean | null
          id: string
          license_delivery_date: string | null
          license_delivery_notes: string | null
          margin_amount: number | null
          margin_percentage: number | null
          order_committee_approved: boolean | null
          order_committee_approved_at: string | null
          order_committee_approved_by: string | null
          order_committee_notes: string | null
          other_documents: Json | null
          other_prerequisites: string | null
          prerequisite_documents: Json | null
          referral_fees: number | null
          selling_cost: number | null
          service_delivery_date: string | null
          service_delivery_notes: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          accounts_po_date?: string | null
          accounts_po_number?: string | null
          accounts_po_shared_at?: string | null
          accounts_po_shared_to?: string | null
          accounts_po_url?: string | null
          buying_cost?: number | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          current_stage?: string
          customer_commitments?: string | null
          customer_payment_terms?: string | null
          customer_po_date?: string | null
          customer_po_number?: string | null
          customer_po_url?: string | null
          deal_id?: string | null
          distri_oem_payment_terms?: string | null
          distri_oem_quote_number?: string | null
          distri_oem_quote_url?: string | null
          distributor_oem_name?: string | null
          has_msa?: boolean | null
          has_nda?: boolean | null
          has_sla?: boolean | null
          has_sow?: boolean | null
          id?: string
          license_delivery_date?: string | null
          license_delivery_notes?: string | null
          margin_amount?: number | null
          margin_percentage?: number | null
          order_committee_approved?: boolean | null
          order_committee_approved_at?: string | null
          order_committee_approved_by?: string | null
          order_committee_notes?: string | null
          other_documents?: Json | null
          other_prerequisites?: string | null
          prerequisite_documents?: Json | null
          referral_fees?: number | null
          selling_cost?: number | null
          service_delivery_date?: string | null
          service_delivery_notes?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          accounts_po_date?: string | null
          accounts_po_number?: string | null
          accounts_po_shared_at?: string | null
          accounts_po_shared_to?: string | null
          accounts_po_url?: string | null
          buying_cost?: number | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          current_stage?: string
          customer_commitments?: string | null
          customer_payment_terms?: string | null
          customer_po_date?: string | null
          customer_po_number?: string | null
          customer_po_url?: string | null
          deal_id?: string | null
          distri_oem_payment_terms?: string | null
          distri_oem_quote_number?: string | null
          distri_oem_quote_url?: string | null
          distributor_oem_name?: string | null
          has_msa?: boolean | null
          has_nda?: boolean | null
          has_sla?: boolean | null
          has_sow?: boolean | null
          id?: string
          license_delivery_date?: string | null
          license_delivery_notes?: string | null
          margin_amount?: number | null
          margin_percentage?: number | null
          order_committee_approved?: boolean | null
          order_committee_approved_at?: string | null
          order_committee_approved_by?: string | null
          order_committee_notes?: string | null
          other_documents?: Json | null
          other_prerequisites?: string | null
          prerequisite_documents?: Json | null
          referral_fees?: number | null
          selling_cost?: number | null
          service_delivery_date?: string | null
          service_delivery_notes?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_processing_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_processing_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_processing_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_processing_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_meetings: {
        Row: {
          attendees: string[] | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          meeting_link: string | null
          meeting_type: string | null
          notes: string | null
          organization_id: string
          scheduled_at: string
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          organization_id: string
          scheduled_at: string
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees?: string[] | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string | null
          notes?: string | null
          organization_id?: string
          scheduled_at?: string
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_meetings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          note_type: string | null
          organization_id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          note_type?: string | null
          organization_id: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          note_type?: string | null
          organization_id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_reminders: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean | null
          is_recurring: boolean | null
          organization_id: string
          recurrence_pattern: string | null
          remind_at: string
          reminder_type: string
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          organization_id: string
          recurrence_pattern?: string | null
          remind_at: string
          reminder_type: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          organization_id?: string
          recurrence_pattern?: string | null
          remind_at?: string
          reminder_type?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "alliance_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          account_manager_email: string | null
          account_manager_id: string | null
          account_manager_name: string | null
          account_manager_phone: string | null
          address: string | null
          alert_managers_on_early_departure: boolean | null
          alert_managers_on_late: boolean | null
          alternate_currency: string | null
          annual_revenue: string | null
          cities: string[] | null
          cloud_providers: string[] | null
          company_type: string | null
          compliance_frameworks: string[] | null
          consecutive_late_threshold: number | null
          contract_end_date: string | null
          contract_start_date: string | null
          countries: string[] | null
          created_at: string
          currency: string | null
          customer_since: string | null
          datacenter_type: string | null
          description: string | null
          dkim_status: string | null
          dmarc_status: string | null
          early_departure_alert_enabled: boolean | null
          early_departure_threshold_minutes: number | null
          email: string | null
          email_security_last_checked: string | null
          enrichment_data: Json | null
          existing_security_tools: Json | null
          facebook_url: string | null
          founded_year: number | null
          hq_city: string | null
          hq_country: string | null
          hq_state: string | null
          id: string
          industry: string | null
          last_enriched_at: string | null
          last_security_audit: string | null
          late_arrival_alert_enabled: boolean | null
          late_threshold_minutes: number | null
          linkedin_url: string | null
          logo_url: string | null
          name: string
          next_security_audit: string | null
          num_branches: number | null
          num_endpoints: number | null
          num_servers: number | null
          num_systems: number | null
          num_users: number | null
          on_prem_locations: string[] | null
          parent_company: string | null
          phone: string | null
          postal_code: string | null
          revenue_currency: string | null
          security_certifications: string[] | null
          security_controls: string[] | null
          senior_management: Json | null
          spf_status: string | null
          stock_exchange: string | null
          stock_symbol: string | null
          subsidiaries: string[] | null
          technologies_used: string[] | null
          tenant_id: string | null
          total_employees: number | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          account_manager_email?: string | null
          account_manager_id?: string | null
          account_manager_name?: string | null
          account_manager_phone?: string | null
          address?: string | null
          alert_managers_on_early_departure?: boolean | null
          alert_managers_on_late?: boolean | null
          alternate_currency?: string | null
          annual_revenue?: string | null
          cities?: string[] | null
          cloud_providers?: string[] | null
          company_type?: string | null
          compliance_frameworks?: string[] | null
          consecutive_late_threshold?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          countries?: string[] | null
          created_at?: string
          currency?: string | null
          customer_since?: string | null
          datacenter_type?: string | null
          description?: string | null
          dkim_status?: string | null
          dmarc_status?: string | null
          early_departure_alert_enabled?: boolean | null
          early_departure_threshold_minutes?: number | null
          email?: string | null
          email_security_last_checked?: string | null
          enrichment_data?: Json | null
          existing_security_tools?: Json | null
          facebook_url?: string | null
          founded_year?: number | null
          hq_city?: string | null
          hq_country?: string | null
          hq_state?: string | null
          id?: string
          industry?: string | null
          last_enriched_at?: string | null
          last_security_audit?: string | null
          late_arrival_alert_enabled?: boolean | null
          late_threshold_minutes?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          next_security_audit?: string | null
          num_branches?: number | null
          num_endpoints?: number | null
          num_servers?: number | null
          num_systems?: number | null
          num_users?: number | null
          on_prem_locations?: string[] | null
          parent_company?: string | null
          phone?: string | null
          postal_code?: string | null
          revenue_currency?: string | null
          security_certifications?: string[] | null
          security_controls?: string[] | null
          senior_management?: Json | null
          spf_status?: string | null
          stock_exchange?: string | null
          stock_symbol?: string | null
          subsidiaries?: string[] | null
          technologies_used?: string[] | null
          tenant_id?: string | null
          total_employees?: number | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          account_manager_email?: string | null
          account_manager_id?: string | null
          account_manager_name?: string | null
          account_manager_phone?: string | null
          address?: string | null
          alert_managers_on_early_departure?: boolean | null
          alert_managers_on_late?: boolean | null
          alternate_currency?: string | null
          annual_revenue?: string | null
          cities?: string[] | null
          cloud_providers?: string[] | null
          company_type?: string | null
          compliance_frameworks?: string[] | null
          consecutive_late_threshold?: number | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          countries?: string[] | null
          created_at?: string
          currency?: string | null
          customer_since?: string | null
          datacenter_type?: string | null
          description?: string | null
          dkim_status?: string | null
          dmarc_status?: string | null
          early_departure_alert_enabled?: boolean | null
          early_departure_threshold_minutes?: number | null
          email?: string | null
          email_security_last_checked?: string | null
          enrichment_data?: Json | null
          existing_security_tools?: Json | null
          facebook_url?: string | null
          founded_year?: number | null
          hq_city?: string | null
          hq_country?: string | null
          hq_state?: string | null
          id?: string
          industry?: string | null
          last_enriched_at?: string | null
          last_security_audit?: string | null
          late_arrival_alert_enabled?: boolean | null
          late_threshold_minutes?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          next_security_audit?: string | null
          num_branches?: number | null
          num_endpoints?: number | null
          num_servers?: number | null
          num_systems?: number | null
          num_users?: number | null
          on_prem_locations?: string[] | null
          parent_company?: string | null
          phone?: string | null
          postal_code?: string | null
          revenue_currency?: string | null
          security_certifications?: string[] | null
          security_controls?: string[] | null
          senior_management?: Json | null
          spf_status?: string | null
          stock_exchange?: string | null
          stock_symbol?: string | null
          subsidiaries?: string[] | null
          technologies_used?: string[] | null
          tenant_id?: string | null
          total_employees?: number | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: string | null
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      poc_requests: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          end_date: string | null
          id: string
          infrastructure_notes: string | null
          outcome: string | null
          outcome_notes: string | null
          priority: string | null
          requested_by: string
          start_date: string | null
          status: Database["public"]["Enums"]["poc_status"]
          success_criteria: string | null
          technical_requirements: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          infrastructure_notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          priority?: string | null
          requested_by: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["poc_status"]
          success_criteria?: string | null
          technical_requirements?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          infrastructure_notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          priority?: string | null
          requested_by?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["poc_status"]
          success_criteria?: string | null
          technical_requirements?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poc_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poc_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poc_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      presales_opportunities: {
        Row: {
          completed_at: string | null
          created_at: string
          deal_id: string | null
          id: string
          involvement_type: string
          notes: string | null
          outcome: string | null
          presales_member_id: string
          started_at: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          involvement_type: string
          notes?: string | null
          outcome?: string | null
          presales_member_id: string
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          involvement_type?: string
          notes?: string | null
          outcome?: string | null
          presales_member_id?: string
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presales_opportunities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presales_opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          anniversary_date: string | null
          avatar_config: Json | null
          avatar_style: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          current_address: string | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          emergency_contact_relationship: string | null
          employee_code: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name: string | null
          hire_date: string | null
          hobbies: string[] | null
          id: string
          is_super_admin: boolean | null
          job_title: string | null
          location: string | null
          manager_id: string | null
          postal_code: string | null
          sales_sub_team: Database["public"]["Enums"]["sales_sub_team"] | null
          state: string | null
          tenant_id: string | null
          updated_at: string
          user_category: Database["public"]["Enums"]["user_category"] | null
          user_id: string
        }
        Insert: {
          address?: string | null
          anniversary_date?: string | null
          avatar_config?: Json | null
          avatar_style?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_address?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          emergency_contact_relationship?: string | null
          employee_code?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name?: string | null
          hire_date?: string | null
          hobbies?: string[] | null
          id?: string
          is_super_admin?: boolean | null
          job_title?: string | null
          location?: string | null
          manager_id?: string | null
          postal_code?: string | null
          sales_sub_team?: Database["public"]["Enums"]["sales_sub_team"] | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_category?: Database["public"]["Enums"]["user_category"] | null
          user_id: string
        }
        Update: {
          address?: string | null
          anniversary_date?: string | null
          avatar_config?: Json | null
          avatar_style?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_address?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          emergency_contact_relationship?: string | null
          employee_code?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name?: string | null
          hire_date?: string | null
          hobbies?: string[] | null
          id?: string
          is_super_admin?: boolean | null
          job_title?: string | null
          location?: string | null
          manager_id?: string | null
          postal_code?: string | null
          sales_sub_team?: Database["public"]["Enums"]["sales_sub_team"] | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_category?: Database["public"]["Enums"]["user_category"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          allocation_percentage: number | null
          created_at: string
          id: string
          joined_at: string
          left_at: string | null
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          allocation_percentage?: number | null
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          allocation_percentage?: number | null
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          name: string
          project_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          name: string
          project_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          name?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          parent_task_id: string | null
          priority: string | null
          project_id: string
          start_date: string | null
          status: string
          tags: string[] | null
          task_number: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: string | null
          project_id: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          task_number: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: string | null
          project_id?: string
          start_date?: string | null
          status?: string
          tags?: string[] | null
          task_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_time_entries: {
        Row: {
          created_at: string
          date: string
          description: string | null
          hours: number
          id: string
          is_billable: boolean | null
          project_id: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          hours: number
          id?: string
          is_billable?: boolean | null
          project_id: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          hours?: number
          id?: string
          is_billable?: boolean | null
          project_id?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          budget: number | null
          client_name: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          priority: string | null
          progress: number | null
          project_manager_id: string | null
          project_number: string
          project_type: string | null
          spent_amount: number | null
          start_date: string | null
          status: string
          tags: string[] | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          budget?: number | null
          client_name?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          priority?: string | null
          progress?: number | null
          project_manager_id?: string | null
          project_number: string
          project_type?: string | null
          spent_amount?: number | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          budget?: number | null
          client_name?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          priority?: string | null
          progress?: number | null
          project_manager_id?: string | null
          project_number?: string
          project_type?: string | null
          spent_amount?: number | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "renewals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      resignation_requests: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          last_working_date: string | null
          manager_action: string | null
          manager_notes: string | null
          notice_period_days: number | null
          reason: string | null
          retention_attempted: boolean | null
          retention_outcome: string | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          last_working_date?: string | null
          manager_action?: string | null
          manager_notes?: string | null
          notice_period_days?: number | null
          reason?: string | null
          retention_attempted?: boolean | null
          retention_outcome?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          last_working_date?: string | null
          manager_action?: string | null
          manager_notes?: string | null
          notice_period_days?: number | null
          reason?: string | null
          retention_attempted?: boolean | null
          retention_outcome?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resignation_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "hr_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_responses: {
        Row: {
          assigned_to: string
          contact_id: string | null
          created_at: string
          deal_id: string | null
          due_date: string | null
          id: string
          notes: string | null
          response_document_url: string | null
          rfp_number: string | null
          sections_completed: number | null
          status: string | null
          submitted_date: string | null
          tenant_id: string | null
          title: string
          total_sections: number | null
          updated_at: string
        }
        Insert: {
          assigned_to: string
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          response_document_url?: string | null
          rfp_number?: string | null
          sections_completed?: number | null
          status?: string | null
          submitted_date?: string | null
          tenant_id?: string | null
          title: string
          total_sections?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          response_document_url?: string | null
          rfp_number?: string | null
          sections_completed?: number | null
          status?: string | null
          submitted_date?: string | null
          tenant_id?: string | null
          title?: string
          total_sections?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfp_responses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_responses_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfp_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_team_members: {
        Row: {
          id: string
          is_leader: boolean | null
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_leader?: boolean | null
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_leader?: boolean | null
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "sales_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          leader_id: string | null
          name: string
          team_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
          team_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          team_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      solution_oems: {
        Row: {
          created_at: string
          created_by: string
          id: string
          oem_id: string
          solution_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          oem_id: string
          solution_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          oem_id?: string
          solution_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_oems_oem_id_fkey"
            columns: ["oem_id"]
            isOneToOne: false
            referencedRelation: "offerings_oems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_oems_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "offerings_solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_oems_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_technologies: {
        Row: {
          created_at: string
          created_by: string
          id: string
          solution_id: string
          technology_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          solution_id: string
          technology_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          solution_id?: string
          technology_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_technologies_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "offerings_solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_technologies_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "offerings_technologies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_technologies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sops_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_reminders: {
        Row: {
          created_at: string
          created_by: string
          due_date: string
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          priority: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          reminder_type: string
          target_team: string | null
          target_user_id: string
          tenant_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          due_date: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_type: string
          target_team?: string | null
          target_user_id: string
          tenant_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          due_date?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          priority?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_type?: string
          target_team?: string | null
          target_user_id?: string
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_assessments: {
        Row: {
          assessed_by: string
          budget_range: string | null
          contact_id: string | null
          created_at: string
          current_environment: string | null
          deal_id: string | null
          id: string
          integration_points: string | null
          recommendations: string | null
          requirements: string | null
          risks: string | null
          scalability_needs: string | null
          score: number | null
          security_requirements: string | null
          status: string | null
          tenant_id: string | null
          timeline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assessed_by: string
          budget_range?: string | null
          contact_id?: string | null
          created_at?: string
          current_environment?: string | null
          deal_id?: string | null
          id?: string
          integration_points?: string | null
          recommendations?: string | null
          requirements?: string | null
          risks?: string | null
          scalability_needs?: string | null
          score?: number | null
          security_requirements?: string | null
          status?: string | null
          tenant_id?: string | null
          timeline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assessed_by?: string
          budget_range?: string | null
          contact_id?: string | null
          created_at?: string
          current_environment?: string | null
          deal_id?: string | null
          id?: string
          integration_points?: string | null
          recommendations?: string | null
          requirements?: string | null
          risks?: string | null
          scalability_needs?: string | null
          score?: number | null
          security_requirements?: string | null
          status?: string | null
          tenant_id?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_assessments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_configs: {
        Row: {
          ai_model: string | null
          created_at: string
          credits_reset_at: string | null
          custom_instructions: Json | null
          id: string
          knowledge_base_enabled: boolean | null
          max_tokens: number | null
          monthly_ai_credits: number | null
          system_prompt: string | null
          temperature: number | null
          tenant_id: string
          updated_at: string
          used_ai_credits: number | null
        }
        Insert: {
          ai_model?: string | null
          created_at?: string
          credits_reset_at?: string | null
          custom_instructions?: Json | null
          id?: string
          knowledge_base_enabled?: boolean | null
          max_tokens?: number | null
          monthly_ai_credits?: number | null
          system_prompt?: string | null
          temperature?: number | null
          tenant_id: string
          updated_at?: string
          used_ai_credits?: number | null
        }
        Update: {
          ai_model?: string | null
          created_at?: string
          credits_reset_at?: string | null
          custom_instructions?: Json | null
          id?: string
          knowledge_base_enabled?: boolean | null
          max_tokens?: number | null
          monthly_ai_credits?: number | null
          system_prompt?: string | null
          temperature?: number | null
          tenant_id?: string
          updated_at?: string
          used_ai_credits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_primary_owner: boolean | null
          joined_at: string | null
          role: string
          status: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_primary_owner?: boolean | null
          joined_at?: string | null
          role?: string
          status?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_primary_owner?: boolean | null
          joined_at?: string | null
          role?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          created_at: string
          disabled_at: string | null
          enabled_at: string | null
          id: string
          is_enabled: boolean
          module_key: string
          settings: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          module_key: string
          settings?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          module_key?: string
          settings?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage: {
        Row: {
          active_users: number | null
          ai_tokens_used: number | null
          api_calls: number | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          storage_used_bytes: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active_users?: number | null
          ai_tokens_used?: number | null
          api_calls?: number | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          storage_used_bytes?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active_users?: number | null
          ai_tokens_used?: number | null
          api_calls?: number | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          storage_used_bytes?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          billing_email: string | null
          branding: Json | null
          created_at: string
          data_region: Database["public"]["Enums"]["data_region"]
          domain: string | null
          id: string
          logo_url: string | null
          max_storage_gb: number | null
          max_users: number | null
          name: string
          settings: Json | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          suspended_at: string | null
          suspended_reason: string | null
          tier: Database["public"]["Enums"]["tenant_tier"]
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          branding?: Json | null
          created_at?: string
          data_region?: Database["public"]["Enums"]["data_region"]
          domain?: string | null
          id?: string
          logo_url?: string | null
          max_storage_gb?: number | null
          max_users?: number | null
          name: string
          settings?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          suspended_at?: string | null
          suspended_reason?: string | null
          tier?: Database["public"]["Enums"]["tenant_tier"]
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          branding?: Json | null
          created_at?: string
          data_region?: Database["public"]["Enums"]["data_region"]
          domain?: string | null
          id?: string
          logo_url?: string | null
          max_storage_gb?: number | null
          max_users?: number | null
          name?: string
          settings?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          suspended_at?: string | null
          suspended_reason?: string | null
          tier?: Database["public"]["Enums"]["tenant_tier"]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
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
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_registrations: {
        Row: {
          attended_at: string | null
          feedback: string | null
          id: string
          rating: number | null
          registered_at: string | null
          status: string | null
          training_id: string
          user_id: string
        }
        Insert: {
          attended_at?: string | null
          feedback?: string | null
          id?: string
          rating?: number | null
          registered_at?: string | null
          status?: string | null
          training_id: string
          user_id: string
        }
        Update: {
          attended_at?: string | null
          feedback?: string | null
          id?: string
          rating?: number | null
          registered_at?: string | null
          status?: string | null
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_registrations_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          materials_url: string | null
          max_attendees: number | null
          meeting_link: string | null
          scheduled_date: string
          status: string | null
          target_team: string | null
          tenant_id: string | null
          title: string
          trainer_id: string | null
          training_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          materials_url?: string | null
          max_attendees?: number | null
          meeting_link?: string | null
          scheduled_date: string
          status?: string | null
          target_team?: string | null
          tenant_id?: string | null
          title: string
          trainer_id?: string | null
          training_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          materials_url?: string | null
          max_attendees?: number | null
          meeting_link?: string | null
          scheduled_date?: string
          status?: string | null
          target_team?: string | null
          tenant_id?: string | null
          title?: string
          trainer_id?: string | null
          training_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_bookings: {
        Row: {
          amount: number
          arrival_datetime: string | null
          booking_details: Json | null
          booking_reference: string | null
          booking_type: string
          created_at: string
          currency: string | null
          departure_datetime: string | null
          from_location: string | null
          id: string
          status: string | null
          to_location: string | null
          travel_request_id: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number
          arrival_datetime?: string | null
          booking_details?: Json | null
          booking_reference?: string | null
          booking_type: string
          created_at?: string
          currency?: string | null
          departure_datetime?: string | null
          from_location?: string | null
          id?: string
          status?: string | null
          to_location?: string | null
          travel_request_id: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          arrival_datetime?: string | null
          booking_details?: Json | null
          booking_reference?: string | null
          booking_type?: string
          created_at?: string
          currency?: string | null
          departure_datetime?: string | null
          from_location?: string | null
          id?: string
          status?: string | null
          to_location?: string | null
          travel_request_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_bookings_travel_request_id_fkey"
            columns: ["travel_request_id"]
            isOneToOne: false
            referencedRelation: "travel_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_requests: {
        Row: {
          additional_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string | null
          deal_id: string | null
          departure_city: string
          departure_date: string
          destination_city: string
          estimated_cost: number | null
          flight_preference: string | null
          hotel_preference: string | null
          id: string
          project_id: string | null
          purpose: string
          rejection_reason: string | null
          request_number: string
          requires_cab: boolean | null
          requires_flight: boolean | null
          requires_hotel: boolean | null
          return_date: string
          status: string
          submitted_at: string | null
          tenant_id: string | null
          title: string
          travel_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          deal_id?: string | null
          departure_city: string
          departure_date: string
          destination_city: string
          estimated_cost?: number | null
          flight_preference?: string | null
          hotel_preference?: string | null
          id?: string
          project_id?: string | null
          purpose: string
          rejection_reason?: string | null
          request_number: string
          requires_cab?: boolean | null
          requires_flight?: boolean | null
          requires_hotel?: boolean | null
          return_date: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string | null
          title: string
          travel_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          deal_id?: string | null
          departure_city?: string
          departure_date?: string
          destination_city?: string
          estimated_cost?: number | null
          flight_preference?: string | null
          hotel_preference?: string | null
          id?: string
          project_id?: string | null
          purpose?: string
          rejection_reason?: string | null
          request_number?: string
          requires_cab?: boolean | null
          requires_flight?: boolean | null
          requires_hotel?: boolean | null
          return_date?: string
          status?: string
          submitted_at?: string | null
          tenant_id?: string | null
          title?: string
          travel_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_console_access: {
        Row: {
          additional_modules: string[] | null
          created_at: string
          id: string
          portal_modes: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_modules?: string[] | null
          created_at?: string
          id?: string
          portal_modes?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_modules?: string[] | null
          created_at?: string
          id?: string
          portal_modes?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      vendors: {
        Row: {
          address: string | null
          bank_details: string | null
          category: string | null
          city: string | null
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string
          email: string | null
          gst_number: string | null
          id: string
          notes: string | null
          pan_number: string | null
          payment_terms: string | null
          phone: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          category?: string | null
          city?: string | null
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          gst_number?: string | null
          id?: string
          notes?: string | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          category?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          notes?: string | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_candidates: {
        Row: {
          candidate_name: string
          created_at: string
          current_company: string | null
          current_designation: string | null
          email: string | null
          expected_salary: number | null
          experience_years: number | null
          id: string
          notes: string | null
          notice_period_days: number | null
          onboarding_request_id: string | null
          phone: string | null
          rejection_reason: string | null
          resume_url: string | null
          selected: boolean | null
          skills: string[] | null
          status: string | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          candidate_name: string
          created_at?: string
          current_company?: string | null
          current_designation?: string | null
          email?: string | null
          expected_salary?: number | null
          experience_years?: number | null
          id?: string
          notes?: string | null
          notice_period_days?: number | null
          onboarding_request_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          resume_url?: string | null
          selected?: boolean | null
          skills?: string[] | null
          status?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          candidate_name?: string
          created_at?: string
          current_company?: string | null
          current_designation?: string | null
          email?: string | null
          expected_salary?: number | null
          experience_years?: number | null
          id?: string
          notes?: string | null
          notice_period_days?: number | null
          onboarding_request_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          resume_url?: string | null
          selected?: boolean | null
          skills?: string[] | null
          status?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_candidates_onboarding_request_id_fkey"
            columns: ["onboarding_request_id"]
            isOneToOne: false
            referencedRelation: "onboarding_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_candidates_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "hr_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_internal: boolean | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          user_id: string
          workflow_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_comments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "hr_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_interviews: {
        Row: {
          candidate_id: string | null
          completed_at: string | null
          created_at: string
          feedback: string | null
          id: string
          interview_level: number | null
          interview_type: string
          interviewer_id: string
          rating: number | null
          recommendation: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          interview_level?: number | null
          interview_type: string
          interviewer_id: string
          rating?: number | null
          recommendation?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          interview_level?: number | null
          interview_type?: string
          interviewer_id?: string
          rating?: number | null
          recommendation?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "workflow_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_interviews_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "hr_workflows"
            referencedColumns: ["id"]
          },
        ]
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
      workflow_offers: {
        Row: {
          accepted_at: string | null
          benefits: string | null
          candidate_id: string | null
          created_at: string
          department: string | null
          id: string
          job_title: string
          joining_date: string | null
          location: string | null
          offer_letter_url: string | null
          offer_salary: number
          rejected_at: string | null
          rejection_reason: string | null
          sent_at: string | null
          status: string | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          benefits?: string | null
          candidate_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          job_title: string
          joining_date?: string | null
          location?: string | null
          offer_letter_url?: string | null
          offer_salary: number
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          benefits?: string | null
          candidate_id?: string | null
          created_at?: string
          department?: string | null
          id?: string
          job_title?: string
          joining_date?: string | null
          location?: string | null
          offer_letter_url?: string | null
          offer_salary?: number
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_offers_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "workflow_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_offers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "hr_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      workflow_stage_completions: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_current: boolean | null
          notes: string | null
          stage_id: string
          stage_order: number
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_current?: boolean | null
          notes?: string | null
          stage_id: string
          stage_order: number
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_current?: boolean | null
          notes?: string | null
          stage_id?: string
          stage_order?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stage_completions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "hr_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stage_history: {
        Row: {
          changed_by: string
          created_at: string
          from_stage: string | null
          id: string
          notes: string | null
          to_stage: string
          workflow_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage: string
          workflow_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stage_history_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "hr_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          anniversary_date: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          department: string | null
          email: string | null
          employee_code: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name: string | null
          hire_date: string | null
          id: string | null
          is_super_admin: boolean | null
          job_title: string | null
          location: string | null
          manager_id: string | null
          sales_sub_team: Database["public"]["Enums"]["sales_sub_team"] | null
          tenant_id: string | null
          updated_at: string | null
          user_category: Database["public"]["Enums"]["user_category"] | null
          user_id: string | null
        }
        Insert: {
          anniversary_date?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          is_super_admin?: never
          job_title?: string | null
          location?: string | null
          manager_id?: string | null
          sales_sub_team?: Database["public"]["Enums"]["sales_sub_team"] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_category?: Database["public"]["Enums"]["user_category"] | null
          user_id?: string | null
        }
        Update: {
          anniversary_date?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          is_super_admin?: never
          job_title?: string | null
          location?: string | null
          manager_id?: string | null
          sales_sub_team?: Database["public"]["Enums"]["sales_sub_team"] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_category?: Database["public"]["Enums"]["user_category"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_sales_record: {
        Args: { record_creator_id: string }
        Returns: boolean
      }
      current_user_is_super_admin: { Args: never; Returns: boolean }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
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
      is_customer: { Args: { _user_id: string }; Returns: boolean }
      is_employee_user: { Args: { _user_id: string }; Returns: boolean }
      is_management: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      promote_to_admin: { Args: { _user_email: string }; Returns: undefined }
      should_hide_user_from_admins: {
        Args: { _user_id: string }
        Returns: boolean
      }
      tenant_has_module: {
        Args: { _module_key: string; _tenant_id: string }
        Returns: boolean
      }
      user_has_tenant_access: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
      billing_frequency: "one_time" | "monthly" | "quarterly" | "annually"
      closed_won_substage:
        | "odf_created"
        | "odf_approved"
        | "invoice_raised"
        | "payment_received"
        | "request_odf"
        | "process_order"
        | "get_license"
        | "raise_invoice"
        | "collect_payment"
      compliance_status:
        | "not_started"
        | "in_progress"
        | "compliant"
        | "non_compliant"
        | "needs_review"
      data_region:
        | "us-east"
        | "us-west"
        | "eu-central"
        | "ap-south"
        | "ap-southeast"
      deal_stage:
        | "pipeline"
        | "upside"
        | "strong_upside"
        | "commit"
        | "closed_won"
        | "closed_lost"
      demo_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "rescheduled"
        | "no_show"
      employment_status:
        | "active"
        | "probation"
        | "pip"
        | "notice_period"
        | "inactive"
        | "terminated"
      framework_type:
        | "soc2"
        | "iso27001"
        | "hipaa"
        | "pci_dss"
        | "gdpr"
        | "nist"
        | "other"
      hr_workflow_status:
        | "draft"
        | "active"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      hr_workflow_type: "onboarding" | "offboarding" | "retention"
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
      offboarding_stage:
        | "resignation_submitted"
        | "manager_review"
        | "retention_review"
        | "exit_approved"
        | "knowledge_transfer"
        | "asset_return"
        | "exit_interview"
        | "final_settlement"
        | "completed"
      onboarding_stage:
        | "requirement_submitted"
        | "hr_sourcing"
        | "profile_review"
        | "manager_interview"
        | "senior_interview"
        | "ceo_interview"
        | "management_interview"
        | "offer_preparation"
        | "offer_sent"
        | "offer_accepted"
        | "completed"
      poc_status:
        | "requested"
        | "planning"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "converted"
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
      sales_sub_team:
        | "commercial"
        | "enterprise_govt"
        | "bfsi"
        | "international"
        | "alliance_india"
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
        | "renewals"
        | "accounts"
        | "admin"
      tenant_status: "pending" | "active" | "suspended" | "cancelled"
      tenant_tier: "starter" | "professional" | "enterprise"
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
      user_category:
        | "employee"
        | "contractor"
        | "vendor"
        | "distributor"
        | "customer"
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
        "request_odf",
        "process_order",
        "get_license",
        "raise_invoice",
        "collect_payment",
      ],
      compliance_status: [
        "not_started",
        "in_progress",
        "compliant",
        "non_compliant",
        "needs_review",
      ],
      data_region: [
        "us-east",
        "us-west",
        "eu-central",
        "ap-south",
        "ap-southeast",
      ],
      deal_stage: [
        "pipeline",
        "upside",
        "strong_upside",
        "commit",
        "closed_won",
        "closed_lost",
      ],
      demo_status: [
        "scheduled",
        "completed",
        "cancelled",
        "rescheduled",
        "no_show",
      ],
      employment_status: [
        "active",
        "probation",
        "pip",
        "notice_period",
        "inactive",
        "terminated",
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
      hr_workflow_status: [
        "draft",
        "active",
        "pending_approval",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      hr_workflow_type: ["onboarding", "offboarding", "retention"],
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
      offboarding_stage: [
        "resignation_submitted",
        "manager_review",
        "retention_review",
        "exit_approved",
        "knowledge_transfer",
        "asset_return",
        "exit_interview",
        "final_settlement",
        "completed",
      ],
      onboarding_stage: [
        "requirement_submitted",
        "hr_sourcing",
        "profile_review",
        "manager_interview",
        "senior_interview",
        "ceo_interview",
        "management_interview",
        "offer_preparation",
        "offer_sent",
        "offer_accepted",
        "completed",
      ],
      poc_status: [
        "requested",
        "planning",
        "in_progress",
        "completed",
        "cancelled",
        "converted",
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
      sales_sub_team: [
        "commercial",
        "enterprise_govt",
        "bfsi",
        "international",
        "alliance_india",
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
        "renewals",
        "accounts",
        "admin",
      ],
      tenant_status: ["pending", "active", "suspended", "cancelled"],
      tenant_tier: ["starter", "professional", "enterprise"],
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
      user_category: [
        "employee",
        "contractor",
        "vendor",
        "distributor",
        "customer",
      ],
    },
  },
} as const
