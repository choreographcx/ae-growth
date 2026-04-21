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
      client_branding: {
        Row: {
          accent_hex: string | null
          card_radius: string
          chart_palette: string
          client_id: string
          created_at: string
          dark_logo_url: string | null
          favicon_url: string | null
          font_family: string | null
          id: string
          logo_url: string | null
          primary_hex: string | null
          secondary_hex: string | null
          sidebar_style: string
          theme_mode: string | null
          updated_at: string
        }
        Insert: {
          accent_hex?: string | null
          card_radius?: string
          chart_palette?: string
          client_id: string
          created_at?: string
          dark_logo_url?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          primary_hex?: string | null
          secondary_hex?: string | null
          sidebar_style?: string
          theme_mode?: string | null
          updated_at?: string
        }
        Update: {
          accent_hex?: string | null
          card_radius?: string
          chart_palette?: string
          client_id?: string
          created_at?: string
          dark_logo_url?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          primary_hex?: string | null
          secondary_hex?: string | null
          sidebar_style?: string
          theme_mode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_branding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_data_sources: {
        Row: {
          account_id: string | null
          additional_config: Json
          bq_dataset: string | null
          bq_table_prefix: string | null
          client_id: string
          created_at: string
          ga4_property_id: string | null
          gcp_project_id: string | null
          id: string
          is_enabled: boolean
          source_type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          additional_config?: Json
          bq_dataset?: string | null
          bq_table_prefix?: string | null
          client_id: string
          created_at?: string
          ga4_property_id?: string | null
          gcp_project_id?: string | null
          id?: string
          is_enabled?: boolean
          source_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          additional_config?: Json
          bq_dataset?: string | null
          bq_table_prefix?: string | null
          client_id?: string
          created_at?: string
          ga4_property_id?: string | null
          gcp_project_id?: string | null
          id?: string
          is_enabled?: boolean
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_data_sources_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_kpi_thresholds: {
        Row: {
          client_id: string
          comparison_operator: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          is_enabled: boolean
          metric_key: string
          name: string | null
          scope: string
          severity: string
          threshold_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          client_id: string
          comparison_operator: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          metric_key: string
          name?: string | null
          scope?: string
          severity?: string
          threshold_value: number
          unit?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          comparison_operator?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          metric_key?: string
          name?: string | null
          scope?: string
          severity?: string
          threshold_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_kpi_thresholds_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_platform_settings: {
        Row: {
          account_ids: string[]
          budget_type: string
          client_id: string
          conversion_goal: string | null
          conversion_source: string
          created_at: string
          currency: string | null
          excluded_campaign_filter: string | null
          id: string
          include_in_diagnostics: boolean
          include_in_overview: boolean
          is_enabled: boolean
          monthly_budget: number | null
          naming_convention: string | null
          notes: string | null
          platform_name: string
          primary_kpi: string
          settings: Json
          source_label: string | null
          updated_at: string
        }
        Insert: {
          account_ids?: string[]
          budget_type?: string
          client_id: string
          conversion_goal?: string | null
          conversion_source?: string
          created_at?: string
          currency?: string | null
          excluded_campaign_filter?: string | null
          id?: string
          include_in_diagnostics?: boolean
          include_in_overview?: boolean
          is_enabled?: boolean
          monthly_budget?: number | null
          naming_convention?: string | null
          notes?: string | null
          platform_name: string
          primary_kpi?: string
          settings?: Json
          source_label?: string | null
          updated_at?: string
        }
        Update: {
          account_ids?: string[]
          budget_type?: string
          client_id?: string
          conversion_goal?: string | null
          conversion_source?: string
          created_at?: string
          currency?: string | null
          excluded_campaign_filter?: string | null
          id?: string
          include_in_diagnostics?: boolean
          include_in_overview?: boolean
          is_enabled?: boolean
          monthly_budget?: number | null
          naming_convention?: string | null
          notes?: string | null
          platform_name?: string
          primary_kpi?: string
          settings?: Json
          source_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_platform_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reporting_settings: {
        Row: {
          attribution_model: string | null
          client_id: string
          conversion_notes: string | null
          counting_method: string
          created_at: string
          default_date_range: string | null
          enable_anomaly_alerts: boolean
          enable_pacing_alerts: boolean
          ga4_property_id: string | null
          ga4_stream_id: string | null
          gtm_container_id: string | null
          id: string
          lookback_window: string
          micro_conversions: string[]
          primary_conversion_label: string | null
          reporting_currency: string | null
          reporting_timezone: string | null
          secondary_conversion_label: string | null
          settings: Json
          updated_at: string
          week_start_day: string | null
        }
        Insert: {
          attribution_model?: string | null
          client_id: string
          conversion_notes?: string | null
          counting_method?: string
          created_at?: string
          default_date_range?: string | null
          enable_anomaly_alerts?: boolean
          enable_pacing_alerts?: boolean
          ga4_property_id?: string | null
          ga4_stream_id?: string | null
          gtm_container_id?: string | null
          id?: string
          lookback_window?: string
          micro_conversions?: string[]
          primary_conversion_label?: string | null
          reporting_currency?: string | null
          reporting_timezone?: string | null
          secondary_conversion_label?: string | null
          settings?: Json
          updated_at?: string
          week_start_day?: string | null
        }
        Update: {
          attribution_model?: string | null
          client_id?: string
          conversion_notes?: string | null
          counting_method?: string
          created_at?: string
          default_date_range?: string | null
          enable_anomaly_alerts?: boolean
          enable_pacing_alerts?: boolean
          ga4_property_id?: string | null
          ga4_stream_id?: string | null
          gtm_container_id?: string | null
          id?: string
          lookback_window?: string
          micro_conversions?: string[]
          primary_conversion_label?: string | null
          reporting_currency?: string | null
          reporting_timezone?: string | null
          secondary_conversion_label?: string | null
          settings?: Json
          updated_at?: string
          week_start_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_reporting_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          code: string | null
          created_at: string
          currency: string
          id: string
          is_singleton: boolean
          name: string
          owner_user_id: string
          slug: string
          status: string
          timezone: string
          updated_at: string
          usd_to_aed_rate: number
          usd_to_sar_rate: number
          website_domain: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_singleton?: boolean
          name: string
          owner_user_id: string
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
          usd_to_aed_rate?: number
          usd_to_sar_rate?: number
          website_domain?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_singleton?: boolean
          name?: string
          owner_user_id?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
          usd_to_aed_rate?: number
          usd_to_sar_rate?: number
          website_domain?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_approved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_approved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_layouts: {
        Row: {
          created_at: string
          id: string
          layout_key: string
          section_order: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout_key: string
          section_order?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout_key?: string
          section_order?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          perms: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          perms?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          perms?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      debug_snapchat_reach: {
        Args: { p_end: string; p_start: string }
        Returns: {
          campaign_name: string
          conversion_name: string
          date: string
          impressions: number
          is_conversion_row: boolean
          platform: string
          reach: number
          row_count: number
        }[]
      }
      get_dashboard_conversion_breakdown: {
        Args: {
          p_campaign_names?: string[]
          p_end: string
          p_platforms?: string[]
          p_start: string
          p_suppressed_conversions?: Json
        }
        Returns: {
          conversion_funnel_group: string
          conversion_name: string
          conversions_all: number
          platform: string
        }[]
      }
      get_dashboard_daily:
        | {
            Args: { p_date: string }
            Returns: {
              clicks: number
              conversion_value: number
              conversions: number
              cost: number
              cost_usd: number
              cpc_usd: number
              cpm_usd: number
              ctr: number
              cvr: number
              date: string
              impressions: number
              landing_page_views: number
              outbound_clicks: number
              reach: number
            }[]
          }
        | {
            Args: {
              p_campaign_names?: string[]
              p_end: string
              p_platforms?: string[]
              p_start: string
              p_suppressed_conversions?: Json
            }
            Returns: {
              audience_type: string
              campaign_id: string
              campaign_name: string
              campaign_objective: string
              campaign_type: string
              clicks: number
              conversion_value: number
              conversions: number
              conversions_all: number
              conversions_lower_funnel: number
              conversions_upper_funnel: number
              cost: number
              date: string
              impressions: number
              landing_page_views: number
              outbound_clicks: number
              platform: string
              publisher_platform: string
              reach: number
              video_p100: number
              video_views: number
            }[]
          }
      get_or_create_active_client: {
        Args: never
        Returns: {
          code: string | null
          created_at: string
          currency: string
          id: string
          is_singleton: boolean
          name: string
          owner_user_id: string
          slug: string
          status: string
          timezone: string
          updated_at: string
          usd_to_aed_rate: number
          usd_to_sar_rate: number
          website_domain: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_platform_currency_integrity: {
        Args: { p_end?: string; p_start?: string }
        Returns: {
          implied_rate: number
          platform: string
          rows_scanned: number
          total_cost: number
          total_cost_usd: number
        }[]
      }
      get_profile_is_approved: { Args: { _user_id: string }; Returns: boolean }
      get_public_branding: {
        Args: never
        Returns: {
          accent_hex: string
          card_radius: string
          chart_palette: string
          dark_logo_url: string
          favicon_url: string
          font_family: string
          logo_url: string
          primary_hex: string
          secondary_hex: string
          sidebar_style: string
          theme_mode: string
        }[]
      }
      get_public_client_info: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      get_singleton_client: {
        Args: never
        Returns: {
          code: string | null
          created_at: string
          currency: string
          id: string
          is_singleton: boolean
          name: string
          owner_user_id: string
          slug: string
          status: string
          timezone: string
          updated_at: string
          usd_to_aed_rate: number
          usd_to_sar_rate: number
          website_domain: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_singleton_client_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "superadmin"
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
      app_role: ["admin", "user", "superadmin"],
    },
  },
} as const
