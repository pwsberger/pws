export type Variant = "A" | "B";

export type Database = {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string;
          created_at: string;
          age: number | null;
          gender: string | null;
          education_level: string | null;
          class_name: string | null;
          sports_interest: string | null;
          assigned_variant: Variant;
          device_type: string | null;
          browser: string | null;
          screen_resolution: string | null;
          completed: boolean;
          completed_at: string | null;
          total_session_duration_ms: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          age?: number | null;
          gender?: string | null;
          education_level?: string | null;
          class_name?: string | null;
          sports_interest?: string | null;
          assigned_variant: Variant;
          device_type?: string | null;
          browser?: string | null;
          screen_resolution?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          total_session_duration_ms?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>;
        Relationships: [];
      };
      responses: {
        Row: {
          id: string;
          participant_id: string;
          question_id: string;
          answer: string;
          time_to_answer_ms: number | null;
          change_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          question_id: string;
          answer: string;
          time_to_answer_ms?: number | null;
          change_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["responses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "responses_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          id: string;
          participant_id: string;
          event_type: string;
          metadata: Record<string, unknown>;
          timestamp: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          event_type: string;
          metadata?: Record<string, unknown>;
          timestamp?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "events_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Demographics = {
  age: string;
  gender: string;
  education_level: string;
  class_name: string;
  sports_interest: string;
};

export type DeviceInfo = {
  device_type: string;
  browser: string;
  screen_resolution: string;
};
