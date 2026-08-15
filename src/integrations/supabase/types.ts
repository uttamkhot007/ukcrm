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
      account_groups: {
        Row: {
          affects_gross_profit: boolean | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_primary: boolean | null
          name: string
          nature: string
          parent_group_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          affects_gross_profit?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          name: string
          nature: string
          parent_group_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          affects_gross_profit?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          name?: string
          nature?: string
          parent_group_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "account_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_commitments: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          owner_id: string
          priority: string
          source_module: string | null
          source_record_id: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          owner_id: string
          priority?: string
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          owner_id?: string
          priority?: string
          source_module?: string | null
          source_record_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          activity_category: string | null
          created_at: string
          department: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          subcategory: string | null
          team_type: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activity_category?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subcategory?: string | null
          team_type?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activity_category?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subcategory?: string | null
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
      ai_agent_run_steps: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          input: Json | null
          label: string | null
          output: Json | null
          run_id: string
          status: string
          step_index: number
          step_type: string
          tenant_id: string
          tool_name: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          input?: Json | null
          label?: string | null
          output?: Json | null
          run_id: string
          status?: string
          step_index?: number
          step_type?: string
          tenant_id: string
          tool_name?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          input?: Json | null
          label?: string | null
          output?: Json | null
          run_id?: string
          status?: string
          step_index?: number
          step_type?: string
          tenant_id?: string
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_runs: {
        Row: {
          agent_key: string
          completion_tokens: number
          context: Json
          created_at: string
          created_by: string
          deliverable_id: string | null
          duration_ms: number | null
          error: string | null
          id: string
          instruction: string
          model: string | null
          module: string | null
          prompt_tokens: number
          related_record_id: string | null
          related_record_type: string | null
          result_data: Json | null
          result_text: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agent_key: string
          completion_tokens?: number
          context?: Json
          created_at?: string
          created_by?: string
          deliverable_id?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          instruction: string
          model?: string | null
          module?: string | null
          prompt_tokens?: number
          related_record_id?: string | null
          related_record_type?: string | null
          result_data?: Json | null
          result_text?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agent_key?: string
          completion_tokens?: number
          context?: Json
          created_at?: string
          created_by?: string
          deliverable_id?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          instruction?: string
          model?: string | null
          module?: string | null
          prompt_tokens?: number
          related_record_id?: string | null
          related_record_type?: string | null
          result_data?: Json | null
          result_text?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_schedules: {
        Row: {
          agent_key: string
          context: Json
          created_at: string
          created_by: string
          cron_expression: string | null
          enabled: boolean
          event_key: string | null
          id: string
          instruction: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          tenant_id: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          agent_key: string
          context?: Json
          created_at?: string
          created_by?: string
          cron_expression?: string | null
          enabled?: boolean
          event_key?: string | null
          id?: string
          instruction: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          tenant_id: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          agent_key?: string
          context?: Json
          created_at?: string
          created_by?: string
          cron_expression?: string | null
          enabled?: boolean
          event_key?: string | null
          id?: string
          instruction?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          tenant_id?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          agent_key: string
          capabilities: Json
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          icon: string | null
          id: string
          model: string | null
          module: string | null
          name: string
          system_prompt: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          agent_key: string
          capabilities?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          model?: string | null
          module?: string | null
          name: string
          system_prompt?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_key?: string
          capabilities?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          model?: string | null
          module?: string | null
          name?: string
          system_prompt?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_deliverables: {
        Row: {
          agent_key: string | null
          body_html: string | null
          created_at: string
          created_by: string
          data: Json
          deliverable_type: string
          id: string
          module: string | null
          parent_id: string | null
          related_record_id: string | null
          related_record_type: string | null
          run_id: string | null
          status: string
          summary: string | null
          tenant_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          agent_key?: string | null
          body_html?: string | null
          created_at?: string
          created_by?: string
          data?: Json
          deliverable_type?: string
          id?: string
          module?: string | null
          parent_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          run_id?: string | null
          status?: string
          summary?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          agent_key?: string | null
          body_html?: string | null
          created_at?: string
          created_by?: string
          data?: Json
          deliverable_type?: string
          id?: string
          module?: string | null
          parent_id?: string | null
          related_record_id?: string | null
          related_record_type?: string | null
          run_id?: string | null
          status?: string
          summary?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_deliverables_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ai_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_deliverables_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      alliance_organizations: {
        Row: {
          account_manager_id: string | null
          address: string | null
          created_at: string
          created_by: string
          customer_environment: Json | null
          description: string | null
          id: string
          industry: string | null
          infrastructure_config: Json | null
          logo_url: string | null
          name: string
          organization_type: string | null
          security_controls: string[] | null
          services: string[] | null
          solution_configs: Json | null
          solutions: string[] | null
          status: string | null
          team_config: Json | null
          technical_account_manager_id: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          account_manager_id?: string | null
          address?: string | null
          created_at?: string
          created_by: string
          customer_environment?: Json | null
          description?: string | null
          id?: string
          industry?: string | null
          infrastructure_config?: Json | null
          logo_url?: string | null
          name: string
          organization_type?: string | null
          security_controls?: string[] | null
          services?: string[] | null
          solution_configs?: Json | null
          solutions?: string[] | null
          status?: string | null
          team_config?: Json | null
          technical_account_manager_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          account_manager_id?: string | null
          address?: string | null
          created_at?: string
          created_by?: string
          customer_environment?: Json | null
          description?: string | null
          id?: string
          industry?: string | null
          infrastructure_config?: Json | null
          logo_url?: string | null
          name?: string
          organization_type?: string | null
          security_controls?: string[] | null
          services?: string[] | null
          solution_configs?: Json | null
          solutions?: string[] | null
          status?: string | null
          team_config?: Json | null
          technical_account_manager_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
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
          anniversary_date: string | null
          created_at: string
          created_by: string
          designation: string | null
          dob: string | null
          email: string | null
          escalation_manager_id: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          profile_image_url: string | null
          role: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anniversary_date?: string | null
          created_at?: string
          created_by: string
          designation?: string | null
          dob?: string | null
          email?: string | null
          escalation_manager_id?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_image_url?: string | null
          role?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anniversary_date?: string | null
          created_at?: string
          created_by?: string
          designation?: string | null
          dob?: string | null
          email?: string | null
          escalation_manager_id?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_image_url?: string | null
          role?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
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
          updated_by: string | null
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
          updated_by?: string | null
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
          updated_by?: string | null
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
      bank_reconciliation: {
        Row: {
          amount: number
          bank_date: string | null
          cheque_number: string | null
          created_at: string | null
          id: string
          is_reconciled: boolean | null
          ledger_id: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          tenant_id: string | null
          transaction_date: string
          transaction_type: string | null
          voucher_id: string | null
        }
        Insert: {
          amount: number
          bank_date?: string | null
          cheque_number?: string | null
          created_at?: string | null
          id?: string
          is_reconciled?: boolean | null
          ledger_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          tenant_id?: string | null
          transaction_date: string
          transaction_type?: string | null
          voucher_id?: string | null
        }
        Update: {
          amount?: number
          bank_date?: string | null
          cheque_number?: string | null
          created_at?: string | null
          id?: string
          is_reconciled?: boolean | null
          ledger_id?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          tenant_id?: string | null
          transaction_date?: string
          transaction_type?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          actual_amount: number | null
          budget_id: string
          budgeted_amount: number
          cost_center_id: string | null
          created_at: string
          id: string
          ledger_id: string | null
          notes: string | null
          period_month: number | null
          updated_at: string
          variance_amount: number | null
        }
        Insert: {
          actual_amount?: number | null
          budget_id: string
          budgeted_amount?: number
          cost_center_id?: string | null
          created_at?: string
          id?: string
          ledger_id?: string | null
          notes?: string | null
          period_month?: number | null
          updated_at?: string
          variance_amount?: number | null
        }
        Update: {
          actual_amount?: number | null
          budget_id?: string
          budgeted_amount?: number
          cost_center_id?: string | null
          created_at?: string
          id?: string
          ledger_id?: string | null
          notes?: string | null
          period_month?: number | null
          updated_at?: string
          variance_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget_type: string | null
          created_at: string
          created_by: string | null
          end_date: string
          fiscal_year: string
          id: string
          name: string
          notes: string | null
          start_date: string
          status: string | null
          tenant_id: string | null
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget_type?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          fiscal_year: string
          id?: string
          name: string
          notes?: string | null
          start_date: string
          status?: string | null
          tenant_id?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget_type?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          fiscal_year?: string
          id?: string
          name?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_tenant_id_fkey"
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
      canned_responses: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          shortcut: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          shortcut?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string | null
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          expires_at: string
          file_name: string | null
          file_url: string | null
          id: string
          message_type: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          expires_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          expires_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      communications_announcements: {
        Row: {
          audience: string | null
          content: string | null
          created_at: string
          created_by: string
          id: string
          scheduled_date: string | null
          status: string
          tenant_id: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          audience?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          scheduled_date?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          scheduled_date?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communications_releases: {
        Row: {
          author: string | null
          content: string | null
          created_at: string
          created_by: string
          distribution_outlet: string | null
          id: string
          published_date: string | null
          scheduled_date: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          distribution_outlet?: string | null
          id?: string
          published_date?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          distribution_outlet?: string | null
          id?: string
          published_date?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_releases_tenant_id_fkey"
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
      contact_lifecycle_stages: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_lifecycle_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          alliance_organization_id: string | null
          alliance_user_id: string | null
          avatar_url: string | null
          company: string | null
          created_at: string
          created_by: string | null
          department: string | null
          designation: string | null
          email: string | null
          engagement_score: number | null
          id: string
          is_champion: boolean | null
          last_contacted_at: string | null
          lifecycle_stage_id: string | null
          lifecycle_updated_at: string | null
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          reporting_manager_id: string | null
          role_in_deal: string | null
          seniority_level: string | null
          source_type: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          alliance_organization_id?: string | null
          alliance_user_id?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          engagement_score?: number | null
          id?: string
          is_champion?: boolean | null
          last_contacted_at?: string | null
          lifecycle_stage_id?: string | null
          lifecycle_updated_at?: string | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          reporting_manager_id?: string | null
          role_in_deal?: string | null
          seniority_level?: string | null
          source_type?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          alliance_organization_id?: string | null
          alliance_user_id?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          engagement_score?: number | null
          id?: string
          is_champion?: boolean | null
          last_contacted_at?: string | null
          lifecycle_stage_id?: string | null
          lifecycle_updated_at?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          reporting_manager_id?: string | null
          role_in_deal?: string | null
          seniority_level?: string | null
          source_type?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_alliance_organization_id_fkey"
            columns: ["alliance_organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_alliance_user_id_fkey"
            columns: ["alliance_user_id"]
            isOneToOne: false
            referencedRelation: "alliance_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_lifecycle_stage_id_fkey"
            columns: ["lifecycle_stage_id"]
            isOneToOne: false
            referencedRelation: "contact_lifecycle_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
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
      cost_centers: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_center_id: string | null
          tenant_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_center_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_center_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_parent_center_id_fkey"
            columns: ["parent_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_places: number | null
          exchange_rate: number | null
          id: string
          is_active: boolean | null
          is_base_currency: boolean | null
          last_updated: string | null
          name: string
          symbol: string
          tenant_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          decimal_places?: number | null
          exchange_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_base_currency?: boolean | null
          last_updated?: string | null
          name: string
          symbol: string
          tenant_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          decimal_places?: number | null
          exchange_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_base_currency?: boolean | null
          last_updated?: string | null
          name?: string
          symbol?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "currencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_deliveries: {
        Row: {
          alliance_organization_id: string | null
          contact_id: string | null
          created_at: string
          deal_id: string
          delivered_at: string | null
          delivered_by: string | null
          delivery_type: string
          id: string
          license_keys: Json | null
          managed_service_end: string | null
          managed_service_start: string | null
          notes: string | null
          renewal_date: string | null
          status: string | null
          support_contract_end: string | null
          support_contract_start: string | null
          support_portal_access: boolean | null
          support_portal_user_created: boolean | null
          tenant_id: string | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          alliance_organization_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id: string
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_type: string
          id?: string
          license_keys?: Json | null
          managed_service_end?: string | null
          managed_service_start?: string | null
          notes?: string | null
          renewal_date?: string | null
          status?: string | null
          support_contract_end?: string | null
          support_contract_start?: string | null
          support_portal_access?: boolean | null
          support_portal_user_created?: boolean | null
          tenant_id?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          alliance_organization_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string
          delivered_at?: string | null
          delivered_by?: string | null
          delivery_type?: string
          id?: string
          license_keys?: Json | null
          managed_service_end?: string | null
          managed_service_start?: string | null
          notes?: string | null
          renewal_date?: string | null
          status?: string | null
          support_contract_end?: string | null
          support_contract_start?: string | null
          support_portal_access?: boolean | null
          support_portal_user_created?: boolean | null
          tenant_id?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_deliveries_alliance_organization_id_fkey"
            columns: ["alliance_organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_deliveries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_deliveries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_deliveries_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "post_sale_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_organization_access: {
        Row: {
          created_at: string
          id: string
          is_primary_contact: boolean | null
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_organization_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_support_contracts: {
        Row: {
          assigned_technical_team: string[] | null
          contract_name: string
          contract_type: string
          created_at: string | null
          created_by: string
          deal_id: string | null
          end_date: string
          escalation_matrix: Json | null
          id: string
          license_details: Json | null
          notes: string | null
          organization_id: string
          sla_resolution_hours: number | null
          sla_response_hours: number | null
          solution_details: Json | null
          start_date: string
          status: string | null
          support_contacts: Json | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_technical_team?: string[] | null
          contract_name: string
          contract_type?: string
          created_at?: string | null
          created_by: string
          deal_id?: string | null
          end_date: string
          escalation_matrix?: Json | null
          id?: string
          license_details?: Json | null
          notes?: string | null
          organization_id: string
          sla_resolution_hours?: number | null
          sla_response_hours?: number | null
          solution_details?: Json | null
          start_date: string
          status?: string | null
          support_contacts?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_technical_team?: string[] | null
          contract_name?: string
          contract_type?: string
          created_at?: string | null
          created_by?: string
          deal_id?: string | null
          end_date?: string
          escalation_matrix?: Json | null
          id?: string
          license_details?: Json | null
          notes?: string | null
          organization_id?: string
          sla_resolution_hours?: number | null
          sla_response_hours?: number | null
          solution_details?: Json | null
          start_date?: string
          status?: string | null
          support_contacts?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_support_contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_support_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_support_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_support_ticket_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_support_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "customer_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_support_ticket_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_support_ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "customer_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_support_tickets: {
        Row: {
          assigned_team: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          expected_response_hours: number | null
          id: string
          impact: string | null
          issue_type: string | null
          organization_id: string
          resolution_notes: string | null
          resolved_at: string | null
          sales_category:
            | Database["public"]["Enums"]["sales_query_category"]
            | null
          severity: Database["public"]["Enums"]["support_ticket_severity"]
          sla_deadline: string | null
          solution_service: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          submitted_by: string
          tenant_id: string | null
          ticket_number: string
          ticket_type: Database["public"]["Enums"]["support_ticket_type"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_team?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          expected_response_hours?: number | null
          id?: string
          impact?: string | null
          issue_type?: string | null
          organization_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          sales_category?:
            | Database["public"]["Enums"]["sales_query_category"]
            | null
          severity?: Database["public"]["Enums"]["support_ticket_severity"]
          sla_deadline?: string | null
          solution_service?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          submitted_by: string
          tenant_id?: string | null
          ticket_number: string
          ticket_type: Database["public"]["Enums"]["support_ticket_type"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_team?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          expected_response_hours?: number | null
          id?: string
          impact?: string | null
          issue_type?: string | null
          organization_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          sales_category?:
            | Database["public"]["Enums"]["sales_query_category"]
            | null
          severity?: Database["public"]["Enums"]["support_ticket_severity"]
          sla_deadline?: string | null
          solution_service?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          submitted_by?: string
          tenant_id?: string | null
          ticket_number?: string
          ticket_type?: Database["public"]["Enums"]["support_ticket_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cybersecurity_news: {
        Row: {
          affected_systems: string[] | null
          category: string
          created_at: string
          created_by: string
          full_content: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          recommendations: string[] | null
          severity: string | null
          source_name: string | null
          source_url: string | null
          summary: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affected_systems?: string[] | null
          category: string
          created_at?: string
          created_by: string
          full_content?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          recommendations?: string[] | null
          severity?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affected_systems?: string[] | null
          category?: string
          created_at?: string
          created_by?: string
          full_content?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          recommendations?: string[] | null
          severity?: string | null
          source_name?: string | null
          source_url?: string | null
          summary?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cybersecurity_news_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cynet_licenses: {
        Row: {
          assigned_endpoints: number | null
          billing_type: string | null
          clm_retention: string | null
          created_at: string
          created_by: string | null
          cynet_id: string
          endpoints_used: number | null
          hierarchy_path: string | null
          id: string
          integrations_count: number | null
          integrations_info: string | null
          monthly_data_ingestion: number | null
          notes: string | null
          organization_id: string | null
          parent_cynet_id: string | null
          parent_name: string | null
          procured_licenses: number | null
          site_name: string
          status: string | null
          tenant_id: string | null
          total_groups: number | null
          updated_at: string
        }
        Insert: {
          assigned_endpoints?: number | null
          billing_type?: string | null
          clm_retention?: string | null
          created_at?: string
          created_by?: string | null
          cynet_id: string
          endpoints_used?: number | null
          hierarchy_path?: string | null
          id?: string
          integrations_count?: number | null
          integrations_info?: string | null
          monthly_data_ingestion?: number | null
          notes?: string | null
          organization_id?: string | null
          parent_cynet_id?: string | null
          parent_name?: string | null
          procured_licenses?: number | null
          site_name: string
          status?: string | null
          tenant_id?: string | null
          total_groups?: number | null
          updated_at?: string
        }
        Update: {
          assigned_endpoints?: number | null
          billing_type?: string | null
          clm_retention?: string | null
          created_at?: string
          created_by?: string | null
          cynet_id?: string
          endpoints_used?: number | null
          hierarchy_path?: string | null
          id?: string
          integrations_count?: number | null
          integrations_info?: string | null
          monthly_data_ingestion?: number | null
          notes?: string | null
          organization_id?: string | null
          parent_cynet_id?: string | null
          parent_name?: string | null
          procured_licenses?: number | null
          site_name?: string
          status?: string | null
          tenant_id?: string | null
          total_groups?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cynet_licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cynet_licenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activities: {
        Row: {
          activity_category: string
          activity_date: string
          activity_definition_id: string | null
          activity_subtype: string | null
          activity_type: string
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          location_type: string | null
          outcome: string | null
          related_deal_id: string | null
          related_organization_id: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_category: string
          activity_date?: string
          activity_definition_id?: string | null
          activity_subtype?: string | null
          activity_type: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          location_type?: string | null
          outcome?: string | null
          related_deal_id?: string | null
          related_organization_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_category?: string
          activity_date?: string
          activity_definition_id?: string | null
          activity_subtype?: string | null
          activity_type?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          location_type?: string | null
          outcome?: string | null
          related_deal_id?: string | null
          related_organization_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_activities_activity_definition_id_fkey"
            columns: ["activity_definition_id"]
            isOneToOne: false
            referencedRelation: "activity_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_activities_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_activities_related_organization_id_fkey"
            columns: ["related_organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      day_book_entries: {
        Row: {
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          entry_date: string
          id: string
          party_name: string | null
          tenant_id: string | null
          voucher_id: string | null
          voucher_number: string
          voucher_type: string
        }
        Insert: {
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          entry_date: string
          id?: string
          party_name?: string | null
          tenant_id?: string | null
          voucher_id?: string | null
          voucher_number: string
          voucher_type: string
        }
        Update: {
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          entry_date?: string
          id?: string
          party_name?: string | null
          tenant_id?: string | null
          voucher_id?: string | null
          voucher_number?: string
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_book_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_book_entries_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
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
      deal_products: {
        Row: {
          created_at: string
          deal_id: string
          discount_percent: number | null
          id: string
          notes: string | null
          product_id: string
          quantity: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          deal_id: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          deal_id?: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_products_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_registration_comments: {
        Row: {
          content: string
          created_at: string
          deal_registration_id: string
          id: string
          is_internal: boolean | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deal_registration_id: string
          id?: string
          is_internal?: boolean | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deal_registration_id?: string
          id?: string
          is_internal?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_registration_comments_deal_registration_id_fkey"
            columns: ["deal_registration_id"]
            isOneToOne: false
            referencedRelation: "deal_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_registration_history: {
        Row: {
          action: string
          created_at: string
          deal_registration_id: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          deal_registration_id: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          deal_registration_id?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_registration_history_deal_registration_id_fkey"
            columns: ["deal_registration_id"]
            isOneToOne: false
            referencedRelation: "deal_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_registrations: {
        Row: {
          approval_date: string | null
          assigned_to: string | null
          competitor_info: string | null
          created_at: string
          customer_name: string
          customer_organization_id: string | null
          deal_id: string | null
          description: string | null
          dr_expiry_date: string | null
          dr_id_from_vendor: string | null
          dr_number: string
          expected_close_date: string | null
          id: string
          notes: string | null
          opportunity_value: number | null
          priority: string | null
          rejection_reason: string | null
          requester_id: string
          requirements: string | null
          sla_deadline: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          vendor_name: string
          vendor_program: string | null
        }
        Insert: {
          approval_date?: string | null
          assigned_to?: string | null
          competitor_info?: string | null
          created_at?: string
          customer_name: string
          customer_organization_id?: string | null
          deal_id?: string | null
          description?: string | null
          dr_expiry_date?: string | null
          dr_id_from_vendor?: string | null
          dr_number: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          opportunity_value?: number | null
          priority?: string | null
          rejection_reason?: string | null
          requester_id: string
          requirements?: string | null
          sla_deadline?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor_name: string
          vendor_program?: string | null
        }
        Update: {
          approval_date?: string | null
          assigned_to?: string | null
          competitor_info?: string | null
          created_at?: string
          customer_name?: string
          customer_organization_id?: string | null
          deal_id?: string | null
          description?: string | null
          dr_expiry_date?: string | null
          dr_id_from_vendor?: string | null
          dr_number?: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          opportunity_value?: number | null
          priority?: string | null
          rejection_reason?: string | null
          requester_id?: string
          requirements?: string | null
          sla_deadline?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          vendor_name?: string
          vendor_program?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_registrations_customer_organization_id_fkey"
            columns: ["customer_organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_registrations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_progression_log: {
        Row: {
          created_at: string
          deal_id: string | null
          from_stage: string
          id: string
          meddic_score_at_change: number | null
          progression_type: string
          to_stage: string
          trigger_reason: string | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          from_stage: string
          id?: string
          meddic_score_at_change?: number | null
          progression_type?: string
          to_stage: string
          trigger_reason?: string | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          from_stage?: string
          id?: string
          meddic_score_at_change?: number | null
          progression_type?: string
          to_stage?: string
          trigger_reason?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_progression_log_deal_id_fkey"
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
          ai_recommendations: string[] | null
          alliance_organization_id: string | null
          assigned_to: string | null
          auto_progression_enabled: boolean | null
          buying_timeline: string | null
          closed_won_substage:
            | Database["public"]["Enums"]["closed_won_substage"]
            | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          customer_environment: Json | null
          deal_type: string | null
          description: string | null
          existing_solution: string | null
          expected_close_date: string | null
          id: string
          includes_managed_service: boolean | null
          includes_renewal: boolean | null
          includes_support: boolean | null
          is_budgeted: boolean | null
          last_analyzed_at: string | null
          last_stage_change_at: string | null
          lead_id: string | null
          loss_reason: string | null
          meddic_champion: string | null
          meddic_current_stage: string | null
          meddic_decision_criteria: string | null
          meddic_decision_process: string | null
          meddic_details: Json | null
          meddic_economic_buyer: string | null
          meddic_identify_pain: string | null
          meddic_metrics: string | null
          meddic_score: number | null
          next_best_actions: string[] | null
          next_steps: string | null
          order_type: string | null
          organization_name: string | null
          probability: number | null
          problem_requirement: string | null
          qualification_completed_at: string | null
          quantity: number | null
          requirement_category: string | null
          risk_factors: string[] | null
          solution_id: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          tenant_id: string | null
          tentative_budget: number | null
          territory_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          user_id: string
          value: number
          win_probability: number | null
        }
        Insert: {
          actual_close_date?: string | null
          ai_recommendations?: string[] | null
          alliance_organization_id?: string | null
          assigned_to?: string | null
          auto_progression_enabled?: boolean | null
          buying_timeline?: string | null
          closed_won_substage?:
            | Database["public"]["Enums"]["closed_won_substage"]
            | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_environment?: Json | null
          deal_type?: string | null
          description?: string | null
          existing_solution?: string | null
          expected_close_date?: string | null
          id?: string
          includes_managed_service?: boolean | null
          includes_renewal?: boolean | null
          includes_support?: boolean | null
          is_budgeted?: boolean | null
          last_analyzed_at?: string | null
          last_stage_change_at?: string | null
          lead_id?: string | null
          loss_reason?: string | null
          meddic_champion?: string | null
          meddic_current_stage?: string | null
          meddic_decision_criteria?: string | null
          meddic_decision_process?: string | null
          meddic_details?: Json | null
          meddic_economic_buyer?: string | null
          meddic_identify_pain?: string | null
          meddic_metrics?: string | null
          meddic_score?: number | null
          next_best_actions?: string[] | null
          next_steps?: string | null
          order_type?: string | null
          organization_name?: string | null
          probability?: number | null
          problem_requirement?: string | null
          qualification_completed_at?: string | null
          quantity?: number | null
          requirement_category?: string | null
          risk_factors?: string[] | null
          solution_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tenant_id?: string | null
          tentative_budget?: number | null
          territory_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          value?: number
          win_probability?: number | null
        }
        Update: {
          actual_close_date?: string | null
          ai_recommendations?: string[] | null
          alliance_organization_id?: string | null
          assigned_to?: string | null
          auto_progression_enabled?: boolean | null
          buying_timeline?: string | null
          closed_won_substage?:
            | Database["public"]["Enums"]["closed_won_substage"]
            | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_environment?: Json | null
          deal_type?: string | null
          description?: string | null
          existing_solution?: string | null
          expected_close_date?: string | null
          id?: string
          includes_managed_service?: boolean | null
          includes_renewal?: boolean | null
          includes_support?: boolean | null
          is_budgeted?: boolean | null
          last_analyzed_at?: string | null
          last_stage_change_at?: string | null
          lead_id?: string | null
          loss_reason?: string | null
          meddic_champion?: string | null
          meddic_current_stage?: string | null
          meddic_decision_criteria?: string | null
          meddic_decision_process?: string | null
          meddic_details?: Json | null
          meddic_economic_buyer?: string | null
          meddic_identify_pain?: string | null
          meddic_metrics?: string | null
          meddic_score?: number | null
          next_best_actions?: string[] | null
          next_steps?: string | null
          order_type?: string | null
          organization_name?: string | null
          probability?: number | null
          problem_requirement?: string | null
          qualification_completed_at?: string | null
          quantity?: number | null
          requirement_category?: string | null
          risk_factors?: string[] | null
          solution_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          tenant_id?: string | null
          tentative_budget?: number | null
          territory_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          value?: number
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_alliance_organization_id_fkey"
            columns: ["alliance_organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "deals_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "offerings_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "sales_territories"
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
      document_template_versions: {
        Row: {
          branding: Json
          change_note: string | null
          content: Json
          created_at: string
          created_by: string | null
          description: string | null
          footer_content: Json
          header_content: Json
          id: string
          library_key: string | null
          library_version: string | null
          name: string
          template_id: string
          template_type: string
          tenant_id: string
          version: string
        }
        Insert: {
          branding?: Json
          change_note?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          footer_content?: Json
          header_content?: Json
          id?: string
          library_key?: string | null
          library_version?: string | null
          name: string
          template_id: string
          template_type: string
          tenant_id: string
          version?: string
        }
        Update: {
          branding?: Json
          change_note?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          footer_content?: Json
          header_content?: Json
          id?: string
          library_key?: string | null
          library_version?: string | null
          name?: string
          template_id?: string
          template_type?: string
          tenant_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          branding: Json | null
          content: Json
          created_at: string
          created_by: string | null
          description: string | null
          footer_content: Json | null
          header_content: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          library_key: string | null
          library_version: string | null
          name: string
          pack_role: string | null
          template_type: string
          tenant_id: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          branding?: Json | null
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          footer_content?: Json | null
          header_content?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          library_key?: string | null
          library_version?: string | null
          name: string
          pack_role?: string | null
          template_type: string
          tenant_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          branding?: Json | null
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          footer_content?: Json | null
          header_content?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          library_key?: string | null
          library_version?: string | null
          name?: string
          pack_role?: string | null
          template_type?: string
          tenant_id?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      e_invoices: {
        Row: {
          ack_date: string | null
          ack_number: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          error_message: string | null
          id: string
          invoice_id: string | null
          irn: string | null
          qr_code: string | null
          signed_invoice: string | null
          signed_qr_code: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          ack_date?: string | null
          ack_number?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          irn?: string | null
          qr_code?: string | null
          signed_invoice?: string | null
          signed_qr_code?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          ack_date?: string | null
          ack_number?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          irn?: string | null
          qr_code?: string | null
          signed_invoice?: string | null
          signed_qr_code?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "e_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          current_step: number | null
          deal_id: string | null
          enrolled_at: string
          enrolled_by: string
          id: string
          lead_id: string | null
          sequence_id: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          current_step?: number | null
          deal_id?: string | null
          enrolled_at?: string
          enrolled_by: string
          id?: string
          lead_id?: string | null
          sequence_id?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          current_step?: number | null
          deal_id?: string | null
          enrolled_at?: string
          enrolled_by?: string
          id?: string
          lead_id?: string | null
          sequence_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          body: string
          created_at: string
          delay_days: number | null
          delay_hours: number | null
          id: string
          sequence_id: string | null
          step_order: number
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          delay_days?: number | null
          delay_hours?: number | null
          id?: string
          sequence_id?: string | null
          step_order: number
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          delay_days?: number | null
          delay_hours?: number | null
          id?: string
          sequence_id?: string | null
          step_order?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: string | null
          tenant_id: string | null
          trigger_conditions: Json | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string | null
          tenant_id?: string | null
          trigger_conditions?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          tenant_id?: string | null
          trigger_conditions?: Json | null
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          tenant_id: string | null
          text_content: string | null
          updated_at: string
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          tenant_id?: string | null
          text_content?: string | null
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          tenant_id?: string | null
          text_content?: string | null
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_achievements: {
        Row: {
          achieved_date: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          metric_unit: string | null
          metric_value: number | null
          tenant_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          achieved_date?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metric_unit?: string | null
          metric_value?: number | null
          tenant_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          achieved_date?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metric_unit?: string | null
          metric_value?: number | null
          tenant_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_achievements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_awards: {
        Row: {
          awarded_by: string | null
          awarded_date: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          tenant_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          awarded_by?: string | null
          awarded_date?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tenant_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          awarded_by?: string | null
          awarded_date?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tenant_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_awards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_certifications: {
        Row: {
          created_at: string
          credential_id: string | null
          credential_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string | null
          name: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          name: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string | null
          name?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_checklist_assignments: {
        Row: {
          assigned_by: string | null
          checklist_id: string
          completed_at: string | null
          completed_items: Json | null
          created_at: string
          id: string
          progress_percent: number | null
          started_at: string | null
          status: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          checklist_id: string
          completed_at?: string | null
          completed_items?: Json | null
          created_at?: string
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          checklist_id?: string
          completed_at?: string | null
          completed_items?: Json | null
          created_at?: string
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_checklist_assignments_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "hr_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_checklist_assignments_tenant_id_fkey"
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
      employee_kudos: {
        Row: {
          category: string
          created_at: string
          from_user_id: string
          id: string
          message: string
          points: number
          tenant_id: string
          to_user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          from_user_id: string
          id?: string
          message: string
          points?: number
          tenant_id: string
          to_user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          points?: number
          tenant_id?: string
          to_user_id?: string
        }
        Relationships: []
      }
      employee_kudos_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          kudos_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          kudos_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          kudos_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_kudos_reactions_kudos_id_fkey"
            columns: ["kudos_id"]
            isOneToOne: false
            referencedRelation: "employee_kudos"
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
      employee_pulse_checkins: {
        Row: {
          ai_sentiment: number | null
          ai_themes: string[]
          checkin_date: string
          created_at: string
          energy_level: number | null
          id: string
          mood_score: number
          note: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          workload_level: number | null
        }
        Insert: {
          ai_sentiment?: number | null
          ai_themes?: string[]
          checkin_date?: string
          created_at?: string
          energy_level?: number | null
          id?: string
          mood_score: number
          note?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          workload_level?: number | null
        }
        Update: {
          ai_sentiment?: number | null
          ai_themes?: string[]
          checkin_date?: string
          created_at?: string
          energy_level?: number | null
          id?: string
          mood_score?: number
          note?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          workload_level?: number | null
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
      employee_sensitive_details: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_ifsc_code: string | null
          bank_name: string | null
          created_at: string
          current_address: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          emergency_contact_relationship: string | null
          esi_dispensary: string | null
          esi_number: string | null
          gratuity_nomination_name: string | null
          gratuity_nomination_percentage: number | null
          gratuity_nomination_relation: string | null
          id: string
          pf_number: string | null
          postal_code: string | null
          tenant_id: string | null
          uan_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          created_at?: string
          current_address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          emergency_contact_relationship?: string | null
          esi_dispensary?: string | null
          esi_number?: string | null
          gratuity_nomination_name?: string | null
          gratuity_nomination_percentage?: number | null
          gratuity_nomination_relation?: string | null
          id?: string
          pf_number?: string | null
          postal_code?: string | null
          tenant_id?: string | null
          uan_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc_code?: string | null
          bank_name?: string | null
          created_at?: string
          current_address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          emergency_contact_relationship?: string | null
          esi_dispensary?: string | null
          esi_number?: string | null
          gratuity_nomination_name?: string | null
          gratuity_nomination_percentage?: number | null
          gratuity_nomination_relation?: string | null
          id?: string
          pf_number?: string | null
          postal_code?: string | null
          tenant_id?: string | null
          uan_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_skill_matrix: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          id: string
          name: string
          overall_score: number
          profile_id: string | null
          role: string
          skills: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string
          id?: string
          name: string
          overall_score?: number
          profile_id?: string | null
          role?: string
          skills?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          id?: string
          name?: string
          overall_score?: number
          profile_id?: string | null
          role?: string
          skills?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skill_matrix_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skill_matrix_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_verifications: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          extracted_data: Json | null
          id: string
          notes: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
          verification_date: string | null
          verification_type: string
          verified_by: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
          verification_date?: string | null
          verification_type: string
          verified_by?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
          verification_date?: string | null
          verification_type?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_wellbeing_signals: {
        Row: {
          created_at: string
          factors: Json
          id: string
          recommended_action: string | null
          risk_level: string
          risk_score: number
          sentiment_score: number | null
          signal_date: string
          source: string
          summary: string | null
          tenant_id: string
          themes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          factors?: Json
          id?: string
          recommended_action?: string | null
          risk_level?: string
          risk_score?: number
          sentiment_score?: number | null
          signal_date?: string
          source?: string
          summary?: string | null
          tenant_id: string
          themes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          factors?: Json
          id?: string
          recommended_action?: string | null
          risk_level?: string
          risk_score?: number
          sentiment_score?: number | null
          signal_date?: string
          source?: string
          summary?: string | null
          tenant_id?: string
          themes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      escalation_matrix_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          level_1_email: string | null
          level_1_response_hours: number | null
          level_2_email: string | null
          level_2_response_hours: number | null
          level_3_email: string | null
          level_3_response_hours: number | null
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level_1_email?: string | null
          level_1_response_hours?: number | null
          level_2_email?: string | null
          level_2_response_hours?: number | null
          level_3_email?: string | null
          level_3_response_hours?: number | null
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          level_1_email?: string | null
          level_1_response_hours?: number | null
          level_2_email?: string | null
          level_2_response_hours?: number | null
          level_3_email?: string | null
          level_3_response_hours?: number | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_matrix_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          discount_percent: number | null
          display_order: number | null
          estimate_id: string
          hsn_code: string | null
          id: string
          item_name: string
          quantity: number | null
          tax_amount: number | null
          tax_rate: number | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          display_order?: number | null
          estimate_id: string
          hsn_code?: string | null
          id?: string
          item_name: string
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit?: string | null
          unit_price: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          display_order?: number | null
          estimate_id?: string
          hsn_code?: string | null
          id?: string
          item_name?: string
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          accepted_at: string | null
          contact_id: string | null
          converted_to_invoice_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          deal_id: string | null
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          estimate_date: string
          estimate_number: string
          exchange_rate: number | null
          id: string
          notes: string | null
          reference_number: string | null
          sent_at: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tenant_id: string | null
          terms_and_conditions: string | null
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          contact_id?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          estimate_date?: string
          estimate_number: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          contact_id?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          estimate_date?: string
          estimate_number?: string
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          tenant_id?: string | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_converted_to_invoice_id_fkey"
            columns: ["converted_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      eway_bills: {
        Row: {
          cess_amount: number | null
          cgst_amount: number | null
          created_at: string
          distance_km: number | null
          doc_date: string | null
          doc_number: string | null
          doc_type: string | null
          eway_bill_date: string | null
          eway_bill_number: string | null
          extended_times: number | null
          from_address: string | null
          from_gstin: string | null
          from_name: string | null
          from_pincode: string | null
          from_place: string | null
          from_state_code: string | null
          id: string
          igst_amount: number | null
          invoice_id: string | null
          sgst_amount: number | null
          status: string | null
          tenant_id: string | null
          to_address: string | null
          to_gstin: string | null
          to_name: string | null
          to_pincode: string | null
          to_place: string | null
          to_state_code: string | null
          total_value: number | null
          trans_mode: string | null
          transporter_id: string | null
          transporter_name: string | null
          updated_at: string
          valid_until: string | null
          vehicle_number: string | null
          vehicle_type: string | null
        }
        Insert: {
          cess_amount?: number | null
          cgst_amount?: number | null
          created_at?: string
          distance_km?: number | null
          doc_date?: string | null
          doc_number?: string | null
          doc_type?: string | null
          eway_bill_date?: string | null
          eway_bill_number?: string | null
          extended_times?: number | null
          from_address?: string | null
          from_gstin?: string | null
          from_name?: string | null
          from_pincode?: string | null
          from_place?: string | null
          from_state_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id?: string | null
          sgst_amount?: number | null
          status?: string | null
          tenant_id?: string | null
          to_address?: string | null
          to_gstin?: string | null
          to_name?: string | null
          to_pincode?: string | null
          to_place?: string | null
          to_state_code?: string | null
          total_value?: number | null
          trans_mode?: string | null
          transporter_id?: string | null
          transporter_name?: string | null
          updated_at?: string
          valid_until?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Update: {
          cess_amount?: number | null
          cgst_amount?: number | null
          created_at?: string
          distance_km?: number | null
          doc_date?: string | null
          doc_number?: string | null
          doc_type?: string | null
          eway_bill_date?: string | null
          eway_bill_number?: string | null
          extended_times?: number | null
          from_address?: string | null
          from_gstin?: string | null
          from_name?: string | null
          from_pincode?: string | null
          from_place?: string | null
          from_state_code?: string | null
          id?: string
          igst_amount?: number | null
          invoice_id?: string | null
          sgst_amount?: number | null
          status?: string | null
          tenant_id?: string | null
          to_address?: string | null
          to_gstin?: string | null
          to_name?: string | null
          to_pincode?: string | null
          to_place?: string | null
          to_state_code?: string | null
          total_value?: number | null
          trans_mode?: string | null
          transporter_id?: string | null
          transporter_name?: string | null
          updated_at?: string
          valid_until?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eway_bills_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eway_bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      fiscal_years: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_closed: boolean | null
          name: string
          start_date: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_closed?: boolean | null
          name: string
          start_date: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_closed?: boolean | null
          name?: string
          start_date?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_years_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          ai_fields: Json
          ai_model: string | null
          ai_notes: string | null
          attached_record_id: string | null
          attached_record_table: string | null
          created_at: string
          created_by: string | null
          exported_at: string | null
          file_format: string | null
          file_name: string | null
          file_path: string | null
          file_url: string | null
          final_fields: Json
          finalized_at: string | null
          finalized_by: string | null
          id: string
          review_notes: string | null
          source_id: string | null
          source_type: string | null
          status: string
          template_id: string | null
          template_name: string | null
          template_type: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_fields?: Json
          ai_model?: string | null
          ai_notes?: string | null
          attached_record_id?: string | null
          attached_record_table?: string | null
          created_at?: string
          created_by?: string | null
          exported_at?: string | null
          file_format?: string | null
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          final_fields?: Json
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          review_notes?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          template_type?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_fields?: Json
          ai_model?: string | null
          ai_notes?: string | null
          attached_record_id?: string | null
          attached_record_table?: string | null
          created_at?: string
          created_by?: string | null
          exported_at?: string | null
          file_format?: string | null
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          final_fields?: Json
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          review_notes?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          template_type?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      godowns: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_godown_id: string | null
          tenant_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_godown_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_godown_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "godowns_parent_godown_id_fkey"
            columns: ["parent_godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "godowns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_returns: {
        Row: {
          arn_number: string | null
          created_at: string | null
          due_date: string | null
          filed_by: string | null
          filing_date: string | null
          id: string
          return_period: string
          return_type: string
          status: string | null
          tenant_id: string | null
          total_cess: number | null
          total_cgst: number | null
          total_igst: number | null
          total_sgst: number | null
          total_taxable_value: number | null
          updated_at: string | null
        }
        Insert: {
          arn_number?: string | null
          created_at?: string | null
          due_date?: string | null
          filed_by?: string | null
          filing_date?: string | null
          id?: string
          return_period: string
          return_type: string
          status?: string | null
          tenant_id?: string | null
          total_cess?: number | null
          total_cgst?: number | null
          total_igst?: number | null
          total_sgst?: number | null
          total_taxable_value?: number | null
          updated_at?: string | null
        }
        Update: {
          arn_number?: string | null
          created_at?: string | null
          due_date?: string | null
          filed_by?: string | null
          filing_date?: string | null
          id?: string
          return_period?: string
          return_type?: string
          status?: string | null
          tenant_id?: string | null
          total_cess?: number | null
          total_cgst?: number | null
          total_igst?: number | null
          total_sgst?: number | null
          total_taxable_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gst_transactions: {
        Row: {
          cess_amount: number | null
          cgst_amount: number | null
          cgst_rate: number | null
          created_at: string | null
          gstin: string | null
          hsn_code: string | null
          id: string
          igst_amount: number | null
          igst_rate: number | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_number: string | null
          invoice_value: number | null
          party_name: string | null
          place_of_supply: string | null
          reverse_charge: boolean | null
          sgst_amount: number | null
          sgst_rate: number | null
          taxable_value: number | null
          tenant_id: string | null
          transaction_type: string
          voucher_id: string | null
        }
        Insert: {
          cess_amount?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string | null
          gstin?: string | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          invoice_date?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_value?: number | null
          party_name?: string | null
          place_of_supply?: string | null
          reverse_charge?: boolean | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          taxable_value?: number | null
          tenant_id?: string | null
          transaction_type: string
          voucher_id?: string | null
        }
        Update: {
          cess_amount?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          created_at?: string | null
          gstin?: string | null
          hsn_code?: string | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          invoice_date?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_value?: number | null
          party_name?: string | null
          place_of_supply?: string | null
          reverse_charge?: boolean | null
          sgst_amount?: number | null
          sgst_rate?: number | null
          taxable_value?: number | null
          tenant_id?: string | null
          transaction_type?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gst_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gst_transactions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_checklists: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          items: Json
          name: string
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          items: Json
          name: string
          tenant_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          items?: Json
          name?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_checklists_tenant_id_fkey"
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
      hsn_sac_master: {
        Row: {
          cess_rate: number | null
          cgst_rate: number | null
          code: string
          created_at: string | null
          description: string | null
          gst_rate: number
          hsn_type: string | null
          id: string
          igst_rate: number | null
          is_active: boolean | null
          sgst_rate: number | null
          tenant_id: string | null
        }
        Insert: {
          cess_rate?: number | null
          cgst_rate?: number | null
          code: string
          created_at?: string | null
          description?: string | null
          gst_rate: number
          hsn_type?: string | null
          id?: string
          igst_rate?: number | null
          is_active?: boolean | null
          sgst_rate?: number | null
          tenant_id?: string | null
        }
        Update: {
          cess_rate?: number | null
          cgst_rate?: number | null
          code?: string
          created_at?: string | null
          description?: string | null
          gst_rate?: number
          hsn_type?: string | null
          id?: string
          igst_rate?: number | null
          is_active?: boolean | null
          sgst_rate?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hsn_sac_master_tenant_id_fkey"
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
      interview_scorecards: {
        Row: {
          applicant_id: string
          completed_at: string | null
          concerns: string | null
          created_at: string
          id: string
          interview_type: string | null
          interviewer_id: string
          notes: string | null
          overall_rating: number | null
          recommendation: string | null
          scheduled_at: string | null
          scores: Json | null
          strengths: string | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          completed_at?: string | null
          concerns?: string | null
          created_at?: string
          id?: string
          interview_type?: string | null
          interviewer_id: string
          notes?: string | null
          overall_rating?: number | null
          recommendation?: string | null
          scheduled_at?: string | null
          scores?: Json | null
          strengths?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          completed_at?: string | null
          concerns?: string | null
          created_at?: string
          id?: string
          interview_type?: string | null
          interviewer_id?: string
          notes?: string | null
          overall_rating?: number | null
          recommendation?: string | null
          scheduled_at?: string | null
          scores?: Json | null
          strengths?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_scorecards_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "job_applicants"
            referencedColumns: ["id"]
          },
        ]
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
          updated_by: string | null
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
          updated_by?: string | null
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
          updated_by?: string | null
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
      job_applicants: {
        Row: {
          applicant_number: string
          cover_letter: string | null
          created_at: string
          current_stage: string | null
          email: string
          first_name: string
          hired_at: string | null
          id: string
          is_archived: boolean | null
          job_id: string
          last_name: string
          linkedin_url: string | null
          notes: string | null
          offer_details: Json | null
          overall_score: number | null
          phone: string | null
          portfolio_url: string | null
          rating: number | null
          referral_source: string | null
          rejected_reason: string | null
          resume_url: string | null
          source: string | null
          stage_updated_at: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          applicant_number: string
          cover_letter?: string | null
          created_at?: string
          current_stage?: string | null
          email: string
          first_name: string
          hired_at?: string | null
          id?: string
          is_archived?: boolean | null
          job_id: string
          last_name: string
          linkedin_url?: string | null
          notes?: string | null
          offer_details?: Json | null
          overall_score?: number | null
          phone?: string | null
          portfolio_url?: string | null
          rating?: number | null
          referral_source?: string | null
          rejected_reason?: string | null
          resume_url?: string | null
          source?: string | null
          stage_updated_at?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          applicant_number?: string
          cover_letter?: string | null
          created_at?: string
          current_stage?: string | null
          email?: string
          first_name?: string
          hired_at?: string | null
          id?: string
          is_archived?: boolean | null
          job_id?: string
          last_name?: string
          linkedin_url?: string | null
          notes?: string | null
          offer_details?: Json | null
          overall_score?: number | null
          phone?: string | null
          portfolio_url?: string | null
          rating?: number | null
          referral_source?: string | null
          rejected_reason?: string | null
          resume_url?: string | null
          source?: string | null
          stage_updated_at?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applicants_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applicants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          applications_count: number | null
          benefits: string | null
          closes_at: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string
          employment_type: string | null
          experience_level: string | null
          hiring_manager_id: string | null
          id: string
          location: string | null
          published_at: string | null
          recruiter_id: string | null
          requirements: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          applications_count?: number | null
          benefits?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description: string
          employment_type?: string | null
          experience_level?: string | null
          hiring_manager_id?: string | null
          id?: string
          location?: string | null
          published_at?: string | null
          recruiter_id?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          applications_count?: number | null
          benefits?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string
          employment_type?: string | null
          experience_level?: string | null
          hiring_manager_id?: string | null
          id?: string
          location?: string | null
          published_at?: string | null
          recruiter_id?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          current_step: number | null
          entered_at: string
          exit_reason: string | null
          id: string
          journey_id: string
          lead_id: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          current_step?: number | null
          entered_at?: string
          exit_reason?: string | null
          id?: string
          journey_id: string
          lead_id?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          current_step?: number | null
          entered_at?: string
          exit_reason?: string | null
          id?: string
          journey_id?: string
          lead_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_enrollments_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "marketing_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          content: Json | null
          conversions: number | null
          created_at: string
          created_by: string | null
          form_id: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          visits: number | null
        }
        Insert: {
          content?: Json | null
          conversions?: number | null
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          visits?: number | null
        }
        Update: {
          content?: Json | null
          conversions?: number | null
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_insights: string | null
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          estimated_value: number | null
          first_touch_source: string | null
          id: string
          last_scored_at: string | null
          last_touch_source: string | null
          lead_score: number | null
          notes: string | null
          score_breakdown: Json | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tenant_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ai_insights?: string | null
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_value?: number | null
          first_touch_source?: string | null
          id?: string
          last_scored_at?: string | null
          last_touch_source?: string | null
          lead_score?: number | null
          notes?: string | null
          score_breakdown?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ai_insights?: string | null
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_value?: number | null
          first_touch_source?: string | null
          id?: string
          last_scored_at?: string | null
          last_touch_source?: string | null
          lead_score?: number | null
          notes?: string | null
          score_breakdown?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
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
      learning_courses: {
        Row: {
          category: string
          content: string | null
          created_at: string
          created_by: string
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          instructor: string | null
          is_active: boolean | null
          level: string | null
          modules_count: number | null
          tags: string[] | null
          team_type: string
          tenant_id: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          level?: string | null
          modules_count?: number | null
          tags?: string[] | null
          team_type?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          level?: string | null
          modules_count?: number | null
          tags?: string[] | null
          team_type?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          completed_at: string | null
          completed_modules: number | null
          course_id: string
          created_at: string
          id: string
          last_accessed_at: string | null
          notes: string | null
          progress_percent: number | null
          started_at: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_modules?: number | null
          course_id: string
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          notes?: string | null
          progress_percent?: number | null
          started_at?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_modules?: number | null
          course_id?: string
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          notes?: string | null
          progress_percent?: number | null
          started_at?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          adjustment_days: number | null
          carryover_days: number | null
          created_at: string
          entitled_days: number
          id: string
          notes: string | null
          pending_days: number | null
          policy_id: string
          tenant_id: string | null
          updated_at: string
          used_days: number | null
          user_id: string
          year: number
        }
        Insert: {
          adjustment_days?: number | null
          carryover_days?: number | null
          created_at?: string
          entitled_days: number
          id?: string
          notes?: string | null
          pending_days?: number | null
          policy_id: string
          tenant_id?: string | null
          updated_at?: string
          used_days?: number | null
          user_id: string
          year: number
        }
        Update: {
          adjustment_days?: number | null
          carryover_days?: number | null
          created_at?: string
          entitled_days?: number
          id?: string
          notes?: string | null
          pending_days?: number | null
          policy_id?: string
          tenant_id?: string | null
          updated_at?: string
          used_days?: number | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "leave_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          carryover_allowed: boolean | null
          created_at: string
          days_per_year: number
          description: string | null
          id: string
          is_active: boolean | null
          leave_type: string
          max_carryover_days: number | null
          min_notice_days: number | null
          name: string
          requires_approval: boolean | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          carryover_allowed?: boolean | null
          created_at?: string
          days_per_year: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          leave_type: string
          max_carryover_days?: number | null
          min_notice_days?: number | null
          name: string
          requires_approval?: boolean | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          carryover_allowed?: boolean | null
          created_at?: string
          days_per_year?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          leave_type?: string
          max_carryover_days?: number | null
          min_notice_days?: number | null
          name?: string
          requires_approval?: boolean | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days_requested: number
          end_date: string
          half_day_type: string | null
          id: string
          is_half_day: boolean | null
          policy_id: string
          reason: string | null
          rejection_reason: string | null
          request_number: string
          start_date: string
          status: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_requested: number
          end_date: string
          half_day_type?: string | null
          id?: string
          is_half_day?: boolean | null
          policy_id: string
          reason?: string | null
          rejection_reason?: string | null
          request_number: string
          start_date: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_requested?: number
          end_date?: string
          half_day_type?: string | null
          id?: string
          is_half_day?: boolean | null
          policy_id?: string
          reason?: string | null
          rejection_reason?: string | null
          request_number?: string
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "leave_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_accounts: {
        Row: {
          account_code: string | null
          balance_type: string | null
          bank_account_number: string | null
          bank_name: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          credit_days: number | null
          credit_limit: number | null
          current_balance: number | null
          group_id: string | null
          gst_registration_type: string | null
          gstin: string | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          is_bank_account: boolean | null
          name: string
          opening_balance: number | null
          opening_balance_type: string | null
          pan_number: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_code?: string | null
          balance_type?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          current_balance?: number | null
          group_id?: string | null
          gst_registration_type?: string | null
          gstin?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_bank_account?: boolean | null
          name: string
          opening_balance?: number | null
          opening_balance_type?: string | null
          pan_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string | null
          balance_type?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          current_balance?: number | null
          group_id?: string | null
          gst_registration_type?: string | null
          gstin?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_bank_account?: boolean | null
          name?: string
          opening_balance?: number | null
          opening_balance_type?: string | null
          pan_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_accounts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "account_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_accounts_tenant_id_fkey"
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
      license_plan_modules: {
        Row: {
          module_key: string
          plan_id: string
        }
        Insert: {
          module_key: string
          plan_id: string
        }
        Update: {
          module_key?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_plan_modules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "license_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      license_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          price_monthly: number
          seat_cap: number | null
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          price_monthly?: number
          seat_cap?: number | null
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          price_monthly?: number
          seat_cap?: number | null
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          conversions_count: number | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          leads_count: number | null
          name: string
          spent: number | null
          start_date: string | null
          status: string
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          conversions_count?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          leads_count?: number | null
          name: string
          spent?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          conversions_count?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          leads_count?: number | null
          name?: string
          spent?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content: {
        Row: {
          author: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          status: string
          tenant_id: string | null
          title: string
          type: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          author?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          status?: string
          tenant_id?: string | null
          title: string
          type?: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          author?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: string
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_journeys: {
        Row: {
          completions: number | null
          created_at: string
          created_by: string | null
          description: string | null
          enrollments: number | null
          id: string
          name: string
          status: string | null
          steps: Json
          tenant_id: string | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          completions?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enrollments?: number | null
          id?: string
          name: string
          status?: string | null
          steps: Json
          tenant_id?: string | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          completions?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enrollments?: number | null
          id?: string
          name?: string
          status?: string | null
          steps?: Json
          tenant_id?: string | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_journeys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_contacts: {
        Row: {
          beat: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          last_contact_date: string | null
          name: string
          notes: string | null
          outlet: string | null
          phone: string | null
          role: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          beat?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          name: string
          notes?: string | null
          outlet?: string | null
          phone?: string | null
          role?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          beat?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          outlet?: string | null
          phone?: string | null
          role?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_contacts_tenant_id_fkey"
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
      offer_letters: {
        Row: {
          additional_terms: string | null
          applicant_id: string
          benefits: Json | null
          created_at: string
          created_by: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          job_id: string
          responded_at: string | null
          salary: number
          salary_currency: string | null
          sent_at: string | null
          signed_document_url: string | null
          start_date: string | null
          status: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          additional_terms?: string | null
          applicant_id: string
          benefits?: Json | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          job_id: string
          responded_at?: string | null
          salary: number
          salary_currency?: string | null
          sent_at?: string | null
          signed_document_url?: string | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          additional_terms?: string | null
          applicant_id?: string
          benefits?: Json | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          job_id?: string
          responded_at?: string | null
          salary?: number
          salary_currency?: string | null
          sent_at?: string | null
          signed_document_url?: string | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_letters_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "job_applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      offering_problem_area_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          offering_id: string
          offering_type: string
          problem_area_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          offering_id: string
          offering_type: string
          problem_area_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          offering_id?: string
          offering_type?: string
          problem_area_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offering_problem_area_mappings_problem_area_id_fkey"
            columns: ["problem_area_id"]
            isOneToOne: false
            referencedRelation: "offerings_problem_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offering_problem_area_mappings_tenant_id_fkey"
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
          ai_enriched_data: Json | null
          certifications: string[] | null
          created_at: string
          created_by: string
          description: string | null
          employee_count: string | null
          founded_year: number | null
          headquarters: string | null
          id: string
          key_products: string[] | null
          last_enriched_at: string | null
          logo_url: string | null
          market_cap: string | null
          name: string
          partnership_level: string | null
          status: string | null
          tenant_id: string | null
          website: string | null
        }
        Insert: {
          ai_enriched_data?: Json | null
          certifications?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          employee_count?: string | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          key_products?: string[] | null
          last_enriched_at?: string | null
          logo_url?: string | null
          market_cap?: string | null
          name: string
          partnership_level?: string | null
          status?: string | null
          tenant_id?: string | null
          website?: string | null
        }
        Update: {
          ai_enriched_data?: Json | null
          certifications?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          employee_count?: string | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          key_products?: string[] | null
          last_enriched_at?: string | null
          logo_url?: string | null
          market_cap?: string | null
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
          attack_vectors: string[] | null
          compliance_frameworks: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_enriched_at: string | null
          mitigation_strategies: string[] | null
          name: string
          possible_impact: string | null
          recommended_controls: string[] | null
          risk_level: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          area_type?: string | null
          attack_vectors?: string[] | null
          compliance_frameworks?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_enriched_at?: string | null
          mitigation_strategies?: string[] | null
          name: string
          possible_impact?: string | null
          recommended_controls?: string[] | null
          risk_level?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          area_type?: string | null
          attack_vectors?: string[] | null
          compliance_frameworks?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_enriched_at?: string | null
          mitigation_strategies?: string[] | null
          name?: string
          possible_impact?: string | null
          recommended_controls?: string[] | null
          risk_level?: string | null
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
      offerings_products: {
        Row: {
          ai_enriched_data: Json | null
          awards: string[] | null
          category: string | null
          competitive_advantages: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_enriched_at: string | null
          market_position: string | null
          name: string
          oem_id: string | null
          status: string | null
          technology_id: string | null
          tenant_id: string | null
          unique_selling_points: string[] | null
          updated_at: string
        }
        Insert: {
          ai_enriched_data?: Json | null
          awards?: string[] | null
          category?: string | null
          competitive_advantages?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_enriched_at?: string | null
          market_position?: string | null
          name: string
          oem_id?: string | null
          status?: string | null
          technology_id?: string | null
          tenant_id?: string | null
          unique_selling_points?: string[] | null
          updated_at?: string
        }
        Update: {
          ai_enriched_data?: Json | null
          awards?: string[] | null
          category?: string | null
          competitive_advantages?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_enriched_at?: string | null
          market_position?: string | null
          name?: string
          oem_id?: string | null
          status?: string | null
          technology_id?: string | null
          tenant_id?: string | null
          unique_selling_points?: string[] | null
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
      offerings_technologies: {
        Row: {
          adoption_rate: string | null
          ai_enriched_data: Json | null
          benefits: string[] | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_enriched_at: string | null
          limitations: string[] | null
          market_trends: string | null
          name: string
          status: string | null
          tenant_id: string | null
          use_cases: string[] | null
          vendor: string | null
        }
        Insert: {
          adoption_rate?: string | null
          ai_enriched_data?: Json | null
          benefits?: string[] | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_enriched_at?: string | null
          limitations?: string[] | null
          market_trends?: string | null
          name: string
          status?: string | null
          tenant_id?: string | null
          use_cases?: string[] | null
          vendor?: string | null
        }
        Update: {
          adoption_rate?: string | null
          ai_enriched_data?: Json | null
          benefits?: string[] | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_enriched_at?: string | null
          limitations?: string[] | null
          market_trends?: string | null
          name?: string
          status?: string | null
          tenant_id?: string | null
          use_cases?: string[] | null
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
          core_team: Json | null
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
          management_team: Json | null
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
          core_team?: Json | null
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
          management_team?: Json | null
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
          core_team?: Json | null
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
          management_team?: Json | null
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
      organization_support_config: {
        Row: {
          created_at: string
          id: string
          msa_document_url: string | null
          organization_id: string
          sla_document_url: string | null
          support_end_date: string | null
          support_level: string | null
          support_start_date: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          msa_document_url?: string | null
          organization_id: string
          sla_document_url?: string | null
          support_end_date?: string | null
          support_level?: string | null
          support_start_date?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          msa_document_url?: string | null
          organization_id?: string
          sla_document_url?: string | null
          support_end_date?: string | null
          support_level?: string | null
          support_start_date?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_support_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_support_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_support_solutions: {
        Row: {
          category: string | null
          created_at: string
          escalation_matrix_id: string | null
          id: string
          is_active: boolean | null
          issue_types: string[] | null
          organization_id: string
          service_name: string | null
          solution_name: string
          support_period_end: string | null
          support_period_start: string | null
          support_tier: string | null
          support_type: string | null
          tenant_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          escalation_matrix_id?: string | null
          id?: string
          is_active?: boolean | null
          issue_types?: string[] | null
          organization_id: string
          service_name?: string | null
          solution_name: string
          support_period_end?: string | null
          support_period_start?: string | null
          support_tier?: string | null
          support_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          escalation_matrix_id?: string | null
          id?: string
          is_active?: boolean | null
          issue_types?: string[] | null
          organization_id?: string
          service_name?: string | null
          solution_name?: string
          support_period_end?: string | null
          support_period_start?: string | null
          support_tier?: string | null
          support_type?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_support_solutions_escalation_matrix_id_fkey"
            columns: ["escalation_matrix_id"]
            isOneToOne: false
            referencedRelation: "escalation_matrix_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_support_solutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_support_solutions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_support_types: {
        Row: {
          created_at: string
          custom_features: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          price: number | null
          resolution_hours: number | null
          response_hours: number | null
          tier: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_features?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          price?: number | null
          resolution_hours?: number | null
          response_hours?: number | null
          tier?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_features?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          price?: number | null
          resolution_hours?: number | null
          response_hours?: number | null
          tier?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_support_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
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
      platform_integrations: {
        Row: {
          auto_enable_tier: string | null
          available_to_tenants: boolean
          category: Database["public"]["Enums"]["platform_integration_category"]
          config: Json
          created_at: string
          description: string | null
          health_status: string
          id: string
          is_enabled: boolean
          key: string
          last_synced_at: string | null
          name: string
          secret_ref: string | null
          updated_at: string
        }
        Insert: {
          auto_enable_tier?: string | null
          available_to_tenants?: boolean
          category?: Database["public"]["Enums"]["platform_integration_category"]
          config?: Json
          created_at?: string
          description?: string | null
          health_status?: string
          id?: string
          is_enabled?: boolean
          key: string
          last_synced_at?: string | null
          name: string
          secret_ref?: string | null
          updated_at?: string
        }
        Update: {
          auto_enable_tier?: string | null
          available_to_tenants?: boolean
          category?: Database["public"]["Enums"]["platform_integration_category"]
          config?: Json
          created_at?: string
          description?: string | null
          health_status?: string
          id?: string
          is_enabled?: boolean
          key?: string
          last_synced_at?: string | null
          name?: string
          secret_ref?: string | null
          updated_at?: string
        }
        Relationships: []
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
      post_sale_workflow_stages: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          stage_id: string
          stage_name: string
          stage_order: number
          status: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          stage_id: string
          stage_name: string
          stage_order: number
          status?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          stage_id?: string
          stage_name?: string
          stage_order?: number
          status?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_sale_workflow_stages_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "post_sale_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      post_sale_workflows: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          current_stage: string | null
          deal_id: string
          id: string
          includes_managed_service: boolean | null
          includes_renewal: boolean | null
          includes_support: boolean | null
          metadata: Json | null
          order_type: string | null
          payment_received: number | null
          payment_status: string | null
          stage_progress: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["post_sale_workflow_status"]
          tenant_id: string | null
          total_amount: number | null
          updated_at: string
          workflow_type: Database["public"]["Enums"]["post_sale_workflow_type"]
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_stage?: string | null
          deal_id: string
          id?: string
          includes_managed_service?: boolean | null
          includes_renewal?: boolean | null
          includes_support?: boolean | null
          metadata?: Json | null
          order_type?: string | null
          payment_received?: number | null
          payment_status?: string | null
          stage_progress?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["post_sale_workflow_status"]
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string
          workflow_type: Database["public"]["Enums"]["post_sale_workflow_type"]
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_stage?: string | null
          deal_id?: string
          id?: string
          includes_managed_service?: boolean | null
          includes_renewal?: boolean | null
          includes_support?: boolean | null
          metadata?: Json | null
          order_type?: string | null
          payment_received?: number | null
          payment_status?: string | null
          stage_progress?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["post_sale_workflow_status"]
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string
          workflow_type?: Database["public"]["Enums"]["post_sale_workflow_type"]
        }
        Relationships: [
          {
            foreignKeyName: "post_sale_workflows_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_sale_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_date: string | null
          id: string
          location: string | null
          name: string
          role: string | null
          status: string | null
          tenant_id: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          name: string
          role?: string | null
          status?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          name?: string
          role?: string | null
          status?: string | null
          tenant_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_media_coverage: {
        Row: {
          author_name: string | null
          coverage_date: string | null
          created_at: string
          created_by: string
          headline: string
          id: string
          outlet: string | null
          reach: number | null
          sentiment: string | null
          tenant_id: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          author_name?: string | null
          coverage_date?: string | null
          created_at?: string
          created_by: string
          headline: string
          id?: string
          outlet?: string | null
          reach?: number | null
          sentiment?: string | null
          tenant_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          author_name?: string | null
          coverage_date?: string | null
          created_at?: string
          created_by?: string
          headline?: string
          id?: string
          outlet?: string | null
          reach?: number | null
          sentiment?: string | null
          tenant_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pr_media_coverage_tenant_id_fkey"
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
      product_catalog: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          sku: string | null
          specifications: Json | null
          tenant_id: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          sku?: string | null
          specifications?: Json | null
          tenant_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          sku?: string | null
          specifications?: Json | null
          tenant_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_oems: {
        Row: {
          created_at: string
          created_by: string
          id: string
          oem_id: string
          product_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          oem_id: string
          product_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          oem_id?: string
          product_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_oems_oem_id_fkey"
            columns: ["oem_id"]
            isOneToOne: false
            referencedRelation: "offerings_oems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_oems_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "offerings_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_oems_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recommendation_steps: {
        Row: {
          created_at: string
          created_by: string | null
          deliverables: string[] | null
          description: string | null
          details: string | null
          duration_estimate: string | null
          id: string
          is_active: boolean | null
          prerequisites: string[] | null
          product_id: string
          resources: string[] | null
          step_order: number
          step_type: string
          team_type: string
          tenant_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deliverables?: string[] | null
          description?: string | null
          details?: string | null
          duration_estimate?: string | null
          id?: string
          is_active?: boolean | null
          prerequisites?: string[] | null
          product_id: string
          resources?: string[] | null
          step_order?: number
          step_type: string
          team_type: string
          tenant_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deliverables?: string[] | null
          description?: string | null
          details?: string | null
          duration_estimate?: string | null
          id?: string
          is_active?: boolean | null
          prerequisites?: string[] | null
          product_id?: string
          resources?: string[] | null
          step_order?: number
          step_type?: string
          team_type?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_recommendation_steps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "offerings_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recommendation_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_technologies: {
        Row: {
          created_at: string
          created_by: string
          id: string
          product_id: string
          technology_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          product_id: string
          technology_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          product_id?: string
          technology_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_technologies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "offerings_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_technologies_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "offerings_technologies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_technologies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anniversary_date: string | null
          avatar_config: Json | null
          avatar_style: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          department: string | null
          email: string | null
          employee_code: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name: string | null
          github_url: string | null
          hire_date: string | null
          hobbies: string[] | null
          id: string
          is_super_admin: boolean | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          manager_id: string | null
          phone: string | null
          responsibilities: string[] | null
          sales_sub_team: Database["public"]["Enums"]["sales_sub_team"] | null
          state: string | null
          tenant_id: string | null
          twitter_url: string | null
          updated_at: string
          user_category: Database["public"]["Enums"]["user_category"] | null
          user_id: string
        }
        Insert: {
          anniversary_date?: string | null
          avatar_config?: Json | null
          avatar_style?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name?: string | null
          github_url?: string | null
          hire_date?: string | null
          hobbies?: string[] | null
          id?: string
          is_super_admin?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          manager_id?: string | null
          phone?: string | null
          responsibilities?: string[] | null
          sales_sub_team?: Database["public"]["Enums"]["sales_sub_team"] | null
          state?: string | null
          tenant_id?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_category?: Database["public"]["Enums"]["user_category"] | null
          user_id: string
        }
        Update: {
          anniversary_date?: string | null
          avatar_config?: Json | null
          avatar_style?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          full_name?: string | null
          github_url?: string | null
          hire_date?: string | null
          hobbies?: string[] | null
          id?: string
          is_super_admin?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          manager_id?: string | null
          phone?: string | null
          responsibilities?: string[] | null
          sales_sub_team?: Database["public"]["Enums"]["sales_sub_team"] | null
          state?: string | null
          tenant_id?: string | null
          twitter_url?: string | null
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
      project_documents: {
        Row: {
          ai_prompt: string | null
          content: string | null
          created_at: string
          created_by: string
          document_type: string
          file_url: string | null
          id: string
          is_ai_generated: boolean | null
          project_id: string
          title: string
          updated_at: string
          version: number | null
        }
        Insert: {
          ai_prompt?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          document_type: string
          file_url?: string | null
          id?: string
          is_ai_generated?: boolean | null
          project_id: string
          title: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          ai_prompt?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          document_type?: string
          file_url?: string | null
          id?: string
          is_ai_generated?: boolean | null
          project_id?: string
          title?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          phase_id: string | null
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
          phase_id?: string | null
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
          phase_id?: string | null
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          created_at: string
          deliverables: Json | null
          description: string | null
          duration_weeks: number | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          name: string
          phase_number: number
          progress: number | null
          project_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deliverables?: Json | null
          description?: string | null
          duration_weeks?: number | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          phase_number: number
          progress?: number | null
          project_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deliverables?: Json | null
          description?: string | null
          duration_weeks?: number | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          phase_number?: number
          progress?: number | null
          project_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_products: {
        Row: {
          configuration: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
          product_id: string | null
          product_type: string
          project_id: string
          quantity: number | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          configuration?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          product_id?: string | null
          product_type: string
          project_id: string
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          configuration?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          product_id?: string | null
          product_type?: string
          project_id?: string
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_raci: {
        Row: {
          accountable_id: string | null
          activity_name: string
          consulted_ids: string[] | null
          created_at: string
          id: string
          informed_ids: string[] | null
          phase_id: string | null
          project_id: string
          responsible_id: string | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          accountable_id?: string | null
          activity_name: string
          consulted_ids?: string[] | null
          created_at?: string
          id?: string
          informed_ids?: string[] | null
          phase_id?: string | null
          project_id: string
          responsible_id?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          accountable_id?: string | null
          activity_name?: string
          consulted_ids?: string[] | null
          created_at?: string
          id?: string
          informed_ids?: string[] | null
          phase_id?: string | null
          project_id?: string
          responsible_id?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_raci_accountable_id_fkey"
            columns: ["accountable_id"]
            isOneToOne: false
            referencedRelation: "project_stakeholders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_raci_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_raci_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_raci_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "project_stakeholders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_raci_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stakeholders: {
        Row: {
          contact_id: string | null
          created_at: string
          designation: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          project_id: string
          role: string
          stakeholder_type: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          project_id: string
          role: string
          stakeholder_type: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          project_id?: string
          role?: string
          stakeholder_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stakeholders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stakeholders_project_id_fkey"
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
          phase_id: string | null
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
          phase_id?: string | null
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
          phase_id?: string | null
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
            foreignKeyName: "project_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
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
          ai_analytics: Json | null
          ai_documents: Json | null
          ai_enriched_plan: Json | null
          budget: number | null
          client_name: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          deliverables: Json | null
          description: string | null
          duration_weeks: number | null
          end_date: string | null
          id: string
          name: string
          organization_id: string | null
          priority: string | null
          progress: number | null
          project_category: string | null
          project_manager_id: string | null
          project_number: string
          project_type: string | null
          scope_exclusions: Json | null
          scope_inclusions: Json | null
          spent_amount: number | null
          start_date: string | null
          status: string
          tags: string[] | null
          tenant_id: string | null
          total_estimated_hours: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          ai_analytics?: Json | null
          ai_documents?: Json | null
          ai_enriched_plan?: Json | null
          budget?: number | null
          client_name?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          deliverables?: Json | null
          description?: string | null
          duration_weeks?: number | null
          end_date?: string | null
          id?: string
          name: string
          organization_id?: string | null
          priority?: string | null
          progress?: number | null
          project_category?: string | null
          project_manager_id?: string | null
          project_number: string
          project_type?: string | null
          scope_exclusions?: Json | null
          scope_inclusions?: Json | null
          spent_amount?: number | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string | null
          total_estimated_hours?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          ai_analytics?: Json | null
          ai_documents?: Json | null
          ai_enriched_plan?: Json | null
          budget?: number | null
          client_name?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          deliverables?: Json | null
          description?: string | null
          duration_weeks?: number | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          priority?: string | null
          progress?: number | null
          project_category?: string | null
          project_manager_id?: string | null
          project_number?: string
          project_type?: string | null
          scope_exclusions?: Json | null
          scope_inclusions?: Json | null
          spent_amount?: number | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string | null
          total_estimated_hours?: number | null
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
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
      remote_session_participants: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          participant_email: string | null
          participant_name: string
          role: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          participant_email?: string | null
          participant_name: string
          role?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          participant_email?: string | null
          participant_name?: string
          role?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remote_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "remote_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_session_recordings: {
        Row: {
          created_at: string
          created_by: string
          duration_seconds: number | null
          file_size_bytes: number | null
          format: string | null
          id: string
          is_public: boolean | null
          recording_name: string
          recording_url: string
          session_id: string
          thumbnail_url: string | null
          transcript: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          is_public?: boolean | null
          recording_name: string
          recording_url: string
          session_id: string
          thumbnail_url?: string | null
          transcript?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          format?: string | null
          id?: string
          is_public?: boolean | null
          recording_name?: string
          recording_url?: string
          session_id?: string
          thumbnail_url?: string | null
          transcript?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "remote_session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "remote_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      remote_sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          host_id: string
          id: string
          meeting_link: string | null
          meeting_platform: string | null
          notes: string | null
          organization_id: string | null
          recording_available: boolean | null
          recording_url: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          session_code: string
          session_type: string | null
          status: string | null
          tenant_id: string | null
          ticket_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          host_id: string
          id?: string
          meeting_link?: string | null
          meeting_platform?: string | null
          notes?: string | null
          organization_id?: string | null
          recording_available?: boolean | null
          recording_url?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          session_code: string
          session_type?: string | null
          status?: string | null
          tenant_id?: string | null
          ticket_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          host_id?: string
          id?: string
          meeting_link?: string | null
          meeting_platform?: string | null
          notes?: string | null
          organization_id?: string | null
          recording_available?: boolean | null
          recording_url?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          session_code?: string
          session_type?: string | null
          status?: string | null
          tenant_id?: string | null
          ticket_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remote_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remote_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remote_sessions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
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
      rotten_deal_settings: {
        Row: {
          created_at: string
          id: string
          max_days: number
          stage: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          max_days?: number
          stage: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          max_days?: number
          stage?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotten_deal_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_automations: {
        Row: {
          actions: Json | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          trigger_conditions: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          trigger_conditions?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_forecasts: {
        Row: {
          ai_analysis: string | null
          confidence_score: number | null
          created_at: string
          factors: Json | null
          forecast_period: string
          id: string
          period_end: string
          period_start: string
          predicted_revenue: number | null
          tenant_id: string | null
          updated_at: string
          user_id: string
          weighted_pipeline: number | null
        }
        Insert: {
          ai_analysis?: string | null
          confidence_score?: number | null
          created_at?: string
          factors?: Json | null
          forecast_period: string
          id?: string
          period_end: string
          period_start: string
          predicted_revenue?: number | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
          weighted_pipeline?: number | null
        }
        Update: {
          ai_analysis?: string | null
          confidence_score?: number | null
          created_at?: string
          factors?: Json | null
          forecast_period?: string
          id?: string
          period_end?: string
          period_start?: string
          predicted_revenue?: number | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
          weighted_pipeline?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_funnel_workflows: {
        Row: {
          auto_progress: boolean | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          notify_on_progress: boolean | null
          required_fields: Json | null
          required_meddic_score: number | null
          stage_from: string
          stage_to: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          auto_progress?: boolean | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notify_on_progress?: boolean | null
          required_fields?: Json | null
          required_meddic_score?: number | null
          stage_from: string
          stage_to: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_progress?: boolean | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notify_on_progress?: boolean | null
          required_fields?: Json | null
          required_meddic_score?: number | null
          stage_from?: string
          stage_to?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_funnel_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_targets: {
        Row: {
          bottom_line_target: number
          created_at: string
          created_by: string | null
          currency: string | null
          fresh_sales_bottom_line: number
          fresh_sales_bottom_line_calculated: number | null
          fresh_sales_bottom_line_type: string | null
          fresh_sales_top_line: number
          id: string
          incentive_cap_calculated: number | null
          incentive_cap_type: string | null
          incentive_eligibility_cap: number
          notes: string | null
          period_end: string
          period_start: string
          renewal_bottom_line: number
          renewal_bottom_line_calculated: number | null
          renewal_bottom_line_type: string | null
          renewal_top_line: number
          target_period: string
          tenant_id: string | null
          top_line_target: number
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          bottom_line_target?: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          fresh_sales_bottom_line?: number
          fresh_sales_bottom_line_calculated?: number | null
          fresh_sales_bottom_line_type?: string | null
          fresh_sales_top_line?: number
          id?: string
          incentive_cap_calculated?: number | null
          incentive_cap_type?: string | null
          incentive_eligibility_cap?: number
          notes?: string | null
          period_end: string
          period_start: string
          renewal_bottom_line?: number
          renewal_bottom_line_calculated?: number | null
          renewal_bottom_line_type?: string | null
          renewal_top_line?: number
          target_period?: string
          tenant_id?: string | null
          top_line_target?: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          bottom_line_target?: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          fresh_sales_bottom_line?: number
          fresh_sales_bottom_line_calculated?: number | null
          fresh_sales_bottom_line_type?: string | null
          fresh_sales_top_line?: number
          id?: string
          incentive_cap_calculated?: number | null
          incentive_cap_type?: string | null
          incentive_eligibility_cap?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          renewal_bottom_line?: number
          renewal_bottom_line_calculated?: number | null
          renewal_bottom_line_type?: string | null
          renewal_top_line?: number
          target_period?: string
          tenant_id?: string | null
          top_line_target?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_targets_tenant_id_fkey"
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
      sales_territories: {
        Row: {
          country: string | null
          created_at: string
          created_by: string | null
          criteria: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          region: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          criteria?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          region?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          criteria?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          region?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_territories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      software_dependencies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          language: string
          license_type: string
          name: string
          notes: string
          risk_level: string
          status: string
          tenant_id: string | null
          updated_at: string
          used_in: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          license_type?: string
          name: string
          notes?: string
          risk_level?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          used_in?: string
          version?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          license_type?: string
          name?: string
          notes?: string
          risk_level?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          used_in?: string
          version?: string
        }
        Relationships: []
      }
      solution_documentation: {
        Row: {
          additional_notes: string | null
          approved_by: string | null
          assigned_to: string | null
          branding: Json | null
          created_at: string
          created_by: string
          customer_name: string | null
          doc_type: string
          id: string
          milestones: Json | null
          prepared_by: string | null
          problem_statement: string | null
          product_id: string | null
          proposed_solution: string | null
          raci_matrix: Json | null
          reviewed_by: string | null
          revision_history: Json | null
          scope_exclusions: string[] | null
          scope_inclusions: string[] | null
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          use_cases: Json | null
          version_number: string | null
        }
        Insert: {
          additional_notes?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          branding?: Json | null
          created_at?: string
          created_by: string
          customer_name?: string | null
          doc_type: string
          id?: string
          milestones?: Json | null
          prepared_by?: string | null
          problem_statement?: string | null
          product_id?: string | null
          proposed_solution?: string | null
          raci_matrix?: Json | null
          reviewed_by?: string | null
          revision_history?: Json | null
          scope_exclusions?: string[] | null
          scope_inclusions?: string[] | null
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          use_cases?: Json | null
          version_number?: string | null
        }
        Update: {
          additional_notes?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          branding?: Json | null
          created_at?: string
          created_by?: string
          customer_name?: string | null
          doc_type?: string
          id?: string
          milestones?: Json | null
          prepared_by?: string | null
          problem_statement?: string | null
          product_id?: string | null
          proposed_solution?: string | null
          raci_matrix?: Json | null
          reviewed_by?: string | null
          revision_history?: Json | null
          scope_exclusions?: string[] | null
          scope_inclusions?: string[] | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          use_cases?: Json | null
          version_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_documentation_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "offerings_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_documentation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_expiry_notifications: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          notes: string | null
          notification_type: string
          organization_id: string | null
          sent_at: string
          sent_to: string[] | null
          subscription_id: string | null
          tenant_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          notification_type: string
          organization_id?: string | null
          sent_at?: string
          sent_to?: string[] | null
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          notification_type?: string
          organization_id?: string | null
          sent_at?: string
          sent_to?: string[] | null
          subscription_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_expiry_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_expiry_notifications_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "solution_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_expiry_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_subscriptions: {
        Row: {
          annual_value: number | null
          created_at: string
          created_by: string
          expiry_date: string
          id: string
          license_count: number | null
          notes: string | null
          organization_id: string | null
          reseller_id: string | null
          solution_name: string
          start_date: string
          status: string | null
          tenant_id: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          annual_value?: number | null
          created_at?: string
          created_by: string
          expiry_date: string
          id?: string
          license_count?: number | null
          notes?: string | null
          organization_id?: string | null
          reseller_id?: string | null
          solution_name: string
          start_date: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          annual_value?: number | null
          created_at?: string
          created_by?: string
          expiry_date?: string
          id?: string
          license_count?: number | null
          notes?: string | null
          organization_id?: string | null
          reseller_id?: string | null
          solution_name?: string
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_subscriptions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_subscriptions_tenant_id_fkey"
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
      stock_groups: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_group_id: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_group_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_group_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "stock_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          alias: string | null
          created_at: string | null
          created_by: string | null
          current_quantity: number | null
          current_rate: number | null
          current_value: number | null
          hsn_sac_id: string | null
          id: string
          is_active: boolean | null
          item_code: string | null
          maximum_quantity: number | null
          minimum_quantity: number | null
          name: string
          opening_quantity: number | null
          opening_rate: number | null
          opening_value: number | null
          primary_unit_id: string | null
          reorder_level: number | null
          standard_cost: number | null
          standard_selling_price: number | null
          stock_group_id: string | null
          tenant_id: string | null
          updated_at: string | null
          valuation_method: string | null
        }
        Insert: {
          alias?: string | null
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number | null
          current_rate?: number | null
          current_value?: number | null
          hsn_sac_id?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string | null
          maximum_quantity?: number | null
          minimum_quantity?: number | null
          name: string
          opening_quantity?: number | null
          opening_rate?: number | null
          opening_value?: number | null
          primary_unit_id?: string | null
          reorder_level?: number | null
          standard_cost?: number | null
          standard_selling_price?: number | null
          stock_group_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          valuation_method?: string | null
        }
        Update: {
          alias?: string | null
          created_at?: string | null
          created_by?: string | null
          current_quantity?: number | null
          current_rate?: number | null
          current_value?: number | null
          hsn_sac_id?: string | null
          id?: string
          is_active?: boolean | null
          item_code?: string | null
          maximum_quantity?: number | null
          minimum_quantity?: number | null
          name?: string
          opening_quantity?: number | null
          opening_rate?: number | null
          opening_value?: number | null
          primary_unit_id?: string | null
          reorder_level?: number | null
          standard_cost?: number | null
          standard_selling_price?: number | null
          stock_group_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_hsn_sac_id_fkey"
            columns: ["hsn_sac_id"]
            isOneToOne: false
            referencedRelation: "hsn_sac_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_primary_unit_id_fkey"
            columns: ["primary_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_stock_group_id_fkey"
            columns: ["stock_group_id"]
            isOneToOne: false
            referencedRelation: "stock_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          godown_id: string | null
          id: string
          narration: string | null
          quantity_in: number | null
          quantity_out: number | null
          rate: number | null
          running_quantity: number | null
          running_value: number | null
          stock_item_id: string | null
          tenant_id: string | null
          transaction_date: string
          transaction_type: string
          value: number | null
          voucher_id: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          godown_id?: string | null
          id?: string
          narration?: string | null
          quantity_in?: number | null
          quantity_out?: number | null
          rate?: number | null
          running_quantity?: number | null
          running_value?: number | null
          stock_item_id?: string | null
          tenant_id?: string | null
          transaction_date: string
          transaction_type: string
          value?: number | null
          voucher_id?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          godown_id?: string | null
          id?: string
          narration?: string | null
          quantity_in?: number | null
          quantity_out?: number | null
          rate?: number | null
          running_quantity?: number | null
          running_value?: number | null
          stock_item_id?: string | null
          tenant_id?: string | null
          transaction_date?: string
          transaction_type?: string
          value?: number | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_escalation_matrix: {
        Row: {
          created_at: string
          id: string
          level_1_email: string | null
          level_1_response_hours: number | null
          level_1_user_id: string | null
          level_2_email: string | null
          level_2_response_hours: number | null
          level_2_user_id: string | null
          level_3_email: string | null
          level_3_response_hours: number | null
          level_3_user_id: string | null
          organization_id: string
          solution_name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_1_email?: string | null
          level_1_response_hours?: number | null
          level_1_user_id?: string | null
          level_2_email?: string | null
          level_2_response_hours?: number | null
          level_2_user_id?: string | null
          level_3_email?: string | null
          level_3_response_hours?: number | null
          level_3_user_id?: string | null
          organization_id: string
          solution_name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level_1_email?: string | null
          level_1_response_hours?: number | null
          level_1_user_id?: string | null
          level_2_email?: string | null
          level_2_response_hours?: number | null
          level_2_user_id?: string | null
          level_3_email?: string | null
          level_3_response_hours?: number | null
          level_3_user_id?: string | null
          organization_id?: string
          solution_name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_escalation_matrix_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "alliance_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_escalation_matrix_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_slas: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: string
          resolution_hours: number
          response_hours: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: string
          resolution_hours: number
          response_hours: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: string
          resolution_hours?: number
          response_hours?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_slas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_type_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          resolution_hours: number | null
          response_hours: number | null
          tenant_id: string | null
          tier: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          resolution_hours?: number | null
          response_hours?: number | null
          tenant_id?: string | null
          tier?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          resolution_hours?: number | null
          response_hours?: number | null
          tenant_id?: string | null
          tier?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_type_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_tcs_rates: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          rate_company: number
          rate_individual: number
          rate_no_pan: number
          section_code: string
          section_description: string
          tenant_id: string | null
          threshold_amount: number | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          rate_company: number
          rate_individual: number
          rate_no_pan: number
          section_code: string
          section_description: string
          tenant_id?: string | null
          threshold_amount?: number | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          rate_company?: number
          rate_individual?: number
          rate_no_pan?: number
          section_code?: string
          section_description?: string
          tenant_id?: string | null
          threshold_amount?: number | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tds_tcs_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tds_tcs_transactions: {
        Row: {
          certificate_number: string | null
          cess_amount: number | null
          cess_rate: number | null
          challan_date: string | null
          challan_number: string | null
          created_at: string
          deductee_name: string | null
          deductee_pan: string | null
          deductee_type: string | null
          gross_amount: number
          id: string
          ledger_id: string | null
          notes: string | null
          payment_date: string | null
          section_code: string
          section_description: string | null
          status: string | null
          surcharge_amount: number | null
          surcharge_rate: number | null
          tax_amount: number
          tax_rate: number
          tenant_id: string | null
          total_tax: number
          transaction_date: string
          transaction_type: string
          updated_at: string
          voucher_id: string | null
        }
        Insert: {
          certificate_number?: string | null
          cess_amount?: number | null
          cess_rate?: number | null
          challan_date?: string | null
          challan_number?: string | null
          created_at?: string
          deductee_name?: string | null
          deductee_pan?: string | null
          deductee_type?: string | null
          gross_amount: number
          id?: string
          ledger_id?: string | null
          notes?: string | null
          payment_date?: string | null
          section_code: string
          section_description?: string | null
          status?: string | null
          surcharge_amount?: number | null
          surcharge_rate?: number | null
          tax_amount: number
          tax_rate: number
          tenant_id?: string | null
          total_tax: number
          transaction_date: string
          transaction_type: string
          updated_at?: string
          voucher_id?: string | null
        }
        Update: {
          certificate_number?: string | null
          cess_amount?: number | null
          cess_rate?: number | null
          challan_date?: string | null
          challan_number?: string | null
          created_at?: string
          deductee_name?: string | null
          deductee_pan?: string | null
          deductee_type?: string | null
          gross_amount?: number
          id?: string
          ledger_id?: string | null
          notes?: string | null
          payment_date?: string | null
          section_code?: string
          section_description?: string | null
          status?: string | null
          surcharge_amount?: number | null
          surcharge_rate?: number | null
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string | null
          total_tax?: number
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tds_tcs_transactions_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_tcs_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tds_tcs_transactions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chat_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
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
      template_pack_installations: {
        Row: {
          action: string
          created_at: string
          created_template_ids: string[]
          id: string
          installed_by: string | null
          is_rolled_back: boolean
          pack_role: string
          pack_version: string
          previous_version: string | null
          snapshot: Json
          template_count: number
          tenant_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          created_template_ids?: string[]
          id?: string
          installed_by?: string | null
          is_rolled_back?: boolean
          pack_role: string
          pack_version: string
          previous_version?: string | null
          snapshot?: Json
          template_count?: number
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_template_ids?: string[]
          id?: string
          installed_by?: string | null
          is_rolled_back?: boolean
          pack_role?: string
          pack_version?: string
          previous_version?: string | null
          snapshot?: Json
          template_count?: number
          tenant_id?: string
        }
        Relationships: []
      }
      template_permissions: {
        Row: {
          can_approve: boolean
          can_edit: boolean
          can_install: boolean
          created_at: string
          created_by: string | null
          id: string
          pack_role: string
          solution: string
          subject_type: string
          subject_value: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          can_approve?: boolean
          can_edit?: boolean
          can_install?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          pack_role?: string
          solution?: string
          subject_type: string
          subject_value: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          can_approve?: boolean
          can_edit?: boolean
          can_install?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          pack_role?: string
          solution?: string
          subject_type?: string
          subject_value?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
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
      tenant_licenses: {
        Row: {
          created_at: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["tenant_payment_status"]
          plan_id: string | null
          renews_at: string | null
          seats_licensed: number
          status: Database["public"]["Enums"]["tenant_license_status"]
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["tenant_payment_status"]
          plan_id?: string | null
          renews_at?: string | null
          seats_licensed?: number
          status?: Database["public"]["Enums"]["tenant_license_status"]
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["tenant_payment_status"]
          plan_id?: string | null
          renews_at?: string | null
          seats_licensed?: number
          status?: Database["public"]["Enums"]["tenant_license_status"]
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_licenses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "license_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_licenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      tenant_module_overrides: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          module_key: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          module_key: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          module_key?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_module_overrides_tenant_id_fkey"
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
      tender_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          tenant_id: string | null
          tender_id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          tenant_id?: string | null
          tender_id: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          tenant_id?: string | null
          tender_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_activities_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          notes: string | null
          tenant_id: string | null
          tender_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          tenant_id?: string | null
          tender_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          tenant_id?: string | null
          tender_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_team: {
        Row: {
          assigned_by: string
          created_at: string
          id: string
          role: string
          tenant_id: string | null
          tender_id: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          id?: string
          role: string
          tenant_id?: string | null
          tender_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string | null
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_team_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_team_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_workspace_sections: {
        Row: {
          ai_response: string | null
          compliance_status: string | null
          created_at: string
          edited_content: string | null
          id: string
          is_ai_generated: boolean | null
          requirement_text: string | null
          section_order: number
          section_title: string
          section_type: string
          status: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_response?: string | null
          compliance_status?: string | null
          created_at?: string
          edited_content?: string | null
          id?: string
          is_ai_generated?: boolean | null
          requirement_text?: string | null
          section_order?: number
          section_title: string
          section_type: string
          status?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_response?: string | null
          compliance_status?: string | null
          created_at?: string
          edited_content?: string | null
          id?: string
          is_ai_generated?: boolean | null
          requirement_text?: string | null
          section_order?: number
          section_title?: string
          section_type?: string
          status?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_workspace_sections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "tender_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_workspaces: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          customer_name: string | null
          exported_format: string | null
          final_content: string | null
          generated_content: Json | null
          id: string
          include_branding: boolean | null
          notes: string | null
          oem_name: string | null
          progress_percent: number | null
          requirements_text: string | null
          selected_ai_model: string | null
          solution_description: string | null
          solution_name: string | null
          source_file_name: string | null
          status: string
          tenant_id: string | null
          tender_id: string | null
          title: string
          updated_at: string
          workspace_number: string | null
          workspace_type: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          customer_name?: string | null
          exported_format?: string | null
          final_content?: string | null
          generated_content?: Json | null
          id?: string
          include_branding?: boolean | null
          notes?: string | null
          oem_name?: string | null
          progress_percent?: number | null
          requirements_text?: string | null
          selected_ai_model?: string | null
          solution_description?: string | null
          solution_name?: string | null
          source_file_name?: string | null
          status?: string
          tenant_id?: string | null
          tender_id?: string | null
          title: string
          updated_at?: string
          workspace_number?: string | null
          workspace_type?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string | null
          exported_format?: string | null
          final_content?: string | null
          generated_content?: Json | null
          id?: string
          include_branding?: boolean | null
          notes?: string | null
          oem_name?: string | null
          progress_percent?: number | null
          requirements_text?: string | null
          selected_ai_model?: string | null
          solution_description?: string | null
          solution_name?: string | null
          source_file_name?: string | null
          status?: string
          tenant_id?: string | null
          tender_id?: string | null
          title?: string
          updated_at?: string
          workspace_number?: string | null
          workspace_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_workspaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_workspaces_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          assigned_to: string | null
          awarded_date: string | null
          bid_security_required: boolean | null
          category: string | null
          contact_email: string | null
          contact_id: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          description: string | null
          documents_required: string[] | null
          eligibility_criteria: string | null
          emd_amount: number | null
          emd_submitted: boolean | null
          estimated_value: number | null
          id: string
          loss_reason: string | null
          notes: string | null
          opening_date: string | null
          organization_name: string | null
          publish_date: string | null
          source: Database["public"]["Enums"]["tender_source"] | null
          status: Database["public"]["Enums"]["tender_status"] | null
          submission_deadline: string | null
          technical_requirements: string | null
          tenant_id: string | null
          tender_number: string
          tender_portal_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          awarded_date?: string | null
          bid_security_required?: boolean | null
          category?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          description?: string | null
          documents_required?: string[] | null
          eligibility_criteria?: string | null
          emd_amount?: number | null
          emd_submitted?: boolean | null
          estimated_value?: number | null
          id?: string
          loss_reason?: string | null
          notes?: string | null
          opening_date?: string | null
          organization_name?: string | null
          publish_date?: string | null
          source?: Database["public"]["Enums"]["tender_source"] | null
          status?: Database["public"]["Enums"]["tender_status"] | null
          submission_deadline?: string | null
          technical_requirements?: string | null
          tenant_id?: string | null
          tender_number: string
          tender_portal_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          awarded_date?: string | null
          bid_security_required?: boolean | null
          category?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          description?: string | null
          documents_required?: string[] | null
          eligibility_criteria?: string | null
          emd_amount?: number | null
          emd_submitted?: boolean | null
          estimated_value?: number | null
          id?: string
          loss_reason?: string | null
          notes?: string | null
          opening_date?: string | null
          organization_name?: string | null
          publish_date?: string | null
          source?: Database["public"]["Enums"]["tender_source"] | null
          status?: Database["public"]["Enums"]["tender_status"] | null
          submission_deadline?: string | null
          technical_requirements?: string | null
          tenant_id?: string | null
          tender_number?: string
          tender_portal_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_primary: boolean | null
          territory_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_primary?: boolean | null
          territory_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_primary?: boolean | null
          territory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_assignments_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "sales_territories"
            referencedColumns: ["id"]
          },
        ]
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
          satisfaction_comment: string | null
          satisfaction_rating: number | null
          sla_deadline: string | null
          sla_hours: number
          source: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          tags: string[] | null
          tenant_id: string | null
          ticket_number: string
          title: string
          updated_at: string
          updated_by: string | null
          watchers: string[] | null
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
          satisfaction_comment?: string | null
          satisfaction_rating?: number | null
          sla_deadline?: string | null
          sla_hours?: number
          source?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[] | null
          tenant_id?: string | null
          ticket_number: string
          title: string
          updated_at?: string
          updated_by?: string | null
          watchers?: string[] | null
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
          satisfaction_comment?: string | null
          satisfaction_rating?: number | null
          sla_deadline?: string | null
          sla_hours?: number
          source?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[] | null
          tenant_id?: string | null
          ticket_number?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          watchers?: string[] | null
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
      units_of_measure: {
        Row: {
          created_at: string | null
          decimal_places: number | null
          formal_name: string | null
          id: string
          is_active: boolean | null
          symbol: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          decimal_places?: number | null
          formal_name?: string | null
          id?: string
          is_active?: boolean | null
          symbol: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          decimal_places?: number | null
          formal_name?: string | null
          id?: string
          is_active?: boolean | null
          symbol?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_of_measure_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      verification_documents: {
        Row: {
          ai_extracted_data: Json | null
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          is_verified: boolean | null
          mime_type: string | null
          tenant_id: string | null
          user_id: string
          verification_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ai_extracted_data?: Json | null
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          tenant_id?: string | null
          user_id: string
          verification_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ai_extracted_data?: Json | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          tenant_id?: string | null
          user_id?: string
          verification_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_documents_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "employee_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      video_calls: {
        Row: {
          call_type: string
          callee_id: string
          caller_id: string
          created_at: string
          ended_at: string | null
          id: string
          room_id: string
          started_at: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          call_type?: string
          callee_id: string
          caller_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          room_id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          call_type?: string
          callee_id?: string
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          room_id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_entries: {
        Row: {
          cost_center_id: string | null
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          entry_order: number | null
          id: string
          ledger_id: string | null
          narration: string | null
          voucher_id: string | null
        }
        Insert: {
          cost_center_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          entry_order?: number | null
          id?: string
          ledger_id?: string | null
          narration?: string | null
          voucher_id?: string | null
        }
        Update: {
          cost_center_id?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          entry_order?: number | null
          id?: string
          ledger_id?: string | null
          narration?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voucher_entries_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_entries_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_types: {
        Row: {
          abbreviation: string
          created_at: string | null
          current_number: number | null
          id: string
          is_active: boolean | null
          name: string
          numbering_method: string | null
          prefix: string | null
          starting_number: number | null
          tenant_id: string | null
          voucher_class: string
        }
        Insert: {
          abbreviation: string
          created_at?: string | null
          current_number?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          numbering_method?: string | null
          prefix?: string | null
          starting_number?: number | null
          tenant_id?: string | null
          voucher_class: string
        }
        Update: {
          abbreviation?: string
          created_at?: string | null
          current_number?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          numbering_method?: string | null
          prefix?: string | null
          starting_number?: number | null
          tenant_id?: string | null
          voucher_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          cancelled_reason: string | null
          created_at: string | null
          created_by: string | null
          fiscal_year: string | null
          id: string
          is_cancelled: boolean | null
          is_posted: boolean | null
          narration: string | null
          party_ledger_id: string | null
          reference_date: string | null
          reference_number: string | null
          tenant_id: string | null
          updated_at: string | null
          voucher_date: string
          voucher_number: string
          voucher_type_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          fiscal_year?: string | null
          id?: string
          is_cancelled?: boolean | null
          is_posted?: boolean | null
          narration?: string | null
          party_ledger_id?: string | null
          reference_date?: string | null
          reference_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          voucher_date: string
          voucher_number: string
          voucher_type_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          fiscal_year?: string | null
          id?: string
          is_cancelled?: boolean | null
          is_posted?: boolean | null
          narration?: string | null
          party_ledger_id?: string | null
          reference_date?: string | null
          reference_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          voucher_date?: string
          voucher_number?: string
          voucher_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_party_ledger_id_fkey"
            columns: ["party_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_voucher_type_id_fkey"
            columns: ["voucher_type_id"]
            isOneToOne: false
            referencedRelation: "voucher_types"
            referencedColumns: ["id"]
          },
        ]
      }
      web_form_captures: {
        Row: {
          converted_to_contact_id: string | null
          converted_to_lead_id: string | null
          created_at: string
          form_data: Json
          form_name: string
          id: string
          ip_address: string | null
          source_url: string | null
          status: string | null
          tenant_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          converted_to_contact_id?: string | null
          converted_to_lead_id?: string | null
          created_at?: string
          form_data: Json
          form_name: string
          id?: string
          ip_address?: string | null
          source_url?: string | null
          status?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          converted_to_contact_id?: string | null
          converted_to_lead_id?: string | null
          created_at?: string
          form_data?: Json
          form_name?: string
          id?: string
          ip_address?: string | null
          source_url?: string | null
          status?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_form_captures_converted_to_contact_id_fkey"
            columns: ["converted_to_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_form_captures_converted_to_lead_id_fkey"
            columns: ["converted_to_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_form_captures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webrtc_signals: {
        Row: {
          call_id: string
          created_at: string
          id: string
          processed: boolean | null
          receiver_id: string
          sender_id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          processed?: boolean | null
          receiver_id: string
          sender_id: string
          signal_data: Json
          signal_type: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          processed?: boolean | null
          receiver_id?: string
          sender_id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webrtc_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
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
      can_view_people_intelligence: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_sales_record: {
        Args: { record_creator_id: string }
        Returns: boolean
      }
      cleanup_expired_messages: { Args: never; Returns: undefined }
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
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
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
        | "qualified"
        | "proposal"
        | "negotiation"
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
      platform_integration_category:
        | "billing"
        | "email"
        | "monitoring"
        | "sso"
        | "infrastructure"
        | "marketplace"
      poc_status:
        | "requested"
        | "planning"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "converted"
      post_sale_workflow_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "skipped"
        | "on_hold"
      post_sale_workflow_type:
        | "odf_approval"
        | "order_processing"
        | "invoicing"
        | "payment_collection"
        | "support_onboarding"
        | "managed_service_onboarding"
        | "renewal_setup"
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
      sales_query_category:
        | "license_issue"
        | "new_solution_required"
        | "additional_licenses_required"
      sales_sub_team:
        | "commercial"
        | "enterprise_govt"
        | "bfsi"
        | "international"
        | "alliance_india"
      support_ticket_severity: "low" | "medium" | "high" | "critical"
      support_ticket_status:
        | "open"
        | "in_progress"
        | "waiting_on_customer"
        | "resolved"
        | "closed"
      support_ticket_type: "sales_query" | "technical_issue"
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
        | "mss"
        | "offensive"
      tenant_license_status:
        | "trial"
        | "active"
        | "past_due"
        | "suspended"
        | "cancelled"
      tenant_payment_status: "paid" | "pending" | "failed" | "na"
      tenant_status: "pending" | "active" | "suspended" | "cancelled"
      tenant_tier: "starter" | "professional" | "enterprise"
      tender_source:
        | "government"
        | "private"
        | "psu"
        | "referral"
        | "portal"
        | "direct"
      tender_status:
        | "identified"
        | "evaluating"
        | "bid_preparation"
        | "submitted"
        | "under_evaluation"
        | "won"
        | "lost"
        | "cancelled"
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
        "qualified",
        "proposal",
        "negotiation",
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
      platform_integration_category: [
        "billing",
        "email",
        "monitoring",
        "sso",
        "infrastructure",
        "marketplace",
      ],
      poc_status: [
        "requested",
        "planning",
        "in_progress",
        "completed",
        "cancelled",
        "converted",
      ],
      post_sale_workflow_status: [
        "pending",
        "in_progress",
        "completed",
        "skipped",
        "on_hold",
      ],
      post_sale_workflow_type: [
        "odf_approval",
        "order_processing",
        "invoicing",
        "payment_collection",
        "support_onboarding",
        "managed_service_onboarding",
        "renewal_setup",
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
      sales_query_category: [
        "license_issue",
        "new_solution_required",
        "additional_licenses_required",
      ],
      sales_sub_team: [
        "commercial",
        "enterprise_govt",
        "bfsi",
        "international",
        "alliance_india",
      ],
      support_ticket_severity: ["low", "medium", "high", "critical"],
      support_ticket_status: [
        "open",
        "in_progress",
        "waiting_on_customer",
        "resolved",
        "closed",
      ],
      support_ticket_type: ["sales_query", "technical_issue"],
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
        "mss",
        "offensive",
      ],
      tenant_license_status: [
        "trial",
        "active",
        "past_due",
        "suspended",
        "cancelled",
      ],
      tenant_payment_status: ["paid", "pending", "failed", "na"],
      tenant_status: ["pending", "active", "suspended", "cancelled"],
      tenant_tier: ["starter", "professional", "enterprise"],
      tender_source: [
        "government",
        "private",
        "psu",
        "referral",
        "portal",
        "direct",
      ],
      tender_status: [
        "identified",
        "evaluating",
        "bid_preparation",
        "submitted",
        "under_evaluation",
        "won",
        "lost",
        "cancelled",
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
