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
          starting_balance_minor: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
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
          name: string
          notes?: string | null
          order?: number
          starting_balance_minor?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
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
          starting_balance_minor?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      actions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_source: string
          description: string | null
          due_date: string | null
          id: string
          linked_plan_id: string | null
          linked_program_id: string | null
          priority: string
          reminder: boolean
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_source?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_plan_id?: string | null
          linked_program_id?: string | null
          priority?: string
          reminder?: boolean
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_source?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_plan_id?: string | null
          linked_program_id?: string | null
          priority?: string
          reminder?: boolean
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_linked_plan_id_fkey"
            columns: ["linked_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_linked_program_id_fkey"
            columns: ["linked_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_prepared_actions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          resolved_at: string | null
          status: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          resolved_at?: string | null
          status?: string
          thread_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          resolved_at?: string | null
          status?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_prepared_actions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "agent_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_threads: {
        Row: {
          created_at: string
          id: string
          mode: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
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
          account_id: string | null
          active: boolean
          amount_minor: number
          cadence: string
          created_at: string
          due_day: number | null
          id: string
          name: string
          notes: string | null
          purpose_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount_minor?: number
          cadence?: string
          created_at?: string
          due_day?: number | null
          id?: string
          name: string
          notes?: string | null
          purpose_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount_minor?: number
          cadence?: string
          created_at?: string
          due_day?: number | null
          id?: string
          name?: string
          notes?: string | null
          purpose_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_purpose_id_fkey"
            columns: ["purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          created_at: string
          decided_on: string
          id: string
          linked_direction_id: string | null
          linked_plan_id: string | null
          reason: string | null
          source: string
          statement: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_on?: string
          id?: string
          linked_direction_id?: string | null
          linked_plan_id?: string | null
          reason?: string | null
          source?: string
          statement: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          decided_on?: string
          id?: string
          linked_direction_id?: string | null
          linked_plan_id?: string | null
          reason?: string | null
          source?: string
          statement?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_linked_direction_id_fkey"
            columns: ["linked_direction_id"]
            isOneToOne: false
            referencedRelation: "direction_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_linked_plan_id_fkey"
            columns: ["linked_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      direction_items: {
        Row: {
          category: string | null
          content: string
          created_at: string
          horizon: string
          id: string
          plan_id: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          horizon?: string
          id?: string
          plan_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          horizon?: string
          id?: string
          plan_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direction_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_events: {
        Row: {
          created_at: string
          happened_at: string
          hidden: boolean
          id: string
          kind: string
          payload: Json | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          happened_at?: string
          hidden?: boolean
          id?: string
          kind: string
          payload?: Json | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          happened_at?: string
          hidden?: boolean
          id?: string
          kind?: string
          payload?: Json | null
          title?: string
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
          id?: string
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
          body: string | null
          created_at: string
          deep_link: string | null
          id: string
          kind: string
          payload: Json | null
          read_at: string | null
          scheduled_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deep_link?: string | null
          id?: string
          kind: string
          payload?: Json | null
          read_at?: string | null
          scheduled_at?: string | null
          title?: string
          user_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deep_link?: string | null
          id?: string
          kind?: string
          payload?: Json | null
          read_at?: string | null
          scheduled_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_context: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          reviewed_at: string | null
          sensitive: boolean
          source: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          sensitive?: boolean
          source?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          sensitive?: boolean
          source?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_milestones: {
        Row: {
          created_at: string
          done_at: string | null
          id: string
          order: number
          plan_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          id?: string
          order?: number
          plan_id: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          id?: string
          order?: number
          plan_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_milestones_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          cover_image_url: string | null
          created_at: string
          data: Json
          financial: boolean
          id: string
          kind: string
          name: string
          priority: string
          purpose_id: string | null
          status: string
          target_date: string | null
          target_minor: number | null
          updated_at: string
          user_id: string
          why: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          data?: Json
          financial?: boolean
          id?: string
          kind?: string
          name: string
          priority?: string
          purpose_id?: string | null
          status?: string
          target_date?: string | null
          target_minor?: number | null
          updated_at?: string
          user_id?: string
          why?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          data?: Json
          financial?: boolean
          id?: string
          kind?: string
          name?: string
          priority?: string
          purpose_id?: string | null
          status?: string
          target_date?: string | null
          target_minor?: number | null
          updated_at?: string
          user_id?: string
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_purpose_id_fkey"
            columns: ["purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
        ]
      }
      priorities: {
        Row: {
          content: string
          created_at: string
          id: string
          level: string
          order: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          level?: string
          order?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          level?: string
          order?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          base_currency: string
          created_at: string
          full_name: string | null
          id: string
          language: string
          preferred_name: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          base_currency?: string
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          preferred_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          base_currency?: string
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          preferred_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_items: {
        Row: {
          created_at: string
          day: number | null
          description: string | null
          id: string
          linked_action_id: string | null
          order: number
          program_id: string
          reminder: boolean
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: number | null
          description?: string | null
          id?: string
          linked_action_id?: string | null
          order?: number
          program_id: string
          reminder?: boolean
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          day?: number | null
          description?: string | null
          id?: string
          linked_action_id?: string | null
          order?: number
          program_id?: string
          reminder?: boolean
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_source: string
          description: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          linked_plan_id: string | null
          purpose: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_source?: string
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          linked_plan_id?: string | null
          purpose?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_source?: string
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          linked_plan_id?: string | null
          purpose?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_linked_plan_id_fkey"
            columns: ["linked_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      purposes: {
        Row: {
          archived: boolean
          color: string | null
          cover_image_url: string | null
          created_at: string
          icon: string | null
          id: string
          kind: string
          low_balance_threshold_minor: number | null
          monthly_plan_minor: number | null
          name: string
          order: number
          plan_id: string | null
          protection_level: string
          source: string
          target_date: string | null
          target_minor: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string | null
          cover_image_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          low_balance_threshold_minor?: number | null
          monthly_plan_minor?: number | null
          name: string
          order?: number
          plan_id?: string | null
          protection_level?: string
          source?: string
          target_date?: string | null
          target_minor?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          color?: string | null
          cover_image_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          kind?: string
          low_balance_threshold_minor?: number | null
          monthly_plan_minor?: number | null
          name?: string
          order?: number
          plan_id?: string | null
          protection_level?: string
          source?: string
          target_date?: string | null
          target_minor?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          content: string
          created_at: string
          date_key: string
          id: string
          linked_program_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          date_key?: string
          id?: string
          linked_program_id?: string | null
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          date_key?: string
          id?: string
          linked_program_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_linked_program_id_fkey"
            columns: ["linked_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          id: string
          linked_action_id: string | null
          linked_plan_id: string | null
          linked_program_id: string | null
          recurrence: string | null
          scheduled_at: string
          status: string
          timezone: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_action_id?: string | null
          linked_plan_id?: string | null
          linked_program_id?: string | null
          recurrence?: string | null
          scheduled_at: string
          status?: string
          timezone?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_action_id?: string | null
          linked_plan_id?: string | null
          linked_program_id?: string | null
          recurrence?: string | null
          scheduled_at?: string
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_linked_action_id_fkey"
            columns: ["linked_action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_linked_plan_id_fkey"
            columns: ["linked_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_linked_program_id_fkey"
            columns: ["linked_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_allocations: {
        Row: {
          account_id: string | null
          amount_minor: number
          created_at: string
          id: string
          purpose_id: string
          released_at: string | null
          source_transaction_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount_minor: number
          created_at?: string
          id?: string
          purpose_id: string
          released_at?: string | null
          source_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          amount_minor?: number
          created_at?: string
          id?: string
          purpose_id?: string
          released_at?: string | null
          source_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_allocations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_allocations_purpose_id_fkey"
            columns: ["purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_allocations_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          approved_changes: Json | null
          created_at: string
          facts: Json
          id: string
          period_end: string
          period_start: string
          type: string
          updated_at: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          approved_changes?: Json | null
          created_at?: string
          facts?: Json
          id?: string
          period_end: string
          period_start: string
          type?: string
          updated_at?: string
          user_id?: string
          user_notes?: string | null
        }
        Update: {
          approved_changes?: Json | null
          created_at?: string
          facts?: Json
          id?: string
          period_end?: string
          period_start?: string
          type?: string
          updated_at?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: []
      }
      strategies: {
        Row: {
          active: boolean
          created_at: string
          id: string
          mode: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          mode?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          mode?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strategy_rules: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          order: number
          plan_id: string | null
          purpose_id: string | null
          strategy_id: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          order?: number
          plan_id?: string | null
          purpose_id?: string | null
          strategy_id: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          order?: number
          plan_id?: string | null
          purpose_id?: string | null
          strategy_id?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_rules_purpose_id_fkey"
            columns: ["purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_rules_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          allocations: Json | null
          amount_minor: number
          category_id: string | null
          created_at: string
          currency_code: string
          description: string
          from_purpose_id: string | null
          id: string
          kind: string
          money_type: string
          notes: string | null
          occurred_at: string
          request_id: string | null
          tags: string[]
          to_account_id: string | null
          to_purpose_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          allocations?: Json | null
          amount_minor: number
          category_id?: string | null
          created_at?: string
          currency_code?: string
          description?: string
          from_purpose_id?: string | null
          id?: string
          kind: string
          money_type?: string
          notes?: string | null
          occurred_at?: string
          request_id?: string | null
          tags?: string[]
          to_account_id?: string | null
          to_purpose_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          allocations?: Json | null
          amount_minor?: number
          category_id?: string | null
          created_at?: string
          currency_code?: string
          description?: string
          from_purpose_id?: string | null
          id?: string
          kind?: string
          money_type?: string
          notes?: string | null
          occurred_at?: string
          request_id?: string | null
          tags?: string[]
          to_account_id?: string | null
          to_purpose_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_purpose_id_fkey"
            columns: ["from_purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_purpose_id_fkey"
            columns: ["to_purpose_id"]
            isOneToOne: false
            referencedRelation: "purposes"
            referencedColumns: ["id"]
          },
        ]
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
