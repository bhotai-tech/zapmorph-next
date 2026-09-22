/**
 * Supabase schema types for supabase/migrations. Regenerate after schema
 * changes with:
 *   supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, RequiredOnInsert extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, RequiredOnInsert> & Partial<Omit<Row, RequiredOnInsert>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type BillingPeriod = 'monthly' | 'yearly' | 'lifetime';
export type SubscriptionStatus =
  | 'initialized'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'failed';
export type OrderStatus = 'created' | 'pending' | 'paid' | 'failed' | 'refunded';

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        { id: string; full_name: string | null; created_at: string; updated_at: string },
        'id'
      >;
      plans: Table<
        {
          id: string;
          name: string;
          price_cents: number;
          compare_at_price_cents: number | null;
          currency: string;
          billing_period: BillingPeriod;
          is_active: boolean;
          created_at: string;
        },
        'id' | 'name' | 'price_cents' | 'billing_period'
      >;
      billing_customers: Table<
        { user_id: string; paddle_customer_id: string; created_at: string },
        'user_id' | 'paddle_customer_id'
      >;
      subscriptions: Table<
        {
          id: string;
          user_id: string;
          plan_id: string;
          status: SubscriptionStatus;
          paddle_subscription_id: string | null;
          next_charge_at: string | null;
          current_period_ends_at: string | null;
          cancel_at: string | null;
          created_at: string;
          updated_at: string;
        },
        'user_id' | 'plan_id'
      >;
      orders: Table<
        {
          id: string;
          user_id: string;
          plan_id: string;
          subscription_id: string | null;
          amount_cents: number;
          currency: string;
          status: OrderStatus;
          paddle_transaction_id: string | null;
          created_at: string;
          updated_at: string;
        },
        'user_id' | 'plan_id' | 'amount_cents'
      >;
      payments: Table<
        {
          id: string;
          order_id: string;
          paddle_transaction_id: string | null;
          amount_cents: number | null;
          method: string | null;
          status: 'success' | 'refunded';
          created_at: string;
        },
        'order_id' | 'status'
      >;
      entitlements: Table<
        {
          id: string;
          user_id: string;
          plan_id: string;
          order_id: string;
          subscription_id: string | null;
          status: 'active' | 'revoked';
          expires_at: string | null;
          revoked_at: string | null;
          revoke_reason: string | null;
          created_at: string;
          updated_at: string;
        },
        'user_id' | 'plan_id' | 'order_id'
      >;
      webhook_events: Table<
        {
          id: string;
          event_id: string;
          event_type: string;
          payload: Json;
          processed_at: string | null;
          error: string | null;
          created_at: string;
        },
        'event_id' | 'event_type' | 'payload'
      >;
      audit_logs: Table<
        {
          id: string;
          actor: string;
          action: string;
          entity: string | null;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        },
        'actor' | 'action'
      >;
      usage_daily: Table<
        {
          subject: string;
          day: string;
          conversions: number;
          pro_conversions: number;
          bytes: number;
        },
        'subject' | 'day'
      >;
      converter_stats: Table<
        { slug: string; day: string; runs: number; files: number },
        'slug' | 'day'
      >;
      rate_limits: Table<{ key: string; count: number; reset_at: string }, 'key' | 'count' | 'reset_at'>;
    };
    Views: { [_ in never]: never };
    Functions: {
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      consume_usage: {
        Args: {
          p_subject: string;
          p_slug: string;
          p_files: number;
          p_bytes: number;
          p_is_pro_tool: boolean;
          p_file_limit: number | null;
          p_pro_limit: number | null;
        };
        Returns: { allowed: boolean; reason: string | null; used: number; pro_used: number }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
