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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
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
      closed_won_substage:
        | "odf_created"
        | "odf_approved"
        | "invoice_raised"
        | "payment_received"
      deal_stage:
        | "pipeline"
        | "upside"
        | "strong_upside"
        | "commit"
        | "closed_won"
        | "closed_lost"
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
      closed_won_substage: [
        "odf_created",
        "odf_approved",
        "invoice_raised",
        "payment_received",
      ],
      deal_stage: [
        "pipeline",
        "upside",
        "strong_upside",
        "commit",
        "closed_won",
        "closed_lost",
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
    },
  },
} as const
