import type { SupabaseClient } from "@supabase/supabase-js";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      articles: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          estimated_hours: number;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          pressing_id: string;
          price: number;
          sort_order: number;
          updated_at: string;
          wash_type: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          description?: string | null;
          estimated_hours?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          pressing_id: string;
          price: number;
          sort_order?: number;
          updated_at?: string;
          wash_type: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          estimated_hours?: number;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          pressing_id?: string;
          price?: number;
          sort_order?: number;
          updated_at?: string;
          wash_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "articles_pressing_id_fkey";
            columns: ["pressing_id"];
            isOneToOne: false;
            referencedRelation: "pressings";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          commune: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          last_order_at: string | null;
          loyalty_points: number;
          notes: string | null;
          phone: string | null;
          pressing_id: string;
          total_orders: number;
          total_spent: number;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          address?: string | null;
          commune?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          is_active?: boolean;
          last_order_at?: string | null;
          loyalty_points?: number;
          notes?: string | null;
          phone?: string | null;
          pressing_id: string;
          total_orders?: number;
          total_spent?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          address?: string | null;
          commune?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          last_order_at?: string | null;
          loyalty_points?: number;
          notes?: string | null;
          phone?: string | null;
          pressing_id?: string;
          total_orders?: number;
          total_spent?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_pressing_id_fkey";
            columns: ["pressing_id"];
            isOneToOne: false;
            referencedRelation: "pressings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_packs: {
        Row: {
          client_id: string;
          created_at: string;
          eligible_articles: Json;
          expires_at: string | null;
          id: string;
          name: string;
          pressing_id: string;
          price: number;
          status: string;
          total_quantity: number;
          updated_at: string;
          used_quantity: number;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          eligible_articles?: Json;
          expires_at?: string | null;
          id?: string;
          name: string;
          pressing_id: string;
          price?: number;
          status?: string;
          total_quantity: number;
          updated_at?: string;
          used_quantity?: number;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          eligible_articles?: Json;
          expires_at?: string | null;
          id?: string;
          name?: string;
          pressing_id?: string;
          price?: number;
          status?: string;
          total_quantity?: number;
          updated_at?: string;
          used_quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "customer_packs_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_packs_pressing_id_fkey";
            columns: ["pressing_id"];
            isOneToOne: false;
            referencedRelation: "pressings";
            referencedColumns: ["id"];
          },
        ];
      };
      deliveries: {
        Row: {
          address: string | null;
          completed_at: string | null;
          contact_phone: string | null;
          created_at: string;
          driver_id: string | null;
          failure_reason: string | null;
          gps_coordinates: string | null;
          id: string;
          order_id: string;
          pressing_id: string;
          proof_photo_url: string | null;
          scheduled_at: string | null;
          signature_url: string | null;
          status: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          completed_at?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          driver_id?: string | null;
          failure_reason?: string | null;
          gps_coordinates?: string | null;
          id?: string;
          order_id: string;
          pressing_id: string;
          proof_photo_url?: string | null;
          scheduled_at?: string | null;
          signature_url?: string | null;
          status?: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          completed_at?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          driver_id?: string | null;
          failure_reason?: string | null;
          gps_coordinates?: string | null;
          id?: string;
          order_id?: string;
          pressing_id?: string;
          proof_photo_url?: string | null;
          scheduled_at?: string | null;
          signature_url?: string | null;
          status?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliveries_pressing_id_fkey";
            columns: ["pressing_id"];
            isOneToOne: false;
            referencedRelation: "pressings";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          channel: string;
          client_id: string | null;
          created_at: string;
          error_message: string | null;
          event: string | null;
          id: string;
          message: string;
          order_id: string | null;
          pressing_id: string;
          recipient: string;
          retries: number;
          sent_at: string | null;
          status: string;
          attempted_at: string | null;
          next_attempt_at: string | null;
          payload: Json | null;
        };
        Insert: {
          channel: string;
          client_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          event?: string | null;
          id?: string;
          message: string;
          order_id?: string | null;
          pressing_id: string;
          recipient: string;
          retries?: number;
          sent_at?: string | null;
          status?: string;
          attempted_at?: string | null;
          next_attempt_at?: string | null;
          payload?: Json | null;
        };
        Update: {
          channel?: string;
          client_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          event?: string | null;
          id?: string;
          message?: string;
          order_id?: string | null;
          pressing_id?: string;
          recipient?: string;
          retries?: number;
          sent_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_pressing_id_fkey";
            columns: ["pressing_id"];
            isOneToOne: false;
            referencedRelation: "pressings";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          article_id: string | null;
          article_name: string;
          created_at: string;
          id: string;
          order_id: string;
          photo_after_url: string | null;
          photo_before_url: string | null;
          quantity: number;
          special_instructions: string | null;
          total_price: number | null;
          unit_price: number;
          used_pack_id: string | null;
          wash_type: string;
        };
        Insert: {
          article_id?: string | null;
          article_name: string;
          created_at?: string;
          id?: string;
          order_id: string;
          photo_after_url?: string | null;
          photo_before_url?: string | null;
          quantity?: number;
          special_instructions?: string | null;
          total_price?: number | null;
          unit_price: number;
          used_pack_id?: string | null;
          wash_type: string;
        };
        Update: {
          article_id?: string | null;
          article_name?: string;
          created_at?: string;
          id?: string;
          order_id?: string;
          photo_after_url?: string | null;
          photo_before_url?: string | null;
          quantity?: number;
          special_instructions?: string | null;
          total_price?: number | null;
          unit_price?: number;
          used_pack_id?: string | null;
          wash_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_used_pack_id_fkey";
            columns: ["used_pack_id"];
            isOneToOne: false;
            referencedRelation: "customer_packs";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          amount_paid: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          delivered_at: string | null;
          delivery_address: string | null;
          delivery_fee: number;
          delivery_scheduled_at: string | null;
          delivery_type: string;
          discount: number;
          dispute_reason: string | null;
          estimated_ready_at: string | null;
          express_fee: number;
          id: string;
          is_express: boolean;
          notes: string | null;
          order_number: string;
          payment_method: string | null;
          payment_status: string;
          pickup_address: string | null;
          pickup_scheduled_at: string | null;
          pickup_type: string;
          pressing_id: string;
          status: string;
          subtotal: number;
          total: number;
          updated_at: string;
        };
        Insert: {
          amount_paid?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          delivered_at?: string | null;
          delivery_address?: string | null;
          delivery_fee?: number;
          delivery_scheduled_at?: string | null;
          delivery_type?: string;
          discount?: number;
          dispute_reason?: string | null;
          estimated_ready_at?: string | null;
          express_fee?: number;
          id?: string;
          is_express?: boolean;
          notes?: string | null;
          order_number: string;
          payment_method?: string | null;
          payment_status?: string;
          pickup_address?: string | null;
          pickup_scheduled_at?: string | null;
          pickup_type?: string;
          pressing_id: string;
          status?: string;
          subtotal?: number;
          total: number;
          updated_at?: string;
        };
        Update: {
          amount_paid?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          delivered_at?: string | null;
          delivery_address?: string | null;
          delivery_fee?: number;
          delivery_scheduled_at?: string | null;
          delivery_type?: string;
          discount?: number;
          dispute_reason?: string | null;
          estimated_ready_at?: string | null;
          express_fee?: number;
          id?: string;
          is_express?: boolean;
          notes?: string | null;
          order_number?: string;
          payment_method?: string | null;
          payment_status?: string;
          pickup_address?: string | null;
          pickup_scheduled_at?: string | null;
          pickup_type?: string;
          pressing_id?: string;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_pressing_id_fkey";
            columns: ["pressing_id"];
            isOneToOne: false;
            referencedRelation: "pressings";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          id: string;
          method: string;
          order_id: string | null;
          paid_at: string | null;
          payment_token: string | null;
          pressing_id: string;
          raw_response: Json | null;
          receipt_number: string | null;
          status: string;
          transaction_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          method: string;
          order_id?: string | null;
          paid_at?: string | null;
          payment_token?: string | null;
          pressing_id: string;
          raw_response?: Json | null;
          receipt_number?: string | null;
          status?: string;
          transaction_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          method?: string;
          order_id?: string | null;
          paid_at?: string | null;
          payment_token?: string | null;
          pressing_id?: string;
          raw_response?: Json | null;
          receipt_number?: string | null;
          status?: string;
          transaction_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_pressing_id_fkey";
            columns: ["pressing_id"];
            isOneToOne: false;
            referencedRelation: "pressings";
            referencedColumns: ["id"];
          },
        ];
      };
      pressings: {
        Row: {
          address: string | null;
          commune: string;
          created_at: string;
          default_delays_by_wash: Json;
          delivery_enabled: boolean;
          delivery_fee: number;
          delivery_fees_by_commune: Json;
          email: string | null;
          free_delivery_from: number | null;
          id: string;
          is_active: boolean;
          logo_url: string | null;
          name: string;
          opening_hours: Json;
          owner_id: string | null;
          phone: string | null;
          pickup_enabled: boolean;
          referral_code: string | null;
          subscription_expires_at: string | null;
          subscription_plan: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          commune?: string;
          created_at?: string;
          default_delays_by_wash?: Json;
          delivery_enabled?: boolean;
          delivery_fee?: number;
          delivery_fees_by_commune?: Json;
          email?: string | null;
          free_delivery_from?: number | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name: string;
          opening_hours?: Json;
          owner_id?: string | null;
          phone?: string | null;
          pickup_enabled?: boolean;
          referral_code?: string | null;
          subscription_expires_at?: string | null;
          subscription_plan?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          commune?: string;
          created_at?: string;
          default_delays_by_wash?: Json;
          delivery_enabled?: boolean;
          delivery_fee?: number;
          delivery_fees_by_commune?: Json;
          email?: string | null;
          free_delivery_from?: number | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name?: string;
          opening_hours?: Json;
          owner_id?: string | null;
          phone?: string | null;
          pickup_enabled?: boolean;
          referral_code?: string | null;
          subscription_expires_at?: string | null;
          subscription_plan?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pressings_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          phone: string | null;
          pressing_id: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string;
          id: string;
          is_active?: boolean;
          phone?: string | null;
          pressing_id?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          phone?: string | null;
          pressing_id?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_pressing_id_fkey";
            columns: ["pressing_id"];
            isOneToOne: false;
            referencedRelation: "pressings";
            referencedColumns: ["id"];
          },
        ];
      };
      saas_subscriptions: {
        Row: {
          auto_renew: boolean;
          billing_cycle: string;
          created_at: string;
          discount_percent: number;
          expires_at: string | null;
          id: string;
          payment_method: string | null;
          plan: string;
          pressing_id: string;
          price: number;
          started_at: string | null;
          status: string;
          transaction_id: string | null;
          updated_at: string;
        };
        Insert: {
          auto_renew?: boolean;
          billing_cycle?: string;
          created_at?: string;
          discount_percent?: number;
          expires_at?: string | null;
          id?: string;
          payment_method?: string | null;
          plan: string;
          pressing_id: string;
          price?: number;
          started_at?: string | null;
          status?: string;
          transaction_id?: string | null;
          updated_at?: string;
        };
        Update: {
          auto_renew?: boolean;
          billing_cycle?: string;
          created_at?: string;
          discount_percent?: number;
          expires_at?: string | null;
          id?: string;
          payment_method?: string | null;
          plan?: string;
          pressing_id?: string;
          price?: number;
          started_at?: string | null;
          status?: string;
          transaction_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saas_subscriptions_pressing_id_fkey";
            columns: ["pressing_id"];
            isOneToOne: false;
            referencedRelation: "pressings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      stats_dashboard: {
        Row: {
          current_month_revenue: number;
          previous_month_revenue: number;
          pending_orders_count: number;
          ready_orders_count: number;
          new_clients_count: number;
          current_month_orders_count: number;
        };
      };
      stats_monthly_revenue: {
        Row: {
          month: string;
          revenue: number;
        };
      };
      stats_recent_orders: {
        Row: {
          id: string;
          total: number;
          status: string;
          created_at: string;
          customer_name: string;
        };
      };
      stats_clients_aggregates: {
        Row: {
          client_id: string;
          orders_count: number;
          total_spent: number;
          last_order_date: string | null;
        };
      };
      stats_weekly_report: {
        Row: {
          day: string;
          revenue: number;
          orders_count: number;
        };
      };
    };
    Functions: {
      add_team_member: {
        Args: {
          p_full_name?: string;
          p_phone?: string;
          p_pressing_id: string;
          p_role: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      account_exists: {
        Args: {
          p_email: string;
          p_phone: string;
        };
        Returns: {
          email_taken: boolean;
          has_pressing: boolean;
          phone_taken: boolean;
        }[];
      };
      demo_phone: { Args: never; Returns: string };
      normalize_phone: { Args: { p_input: string }; Returns: string };
      app_current_pressing_id: { Args: never; Returns: string };
      app_current_role: { Args: never; Returns: string };
      app_is_order_client: { Args: { p_order_id: string }; Returns: boolean };
      app_is_pressing_admin: { Args: never; Returns: boolean };
      app_is_pressing_owner: {
        Args: { p_pressing_id: string };
        Returns: boolean;
      };
      app_is_record_client: { Args: { p_client_id: string }; Returns: boolean };
      app_is_staff: { Args: never; Returns: boolean };
      app_order_pressing_id: { Args: { p_order_id: string }; Returns: string };
      complete_onboarding: { Args: { payload: Json }; Returns: Json };
      get_reference_catalogue: {
        Args: never;
        Returns: {
          category: string;
          estimated_hours: number;
          name: string;
          price: number;
          sort_order: number;
          wash_type: string;
        }[];
      };
      record_payment: {
        Args: { p_amount: number; p_method: string; p_order_id: string };
        Returns: Json;
      };
      reference_pressing_id: { Args: never; Returns: string };
      set_pressing_subscription: {
        Args: {
          p_billing_cycle?: string;
          p_expires_at: string;
          p_payment_method?: string;
          p_plan: string;
          p_pressing_id: string;
          p_price?: number;
          p_transaction_id?: string;
        };
        Returns: undefined;
      };
      remove_team_member: {
        Args: { p_pressing_id: string; p_user_id: string };
        Returns: undefined;
      };
      update_team_member: {
        Args: {
          p_is_active: boolean;
          p_pressing_id: string;
          p_role: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
