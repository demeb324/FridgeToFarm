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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      drivers: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          hub_id: string
          id: string
          last_name: string
          phone: string
          vehicle: string | null
          zone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name: string
          hub_id: string
          id?: string
          last_name: string
          phone: string
          vehicle?: string | null
          zone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          hub_id?: string
          id?: string
          last_name?: string
          phone?: string
          vehicle?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      farmers: {
        Row: {
          address_text: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          opted_out: boolean
          phone: string
          updated_at: string
        }
        Insert: {
          address_text: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          opted_out?: boolean
          phone: string
          updated_at?: string
        }
        Update: {
          address_text?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          opted_out?: boolean
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      hubs: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          created_at: string
          error_message: string | null
          farmer_id: string
          id: string
          route_id: string
          status: string
          twilio_sid: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          farmer_id: string
          id?: string
          route_id: string
          status: string
          twilio_sid?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          farmer_id?: string
          id?: string
          route_id?: string
          status?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_assignments: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          route_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          route_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          route_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_responses: {
        Row: {
          created_at: string
          farmer_id: string
          id: string
          notes: string | null
          response_type: string
          route_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farmer_id: string
          id?: string
          notes?: string | null
          response_type: string
          route_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farmer_id?: string
          id?: string
          notes?: string | null
          response_type?: string
          route_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_responses_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_responses_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          address: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string | null
          order_index: number
          route_id: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name?: string | null
          order_index: number
          route_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string | null
          order_index?: number
          route_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          end_address: string
          end_lat: number
          end_lng: number
          end_time: string
          hub_id: string
          id: string
          notes: string | null
          published: boolean
          route_polyline: string
          start_address: string
          start_lat: number
          start_lng: number
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string
          end_address?: string
          end_lat: number
          end_lng: number
          end_time: string
          hub_id: string
          id?: string
          notes?: string | null
          published?: boolean
          route_polyline?: string
          start_address?: string
          start_lat: number
          start_lng: number
          start_time: string
          title: string
        }
        Update: {
          created_at?: string
          end_address?: string
          end_lat?: number
          end_lng?: number
          end_time?: string
          hub_id?: string
          id?: string
          notes?: string | null
          published?: boolean
          route_polyline?: string
          start_address?: string
          start_lat?: number
          start_lng?: number
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_farmers_near_route_points: {
        Args: { radius_miles?: number; route_points: Json }
        Returns: {
          address_text: string
          farmer_id: string
          farmer_name: string
          latitude: number
          longitude: number
          min_distance_miles: number
          phone: string
        }[]
      }
      find_routes_near_farmer: {
        Args: { farmer_id_in: string; radius_miles?: number }
        Returns: {
          end_lat: number
          end_lng: number
          end_time: string
          hub_id: string
          hub_name: string
          min_distance_miles: number
          notes: string
          route_id: string
          route_title: string
          start_lat: number
          start_lng: number
          start_time: string
        }[]
      }
      haversine_miles: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
