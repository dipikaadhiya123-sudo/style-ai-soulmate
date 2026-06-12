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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      looks: {
        Row: {
          category: string
          created_at: string
          description: string
          highlights: Json | null
          id: string
          item_image_url: string | null
          item_label: string
          photo_path: string
          result_image_path: string | null
          saved: boolean
          share_slug: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          highlights?: Json | null
          id?: string
          item_image_url?: string | null
          item_label: string
          photo_path: string
          result_image_path?: string | null
          saved?: boolean
          share_slug?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          highlights?: Json | null
          id?: string
          item_image_url?: string | null
          item_label?: string
          photo_path?: string
          result_image_path?: string | null
          saved?: boolean
          share_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      outfits: {
        Row: {
          created_at: string
          id: string
          items: Json
          occasion: string
          rationale: string | null
          saved: boolean
          score_breakdown: Json | null
          share_slug: string
          style_score: number | null
          suggestions: Json | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          occasion: string
          rationale?: string | null
          saved?: boolean
          score_breakdown?: Json | null
          share_slug?: string
          style_score?: number | null
          suggestions?: Json | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          occasion?: string
          rationale?: string | null
          saved?: boolean
          score_breakdown?: Json | null
          share_slug?: string
          style_score?: number | null
          suggestions?: Json | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_analysis: Json | null
          body_photo_path: string | null
          body_shape: string | null
          created_at: string
          display_name: string | null
          face_photo_path: string | null
          gender: string | null
          hair_type: string | null
          height_cm: number | null
          id: string
          onboarded: boolean
          skin_tone: string | null
          style_prefs: string[] | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          body_photo_path?: string | null
          body_shape?: string | null
          created_at?: string
          display_name?: string | null
          face_photo_path?: string | null
          gender?: string | null
          hair_type?: string | null
          height_cm?: number | null
          id: string
          onboarded?: boolean
          skin_tone?: string | null
          style_prefs?: string[] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          body_photo_path?: string | null
          body_shape?: string | null
          created_at?: string
          display_name?: string | null
          face_photo_path?: string | null
          gender?: string | null
          hair_type?: string | null
          height_cm?: number | null
          id?: string
          onboarded?: boolean
          skin_tone?: string | null
          style_prefs?: string[] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          current_price: number | null
          id: string
          image_url: string | null
          last_checked_at: string | null
          last_notified_price: number | null
          retailer: string | null
          source_url: string
          target_price: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          current_price?: number | null
          id?: string
          image_url?: string | null
          last_checked_at?: string | null
          last_notified_price?: number | null
          retailer?: string | null
          source_url: string
          target_price?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          current_price?: number | null
          id?: string
          image_url?: string | null
          last_checked_at?: string | null
          last_notified_price?: number | null
          retailer?: string | null
          source_url?: string
          target_price?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      shared_looks_public: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          highlights: Json | null
          item_label: string | null
          photo_path: string | null
          result_image_path: string | null
          share_slug: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          highlights?: Json | null
          item_label?: string | null
          photo_path?: string | null
          result_image_path?: string | null
          share_slug?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          highlights?: Json | null
          item_label?: string | null
          photo_path?: string | null
          result_image_path?: string | null
          share_slug?: string | null
        }
        Relationships: []
      }
      shared_outfits_public: {
        Row: {
          created_at: string | null
          items: Json | null
          occasion: string | null
          rationale: string | null
          score_breakdown: Json | null
          share_slug: string | null
          style_score: number | null
          suggestions: Json | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          items?: Json | null
          occasion?: string | null
          rationale?: string | null
          score_breakdown?: Json | null
          share_slug?: string | null
          style_score?: number | null
          suggestions?: Json | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          items?: Json | null
          occasion?: string | null
          rationale?: string | null
          score_breakdown?: Json | null
          share_slug?: string | null
          style_score?: number | null
          suggestions?: Json | null
          title?: string | null
        }
        Relationships: []
      }
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
    Enums: {},
  },
} as const
