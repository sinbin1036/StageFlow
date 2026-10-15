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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          event_date: string
          id: string
          public_code: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          public_code?: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          public_code?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      performance_entries: {
        Row: {
          artist: string
          created_at: string
          event_id: string
          id: string
          is_encore: boolean
          order_index: number | null
          song_title: string
          status: Database["public"]["Enums"]["entry_status"]
          submission_id: string
          updated_at: string
        }
        Insert: {
          artist: string
          created_at?: string
          event_id: string
          id?: string
          is_encore?: boolean
          order_index?: number | null
          song_title: string
          status?: Database["public"]["Enums"]["entry_status"]
          submission_id: string
          updated_at?: string
        }
        Update: {
          artist?: string
          created_at?: string
          event_id?: string
          id?: string
          is_encore?: boolean
          order_index?: number | null
          song_title?: string
          status?: Database["public"]["Enums"]["entry_status"]
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_entries_submission_id_event_id_is_encore_fkey"
            columns: ["submission_id", "event_id", "is_encore"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id", "event_id", "is_encore"]
          },
        ]
      }
      submission_secrets: {
        Row: {
          created_at: string
          edit_pin_hash: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edit_pin_hash: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edit_pin_hash?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_secrets_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_encore: boolean
          performer_names: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_encore?: boolean
          performer_names: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_encore?: boolean
          performer_names?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _assert_editable: {
        Args: {
          p_is_encore: boolean
          p_status: Database["public"]["Enums"]["event_status"]
          p_submission_id: string
        }
        Returns: undefined
      }
      _assert_pin_format: { Args: { p_pin: string }; Returns: undefined }
      _lock_submission_with_pin: {
        Args: { p_pin: string; p_submission_id: string }
        Returns: {
          event_id: string
          event_status: Database["public"]["Enums"]["event_status"]
          is_encore: boolean
          submission_id: string
        }[]
      }
      _normalize_performers: { Args: { p_names: string[] }; Returns: string[] }
      _validate_songs: {
        Args: { p_max: number; p_songs: Json }
        Returns: undefined
      }
      create_submission: {
        Args: {
          p_performers: string[]
          p_pin: string
          p_public_code: string
          p_songs: Json
        }
        Returns: string
      }
      delete_submission: {
        Args: { p_pin: string; p_submission_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      reorder_entries: {
        Args: {
          p_entry_ids: string[]
          p_event_id: string
          p_is_encore: boolean
        }
        Returns: undefined
      }
      update_submission: {
        Args: {
          p_performers: string[]
          p_pin: string
          p_songs: Json
          p_submission_id: string
        }
        Returns: undefined
      }
      verify_submission_pin: {
        Args: { p_pin: string; p_submission_id: string }
        Returns: boolean
      }
    }
    Enums: {
      entry_status:
        | "SUBMITTED"
        | "SCHEDULED"
        | "PERFORMING"
        | "COMPLETED"
        | "CANCELLED"
      event_status:
        | "DRAFT"
        | "OPEN"
        | "CLOSED"
        | "PUBLISHED"
        | "LIVE"
        | "ENCORE"
        | "ENDED"
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
    Enums: {
      entry_status: [
        "SUBMITTED",
        "SCHEDULED",
        "PERFORMING",
        "COMPLETED",
        "CANCELLED",
      ],
      event_status: [
        "DRAFT",
        "OPEN",
        "CLOSED",
        "PUBLISHED",
        "LIVE",
        "ENCORE",
        "ENDED",
      ],
    },
  },
} as const
