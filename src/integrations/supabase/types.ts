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
      accounts: {
        Row: {
          archived: boolean
          balance_minor: number
          color: string | null
          created_at: string
          currency_code: string
          icon: string | null
          id: string
          include_in_net_worth: boolean
          institution: string | null
          is_default_income: boolean
          is_default_spending: boolean
          last4: string | null
          low_balance_threshold_minor: number | null
          name: string
          notes: string | null
          order: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          balance_minor?: number
          color?: string | null
          created_at?: string
          currency_code?: string
          icon?: string | null
          id: string
          include_in_net_worth?: boolean
          institution?: string | null
          is_default_income?: boolean
          is_default_spending?: boolean
          last4?: string | null
          low_balance_threshold_minor?: number | null
          name: string
          notes?: string | null
          order?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          balance_minor?: number
          color?: string | null
          created_at?: string
          currency_code?: string
          icon?: string | null
          id?: string
          include_in_net_worth?: boolean
          institution?: string | null
          is_default_income?: boolean
          is_default_spending?: boolean
          last4?: string | null
          low_balance_threshold_minor?: number | null
          name?: string
          notes?: string | null
          order?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      actions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_threads: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          file_size: number
          id: string
          mime_type: string
          original_name: string
          storage_path: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size: number
          id?: string
          mime_type: string
          original_name: string
          storage_path: string
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_name?: string
          storage_path?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      commitments: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      direction_items: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      evolution_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          effective_at: string
          id: string
          quote_currency: string
          rate: number
          source: string
          user_id: string
        }
        Insert: {
          base_currency: string
          created_at?: string
          effective_at?: string
          id: string
          quote_currency: string
          rate: number
          source?: string
          user_id?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          effective_at?: string
          id?: string
          quote_currency?: string
          rate?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          id: string
          request_id: string
          result: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          result?: Json | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          result?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_context: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          base_currency: string
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string
          phone: string | null
          preferred_name: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          base_currency?: string
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          phone?: string | null
          preferred_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          base_currency?: string
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          phone?: string | null
          preferred_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purposes: {
        Row: {
          archived: boolean
          color: string | null
          cover_image_url: string | null
          created_at: string
          icon: string | null
          id: string
          included_in_available: boolean | null
          kind: string
          low_balance_threshold_minor: number | null
          monthly_plan_minor: number | null
          name: string
          order: number
          percentage: number
          plan_id: string | null
          protection_level: string
          source: string
          spendable: boolean | null
          target_date: string | null
          target_minor: number | null
          updated_at: string
          user_id: string
          wealth_building: boolean | null
        }
        Insert: {
          archived?: boolean
          color?: string | null
          cover_image_url?: string | null
          created_at?: string
          icon?: string | null
          id: string
          included_in_available?: boolean | null
          kind?: string
          low_balance_threshold_minor?: number | null
          monthly_plan_minor?: number | null
          name: string
          order?: number
          percentage?: number
          plan_id?: string | null
          protection_level?: string
          source?: string
          spendable?: boolean | null
          target_date?: string | null
          target_minor?: number | null
          updated_at?: string
          user_id?: string
          wealth_building?: boolean | null
        }
        Update: {
          archived?: boolean
          color?: string | null
          cover_image_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          included_in_available?: boolean | null
          kind?: string
          low_balance_threshold_minor?: number | null
          monthly_plan_minor?: number | null
          name?: string
          order?: number
          percentage?: number
          plan_id?: string | null
          protection_level?: string
          source?: string
          spendable?: boolean | null
          target_date?: string | null
          target_minor?: number | null
          updated_at?: string
          user_id?: string
          wealth_building?: boolean | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          label: string | null
          last_error: string | null
          last_success_at: string | null
          p256dh: string
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_success_at?: string | null
          p256dh: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          label?: string | null
          last_error?: string | null
          last_success_at?: string | null
          p256dh?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          payload: Json
          scheduled_at: string | null
          status: string
          timezone: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id: string
          payload: Json
          scheduled_at?: string | null
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          payload?: Json
          scheduled_at?: string | null
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          created_at: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount_minor: number
          created_at: string
          id: string
          kind: string
          occurred_at: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount_minor?: number
          created_at?: string
          id: string
          kind: string
          occurred_at?: string
          payload: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount_minor?: number
          created_at?: string
          id?: string
          kind?: string
          occurred_at?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          appearance: Json
          created_at: string
          notification_preferences: Json
          onboarding_completed: boolean
          privacy_mode: boolean
          quiet_hours: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appearance?: Json
          created_at?: string
          notification_preferences?: Json
          onboarding_completed?: boolean
          privacy_mode?: boolean
          quiet_hours?: Json | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          appearance?: Json
          created_at?: string
          notification_preferences?: Json
          onboarding_completed?: boolean
          privacy_mode?: boolean
          quiet_hours?: Json | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
