export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      farmers: {
        Row: {
          address_text: string;
          created_at: string;
          id: string;
          latitude: number;
          longitude: number;
          name: string;
          opted_out: boolean;
          phone: string;
          updated_at: string;
        };
        Insert: {
          address_text: string;
          created_at?: string;
          id?: string;
          latitude: number;
          longitude: number;
          name: string;
          opted_out?: boolean;
          phone: string;
          updated_at?: string;
        };
        Update: {
          address_text?: string;
          created_at?: string;
          id?: string;
          latitude?: number;
          longitude?: number;
          name?: string;
          opted_out?: boolean;
          phone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hubs: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string;
          phone: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          name: string;
          phone: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          phone?: string;
        };
        Relationships: [];
      };
      notification_log: {
        Row: {
          created_at: string;
          error_message: string | null;
          farmer_id: string;
          id: string;
          route_id: string;
          status: "sent" | "failed" | "opted_out";
          twilio_sid: string | null;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          farmer_id: string;
          id?: string;
          route_id: string;
          status: "sent" | "failed" | "opted_out";
          twilio_sid?: string | null;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          farmer_id?: string;
          id?: string;
          route_id?: string;
          status?: "sent" | "failed" | "opted_out";
          twilio_sid?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notification_log_farmer_id_fkey";
            columns: ["farmer_id"];
            isOneToOne: false;
            referencedRelation: "farmers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_log_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
        ];
      };
      route_responses: {
        Row: {
          created_at: string;
          farmer_id: string;
          id: string;
          notes: string | null;
          response_type: "crop_pickup" | "compost_pickup" | "both";
          route_id: string;
          status: "pending" | "confirmed" | "cancelled";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          farmer_id: string;
          id?: string;
          notes?: string | null;
          response_type: "crop_pickup" | "compost_pickup" | "both";
          route_id: string;
          status?: "pending" | "confirmed" | "cancelled";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          farmer_id?: string;
          id?: string;
          notes?: string | null;
          response_type?: "crop_pickup" | "compost_pickup" | "both";
          route_id?: string;
          status?: "pending" | "confirmed" | "cancelled";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "route_responses_farmer_id_fkey";
            columns: ["farmer_id"];
            isOneToOne: false;
            referencedRelation: "farmers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "route_responses_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
        ];
      };
      routes: {
        Row: {
          created_at: string;
          end_lat: number;
          end_lng: number;
          end_time: string;
          hub_id: string;
          id: string;
          notes: string | null;
          published: boolean;
          route_polyline: string;
          start_lat: number;
          start_lng: number;
          start_time: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          end_lat: number;
          end_lng: number;
          end_time: string;
          hub_id: string;
          id?: string;
          notes?: string | null;
          published?: boolean;
          route_polyline: string;
          start_lat: number;
          start_lng: number;
          start_time: string;
          title: string;
        };
        Update: {
          created_at?: string;
          end_lat?: number;
          end_lng?: number;
          end_time?: string;
          hub_id?: string;
          id?: string;
          notes?: string | null;
          published?: boolean;
          route_polyline?: string;
          start_lat?: number;
          start_lng?: number;
          start_time?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "routes_hub_id_fkey";
            columns: ["hub_id"];
            isOneToOne: false;
            referencedRelation: "hubs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      find_farmers_near_route_points: {
        Args: {
          radius_miles?: number;
          route_points: Json;
        };
        Returns: {
          address_text: string;
          farmer_id: string;
          farmer_name: string;
          latitude: number;
          longitude: number;
          min_distance_miles: number;
          phone: string;
        }[];
      };
      haversine_miles: {
        Args: {
          lat1: number;
          lat2: number;
          lng1: number;
          lng2: number;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
