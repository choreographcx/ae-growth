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
      x_oauth_tokens: {
        Row: {
          access_token: string | null
          created_at: string | null
          expires_at: string | null
          provider: string
          raw_response: Json | null
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          provider: string
          raw_response?: Json | null
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          provider?: string
          raw_response?: Json | null
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      dashboard_conversions: {
        Row: {
          account_id: string | null
          account_name: string | null
          ad_group_id: string | null
          ad_group_name: string | null
          ad_id: string | null
          ad_name: string | null
          audience_type: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_objective: string | null
          campaign_type: string | null
          conversion_funnel_group: string | null
          conversion_name: string | null
          conversion_name_norm: string | null
          conversion_type: string | null
          conversion_value: number | null
          conversions_all: number | null
          conversions_lower_funnel: number | null
          conversions_upper_funnel: number | null
          data_source_name: string | null
          date: string | null
          is_conversion_row: boolean | null
          market: string | null
          market_mapping_method: string | null
          platform: string | null
          publisher_platform: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          audience_type?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_objective?: string | null
          campaign_type?: string | null
          conversion_funnel_group?: string | null
          conversion_name?: string | null
          conversion_name_norm?: string | null
          conversion_type?: string | null
          conversion_value?: number | null
          conversions_all?: number | null
          conversions_lower_funnel?: number | null
          conversions_upper_funnel?: number | null
          data_source_name?: string | null
          date?: string | null
          is_conversion_row?: boolean | null
          market?: string | null
          market_mapping_method?: string | null
          platform?: string | null
          publisher_platform?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          audience_type?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_objective?: string | null
          campaign_type?: string | null
          conversion_funnel_group?: string | null
          conversion_name?: string | null
          conversion_name_norm?: string | null
          conversion_type?: string | null
          conversion_value?: number | null
          conversions_all?: number | null
          conversions_lower_funnel?: number | null
          conversions_upper_funnel?: number | null
          data_source_name?: string | null
          date?: string | null
          is_conversion_row?: boolean | null
          market?: string | null
          market_mapping_method?: string | null
          platform?: string | null
          publisher_platform?: string | null
        }
        Relationships: []
      }
      dashboard_daily: {
        Row: {
          account_id: string | null
          account_name: string | null
          ad_group_id: string | null
          ad_group_name: string | null
          ad_id: string | null
          ad_name: string | null
          audience_type: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_objective: string | null
          campaign_type: string | null
          clicks: number | null
          conversion_funnel_group: string | null
          conversion_name: string | null
          conversion_name_norm: string | null
          conversion_rate_all: number | null
          conversion_rate_lower_funnel: number | null
          conversion_type: string | null
          conversion_value: number | null
          conversions: number | null
          conversions_all: number | null
          conversions_lower_funnel: number | null
          conversions_primary: number | null
          conversions_upper_funnel: number | null
          cost: number | null
          cost_per_lpv: number | null
          cost_per_video_view: number | null
          cost_usd: number | null
          cpa_all_conversions: number | null
          cpa_lower_funnel: number | null
          cpc: number | null
          cpm: number | null
          ctr: number | null
          cvr_lower_funnel: number | null
          data_source_name: string | null
          date: string | null
          frequency: number | null
          impressions: number | null
          is_conversion_row: boolean | null
          is_wasted_spend: boolean | null
          landing_page_views: number | null
          lpv_rate: number | null
          market: string | null
          market_mapping_method: string | null
          outbound_clicks: number | null
          outbound_ctr: number | null
          platform: string | null
          publisher_platform: string | null
          reach: number | null
          roas: number | null
          video_p100: number | null
          video_p25: number | null
          video_p50: number | null
          video_p75: number | null
          video_views: number | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          audience_type?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_objective?: string | null
          campaign_type?: string | null
          clicks?: number | null
          conversion_funnel_group?: string | null
          conversion_name?: string | null
          conversion_name_norm?: string | null
          conversion_rate_all?: number | null
          conversion_rate_lower_funnel?: number | null
          conversion_type?: string | null
          conversion_value?: number | null
          conversions?: number | null
          conversions_all?: number | null
          conversions_lower_funnel?: number | null
          conversions_primary?: number | null
          conversions_upper_funnel?: number | null
          cost?: number | null
          cost_per_lpv?: number | null
          cost_per_video_view?: number | null
          cost_usd?: number | null
          cpa_all_conversions?: number | null
          cpa_lower_funnel?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          cvr_lower_funnel?: number | null
          data_source_name?: string | null
          date?: string | null
          frequency?: number | null
          impressions?: number | null
          is_conversion_row?: boolean | null
          is_wasted_spend?: boolean | null
          landing_page_views?: number | null
          lpv_rate?: number | null
          market?: string | null
          market_mapping_method?: string | null
          outbound_clicks?: number | null
          outbound_ctr?: number | null
          platform?: string | null
          publisher_platform?: string | null
          reach?: number | null
          roas?: number | null
          video_p100?: number | null
          video_p25?: number | null
          video_p50?: number | null
          video_p75?: number | null
          video_views?: number | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          ad_group_id?: string | null
          ad_group_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          audience_type?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_objective?: string | null
          campaign_type?: string | null
          clicks?: number | null
          conversion_funnel_group?: string | null
          conversion_name?: string | null
          conversion_name_norm?: string | null
          conversion_rate_all?: number | null
          conversion_rate_lower_funnel?: number | null
          conversion_type?: string | null
          conversion_value?: number | null
          conversions?: number | null
          conversions_all?: number | null
          conversions_lower_funnel?: number | null
          conversions_primary?: number | null
          conversions_upper_funnel?: number | null
          cost?: number | null
          cost_per_lpv?: number | null
          cost_per_video_view?: number | null
          cost_usd?: number | null
          cpa_all_conversions?: number | null
          cpa_lower_funnel?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          cvr_lower_funnel?: number | null
          data_source_name?: string | null
          date?: string | null
          frequency?: number | null
          impressions?: number | null
          is_conversion_row?: boolean | null
          is_wasted_spend?: boolean | null
          landing_page_views?: number | null
          lpv_rate?: number | null
          market?: string | null
          market_mapping_method?: string | null
          outbound_clicks?: number | null
          outbound_ctr?: number | null
          platform?: string | null
          publisher_platform?: string | null
          reach?: number | null
          roas?: number | null
          video_p100?: number | null
          video_p25?: number | null
          video_p50?: number | null
          video_p75?: number | null
          video_views?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      diag_conv_events: {
        Args: { p_end: string; p_start: string }
        Returns: {
          conv_all: number
          conversion_funnel_group: string
          conversion_name: string
          platform: string
          rows_count: number
        }[]
      }
      diag_frequency_signal: {
        Args: { p_end?: string; p_start?: string }
        Returns: {
          freq_nonnull: number
          freq_positive: number
          max_frequency: number
          max_reach: number
          platform: string
          reach_positive: number
          rows_total: number
          sample_frequency: number
          sample_reach: number
        }[]
      }
      diag_meta_monthly: {
        Args: { p_end?: string; p_start?: string }
        Returns: {
          is_conversion_row: boolean
          month: string
          platform: string
          rows_count: number
          total_clicks: number
          total_conversions_all: number
          total_cost: number
          total_cost_usd: number
          total_impressions: number
        }[]
      }
      diag_platform_monthly: {
        Args: { p_end?: string; p_platform_key: string; p_start?: string }
        Returns: {
          is_conversion_row: boolean
          month: string
          platform: string
          rows_count: number
          total_clicks: number
          total_conversions_all: number
          total_cost: number
          total_cost_usd: number
          total_impressions: number
        }[]
      }
      get_active_ga4_property_id: { Args: never; Returns: string }
      get_active_ga4_property_ids: { Args: never; Returns: string[] }
      get_dashboard_ad_breakdown: {
        Args: {
          p_end: string
          p_level?: string
          p_limit?: number
          p_platform?: string
          p_start: string
        }
        Returns: {
          ad_group_id: string
          ad_group_name: string
          ad_id: string
          ad_name: string
          campaign_name: string
          clicks: number
          conversions_all: number
          conversions_lower_funnel: number
          cost: number
          impressions: number
          platform: string
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
      get_dashboard_daily: {
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
          frequency: number
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
      internal_get_ga4_sa_json: { Args: never; Returns: string }
      internal_get_google_sa_json: { Args: never; Returns: string }
      internal_grant_superadmin: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      internal_revoke_superadmin: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      list_ga4_sources: {
        Args: never
        Returns: {
          created_at: string
          id: string
          is_enabled: boolean
          label: string
          property_id: string
        }[]
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
