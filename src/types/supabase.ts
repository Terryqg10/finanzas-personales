export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      budgets: {
        Row: {
          alert_threshold: number;
          category_id: string;
          created_at: string;
          id: string;
          monthly_limit: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          alert_threshold?: number;
          category_id: string;
          created_at?: string;
          id?: string;
          monthly_limit: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          alert_threshold?: number;
          category_id?: string;
          created_at?: string;
          id?: string;
          monthly_limit?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'budgets_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          icon: string;
          id: string;
          is_essential: boolean;
          name: string;
          user_id: string | null;
        };
        Insert: {
          color: string;
          created_at?: string;
          icon?: string;
          id?: string;
          is_essential?: boolean;
          name: string;
          user_id?: string | null;
        };
        Update: {
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          is_essential?: boolean;
          name?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      exchange_rate_snapshots: {
        Row: {
          base_currency: string;
          fetched_at: string;
          id: string;
          rate: number;
          snapshot_date: string;
          target_currency: string;
        };
        Insert: {
          base_currency: string;
          fetched_at?: string;
          id?: string;
          rate: number;
          snapshot_date?: string;
          target_currency: string;
        };
        Update: {
          base_currency?: string;
          fetched_at?: string;
          id?: string;
          rate?: number;
          snapshot_date?: string;
          target_currency?: string;
        };
        Relationships: [];
      };
      recurring_rules: {
        Row: {
          amount: number;
          category_id: string;
          created_at: string;
          currency: string;
          description: string;
          frequency: Database['public']['Enums']['recurring_frequency'];
          id: string;
          next_due_date: string;
          status: Database['public']['Enums']['recurring_status'];
          type: Database['public']['Enums']['transaction_type'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          category_id: string;
          created_at?: string;
          currency: string;
          description: string;
          frequency: Database['public']['Enums']['recurring_frequency'];
          id?: string;
          next_due_date: string;
          status?: Database['public']['Enums']['recurring_status'];
          type: Database['public']['Enums']['transaction_type'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          category_id?: string;
          created_at?: string;
          currency?: string;
          description?: string;
          frequency?: Database['public']['Enums']['recurring_frequency'];
          id?: string;
          next_due_date?: string;
          status?: Database['public']['Enums']['recurring_status'];
          type?: Database['public']['Enums']['transaction_type'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recurring_rules_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          amount_base: number | null;
          amount_original: number;
          category_id: string;
          created_at: string;
          currency_base: string;
          currency_original: string;
          date: string;
          description: string;
          exchange_rate_used: number;
          id: string;
          recurring_rule_id: string | null;
          source: Database['public']['Enums']['transaction_source'];
          type: Database['public']['Enums']['transaction_type'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_base?: number | null;
          amount_original: number;
          category_id: string;
          created_at?: string;
          currency_base: string;
          currency_original: string;
          date: string;
          description: string;
          exchange_rate_used: number;
          id?: string;
          recurring_rule_id?: string | null;
          source?: Database['public']['Enums']['transaction_source'];
          type: Database['public']['Enums']['transaction_type'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_base?: number | null;
          amount_original?: number;
          category_id?: string;
          created_at?: string;
          currency_base?: string;
          currency_original?: string;
          date?: string;
          description?: string;
          exchange_rate_used?: number;
          id?: string;
          recurring_rule_id?: string | null;
          source?: Database['public']['Enums']['transaction_source'];
          type?: Database['public']['Enums']['transaction_type'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_recurring_rule_id_fkey';
            columns: ['recurring_rule_id'];
            isOneToOne: false;
            referencedRelation: 'recurring_rules';
            referencedColumns: ['id'];
          },
        ];
      };
      user_settings: {
        Row: {
          base_currency: string;
          created_at: string;
          notify_email: boolean;
          notify_push: boolean;
          savings_rate_target: number;
          theme_preference: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          base_currency?: string;
          created_at?: string;
          notify_email?: boolean;
          notify_push?: boolean;
          savings_rate_target?: number;
          theme_preference?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          base_currency?: string;
          created_at?: string;
          notify_email?: boolean;
          notify_push?: boolean;
          savings_rate_target?: number;
          theme_preference?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_balance_summary: {
        Args: { p_currency: string };
        Returns: {
          expense: number;
          income: number;
          other_currency_count: number;
        }[];
      };
      get_budget_progress: {
        Args: { p_currency: string };
        Returns: {
          alert_threshold: number;
          budget_id: string;
          category_color: string;
          category_id: string;
          category_name: string;
          monthly_limit: number;
          spent: number;
        }[];
      };
      get_category_breakdown: {
        Args: { p_currency: string; p_end: string; p_start: string };
        Returns: {
          category_color: string;
          category_id: string;
          category_name: string;
          total: number;
        }[];
      };
      get_monthly_evolution: {
        Args: { p_currency: string; p_months?: number };
        Returns: {
          expense: number;
          income: number;
          month: string;
        }[];
      };
      get_pending_recurring_reminders: {
        Args: never;
        Returns: {
          amount: number;
          category_color: string;
          category_id: string;
          category_name: string;
          currency: string;
          description: string;
          is_essential: boolean;
          next_due_date: string;
          rule_id: string;
          type: string;
        }[];
      };
      get_fixed_expenses: {
        Args: never;
        Returns: {
          amount: number;
          category_color: string;
          category_icon: string;
          category_id: string;
          category_name: string;
          currency: string;
          description: string;
          frequency: string;
          is_essential: boolean;
          next_due_date: string;
          rule_id: string;
          status: string;
        }[];
      };
      get_weekend_spending_recommendation: {
        Args: { p_currency: string };
        Returns: {
          discretionary_budget_remaining: number;
          discretionary_spent: number;
          essential_spent: number;
          has_discretionary_budget: boolean;
          month_income: number;
          pending_fixed_expenses: number;
        }[];
      };
    };
    Enums: {
      recurring_frequency: 'weekly' | 'monthly' | 'yearly';
      recurring_status: 'active' | 'paused';
      transaction_source: 'manual' | 'imported' | 'recurring';
      transaction_type: 'income' | 'expense';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      recurring_frequency: ['weekly', 'monthly', 'yearly'],
      recurring_status: ['active', 'paused'],
      transaction_source: ['manual', 'imported', 'recurring'],
      transaction_type: ['income', 'expense'],
    },
  },
} as const;
