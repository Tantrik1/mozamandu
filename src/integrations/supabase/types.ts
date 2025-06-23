export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["category_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["category_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["category_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      color_variants: {
        Row: {
          color_name: string
          created_at: string | null
          has_sizes: boolean | null
          id: string
          image_url: string | null
          product_id: string
        }
        Insert: {
          color_name: string
          created_at?: string | null
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          product_id: string
        }
        Update: {
          color_name?: string
          created_at?: string | null
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "color_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          color_variant_id: string | null
          created_at: string | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
        }
        Insert: {
          color_variant_id?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
        }
        Update: {
          color_variant_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_color_variant_id_fkey"
            columns: ["color_variant_id"]
            isOneToOne: false
            referencedRelation: "color_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          cost_price: number
          created_at: string | null
          description: string | null
          has_color_variants: boolean | null
          has_size_variants: boolean | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          name: string
          selling_price: number | null
          status: Database["public"]["Enums"]["product_status"] | null
          subcategory_id: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          cost_price: number
          created_at?: string | null
          description?: string | null
          has_color_variants?: boolean | null
          has_size_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name: string
          selling_price?: number | null
          status?: Database["public"]["Enums"]["product_status"] | null
          subcategory_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          cost_price?: number
          created_at?: string | null
          description?: string | null
          has_color_variants?: boolean | null
          has_size_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name?: string
          selling_price?: number | null
          status?: Database["public"]["Enums"]["product_status"] | null
          subcategory_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      size_variants: {
        Row: {
          color_variant_id: string
          created_at: string | null
          id: string
          size_code: string | null
          size_name: string
          stock_quantity: number | null
        }
        Insert: {
          color_variant_id: string
          created_at?: string | null
          id?: string
          size_code?: string | null
          size_name: string
          stock_quantity?: number | null
        }
        Update: {
          color_variant_id?: string
          created_at?: string | null
          id?: string
          size_code?: string | null
          size_name?: string
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "size_variants_color_variant_id_fkey"
            columns: ["color_variant_id"]
            isOneToOne: false
            referencedRelation: "color_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          discount_amount: number | null
          id: string
          minimum_quantity_for_discount: number
          name: string
          selling_price: number
          status: Database["public"]["Enums"]["category_status"]
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          id?: string
          minimum_quantity_for_discount?: number
          name: string
          selling_price: number
          status?: Database["public"]["Enums"]["category_status"]
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          id?: string
          minimum_quantity_for_discount?: number
          name?: string
          selling_price?: number
          status?: Database["public"]["Enums"]["category_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      category_status: "on" | "off"
      product_status: "active" | "inactive"
      user_role: "admin" | "customer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      category_status: ["on", "off"],
      product_status: ["active", "inactive"],
      user_role: ["admin", "customer"],
    },
  },
} as const
