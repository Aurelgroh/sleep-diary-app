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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      diary_entries: {
        Row: {
          answers: Json | null
          awakenings: number
          bedtime_deviation: number | null
          created_at: string
          date: string
          ema: number
          ema_out_of_bed: number
          entered_by: string | null
          id: string
          notes: string | null
          patient_id: string
          prescribed_bedtime: string | null
          prescribed_wake_time: string | null
          quality_rating: number | null
          se: number | null
          sol: number
          sol_out_of_bed: number
          tfa: string
          tib: number | null
          tob: string
          tst: number | null
          ttb: string
          tts: string
          twt: number | null
          twt_out: number | null
          updated_at: string
          waketime_deviation: number | null
          waso: number
          waso_out_of_bed: number
        }
        Insert: {
          answers?: Json | null
          awakenings?: number
          bedtime_deviation?: number | null
          created_at?: string
          date: string
          ema?: number
          ema_out_of_bed?: number
          entered_by?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          prescribed_bedtime?: string | null
          prescribed_wake_time?: string | null
          quality_rating?: number | null
          se?: number | null
          sol?: number
          sol_out_of_bed?: number
          tfa: string
          tib?: number | null
          tob: string
          tst?: number | null
          ttb: string
          tts: string
          twt?: number | null
          twt_out?: number | null
          updated_at?: string
          waketime_deviation?: number | null
          waso?: number
          waso_out_of_bed?: number
        }
        Update: {
          answers?: Json | null
          awakenings?: number
          bedtime_deviation?: number | null
          created_at?: string
          date?: string
          ema?: number
          ema_out_of_bed?: number
          entered_by?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          prescribed_bedtime?: string | null
          prescribed_wake_time?: string | null
          quality_rating?: number | null
          se?: number | null
          sol?: number
          sol_out_of_bed?: number
          tfa?: string
          tib?: number | null
          tob?: string
          tst?: number | null
          ttb?: string
          tts?: string
          twt?: number | null
          twt_out?: number | null
          updated_at?: string
          waketime_deviation?: number | null
          waso?: number
          waso_out_of_bed?: number
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          name: string
          therapist_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          name: string
          therapist_id: string
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          name?: string
          therapist_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      isi_scores: {
        Row: {
          answers: Json
          assessment_type: string
          created_at: string
          date: string
          id: string
          patient_id: string
          score: number
          session_id: string | null
        }
        Insert: {
          answers: Json
          assessment_type: string
          created_at?: string
          date: string
          id?: string
          patient_id: string
          score: number
          session_id?: string | null
        }
        Update: {
          answers?: Json
          assessment_type?: string
          created_at?: string
          date?: string
          id?: string
          patient_id?: string
          score?: number
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "isi_scores_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isi_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          patient_id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          patient_id: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          patient_id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          baseline_date: string | null
          created_at: string
          current_session: number
          email: string
          id: string
          min_sleep_window: number
          name: string
          status: Database["public"]["Enums"]["patient_status"]
          therapist_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          baseline_date?: string | null
          created_at?: string
          current_session?: number
          email: string
          id: string
          min_sleep_window?: number
          name: string
          status?: Database["public"]["Enums"]["patient_status"]
          therapist_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          baseline_date?: string | null
          created_at?: string
          current_session?: number
          email?: string
          id?: string
          min_sleep_window?: number
          name?: string
          status?: Database["public"]["Enums"]["patient_status"]
          therapist_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          bedtime: string
          created_at: string
          created_by: string
          effective_date: string
          id: string
          notes: string | null
          patient_id: string
          wake_time: string
          window_minutes: number
        }
        Insert: {
          bedtime: string
          created_at?: string
          created_by: string
          effective_date: string
          id?: string
          notes?: string | null
          patient_id: string
          wake_time: string
          window_minutes: number
        }
        Update: {
          bedtime?: string
          created_at?: string
          created_by?: string
          effective_date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          wake_time?: string
          window_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          patient_id: string
          prescription_id: string | null
          session_number: number
          therapist_id: string
          titration_data: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          patient_id: string
          prescription_id?: string | null
          session_number: number
          therapist_id: string
          titration_data?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          prescription_id?: string | null
          session_number?: number
          therapist_id?: string
          titration_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists: {
        Row: {
          created_at: string
          credentials: string | null
          email: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: string | null
          email: string
          id: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: string | null
          email?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_weekly_averages: {
        Args: { p_end_date?: string; p_patient_id: string }
        Returns: {
          avg_ema: number
          avg_se: number
          avg_sol: number
          avg_tib: number
          avg_tst: number
          avg_twt_out: number
          avg_waso: number
          days_logged: number
        }[]
      }
      check_baseline_establishment: {
        Args: { p_patient_id: string }
        Returns: string
      }
    }
    Enums: {
      patient_status:
        | "invited"
        | "baseline"
        | "active"
        | "completed"
        | "archived"
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
      patient_status: [
        "invited",
        "baseline",
        "active",
        "completed",
        "archived",
      ],
    },
  },
} as const
