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
          {
            foreignKeyName: "fk_color_variants_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_subcategories: {
        Row: {
          combo_id: string
          created_at: string | null
          id: string
          min_units: number
          price: number
          subcategory_id: string
        }
        Insert: {
          combo_id: string
          created_at?: string | null
          id?: string
          min_units: number
          price: number
          subcategory_id: string
        }
        Update: {
          combo_id?: string
          created_at?: string | null
          id?: string
          min_units?: number
          price?: number
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_subcategories_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_order_item_details: {
        Row: {
          color_name: string | null
          created_at: string | null
          id: string
          order_id: string
          pricing_details: Json | null
          pricing_mode: string
          product_name: string
          quantity: number
          size_name: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          pricing_details?: Json | null
          pricing_mode?: string
          product_name: string
          quantity: number
          size_name?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          pricing_details?: Json | null
          pricing_mode?: string
          product_name?: string
          quantity?: number
          size_name?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_item_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          product_inventory_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          product_inventory_id?: string | null
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          product_inventory_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_items_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_items_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_items_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          combo_applied: boolean | null
          contact_number: string
          created_at: string | null
          customer_email: string
          customer_name: string
          delivery_address: string
          delivery_charge: number
          delivery_location_id: string | null
          id: string
          order_number: string
          paid_amount: number
          payment_method_id: string | null
          payment_percentage: number
          payment_screenshot_url: string | null
          pricing_breakdown: Json | null
          promocode_discount: number | null
          promocode_used: string | null
          remaining_amount: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total_amount: number
          updated_at: string | null
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          combo_applied?: boolean | null
          contact_number: string
          created_at?: string | null
          customer_email: string
          customer_name: string
          delivery_address: string
          delivery_charge?: number
          delivery_location_id?: string | null
          id?: string
          order_number?: string
          paid_amount?: number
          payment_method_id?: string | null
          payment_percentage?: number
          payment_screenshot_url?: string | null
          pricing_breakdown?: Json | null
          promocode_discount?: number | null
          promocode_used?: string | null
          remaining_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          combo_applied?: boolean | null
          contact_number?: string
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          delivery_address?: string
          delivery_charge?: number
          delivery_location_id?: string | null
          id?: string
          order_number?: string
          paid_amount?: number
          payment_method_id?: string | null
          payment_percentage?: number
          payment_screenshot_url?: string | null
          pricing_breakdown?: Json | null
          promocode_discount?: number | null
          promocode_used?: string | null
          remaining_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_delivery_location_id_fkey"
            columns: ["delivery_location_id"]
            isOneToOne: false
            referencedRelation: "delivery_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_charges: {
        Row: {
          created_at: string | null
          delivery_price: number
          id: string
          is_active: boolean | null
          place_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_price: number
          id?: string
          is_active?: boolean | null
          place_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_price?: number
          id?: string
          is_active?: boolean | null
          place_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_tiers: {
        Row: {
          created_at: string | null
          discount_amount: number
          id: string
          max_quantity: number | null
          min_quantity: number
          subcategory_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number
          id?: string
          max_quantity?: number | null
          min_quantity: number
          subcategory_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number
          id?: string
          max_quantity?: number | null
          min_quantity?: number
          subcategory_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_tiers_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          user_data: Json | null
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          user_data?: Json | null
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_data?: Json | null
          verified?: boolean | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_audit_log: {
        Row: {
          action_type: string
          cart_id: string | null
          category_id: string | null
          change_amount: number | null
          color_variant_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_available_stock: number | null
          new_reserved_stock: number | null
          new_stock_quantity: number | null
          old_available_stock: number | null
          old_reserved_stock: number | null
          old_stock_quantity: number | null
          order_id: string | null
          product_id: string | null
          product_inventory_id: string | null
          reason: string | null
          size_variant_id: string | null
          subcategory_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          cart_id?: string | null
          category_id?: string | null
          change_amount?: number | null
          color_variant_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_available_stock?: number | null
          new_reserved_stock?: number | null
          new_stock_quantity?: number | null
          old_available_stock?: number | null
          old_reserved_stock?: number | null
          old_stock_quantity?: number | null
          order_id?: string | null
          product_id?: string | null
          product_inventory_id?: string | null
          reason?: string | null
          size_variant_id?: string | null
          subcategory_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          cart_id?: string | null
          category_id?: string | null
          change_amount?: number | null
          color_variant_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_available_stock?: number | null
          new_reserved_stock?: number | null
          new_stock_quantity?: number | null
          old_available_stock?: number | null
          old_reserved_stock?: number | null
          old_stock_quantity?: number | null
          order_id?: string | null
          product_id?: string | null
          product_inventory_id?: string | null
          reason?: string | null
          size_variant_id?: string | null
          subcategory_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_log_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_log_color_variant_id_fkey"
            columns: ["color_variant_id"]
            isOneToOne: false
            referencedRelation: "color_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_log_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_log_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_log_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_log_size_variant_id_fkey"
            columns: ["size_variant_id"]
            isOneToOne: false
            referencedRelation: "size_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_log_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      navbar_items: {
        Row: {
          category_id: string | null
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          item_type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          item_type: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          item_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "navbar_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_item_details: {
        Row: {
          color_name: string | null
          created_at: string | null
          id: string
          order_id: string
          pricing_details: Json | null
          pricing_mode: string
          product_name: string
          quantity: number
          size_name: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          pricing_details?: Json | null
          pricing_mode?: string
          product_name: string
          quantity: number
          size_name?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          pricing_details?: Json | null
          pricing_mode?: string
          product_name?: string
          quantity?: number
          size_name?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          product_inventory_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          product_inventory_id?: string | null
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          product_inventory_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          combo_applied: boolean | null
          contact_number: string
          created_at: string | null
          customer_email: string
          customer_name: string
          delivery_address: string
          delivery_charge: number
          delivery_location_id: string | null
          id: string
          order_number: string
          paid_amount: number
          payment_method_id: string | null
          payment_percentage: number
          payment_screenshot_url: string | null
          pricing_breakdown: Json | null
          promocode_discount: number | null
          promocode_used: string | null
          remaining_amount: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total_amount: number
          updated_at: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          combo_applied?: boolean | null
          contact_number: string
          created_at?: string | null
          customer_email: string
          customer_name: string
          delivery_address: string
          delivery_charge?: number
          delivery_location_id?: string | null
          id?: string
          order_number?: string
          paid_amount?: number
          payment_method_id?: string | null
          payment_percentage?: number
          payment_screenshot_url?: string | null
          pricing_breakdown?: Json | null
          promocode_discount?: number | null
          promocode_used?: string | null
          remaining_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          combo_applied?: boolean | null
          contact_number?: string
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          delivery_address?: string
          delivery_charge?: number
          delivery_location_id?: string | null
          id?: string
          order_number?: string
          paid_amount?: number
          payment_method_id?: string | null
          payment_percentage?: number
          payment_screenshot_url?: string | null
          pricing_breakdown?: Json | null
          promocode_discount?: number | null
          promocode_used?: string | null
          remaining_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_location_id_fkey"
            columns: ["delivery_location_id"]
            isOneToOne: false
            referencedRelation: "delivery_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          qr_code_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          qr_code_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          qr_code_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          color_variant_id: string | null
          created_at: string | null
          id: string
          image_type: string | null
          image_url: string
          is_primary: boolean | null
          product_id: string
          storage_path: string | null
        }
        Insert: {
          color_variant_id?: string | null
          created_at?: string | null
          id?: string
          image_type?: string | null
          image_url: string
          is_primary?: boolean | null
          product_id: string
          storage_path?: string | null
        }
        Update: {
          color_variant_id?: string | null
          created_at?: string | null
          id?: string
          image_type?: string | null
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_images_color_variant_id"
            columns: ["color_variant_id"]
            isOneToOne: false
            referencedRelation: "color_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_product_images_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
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
      product_inventory: {
        Row: {
          available_stock: number | null
          category_id: string | null
          category_name: string | null
          color_name: string | null
          color_variant_id: string | null
          cost_price: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          low_stock_threshold: number | null
          product_id: string
          product_name: string
          reserved_stock: number
          selling_price: number | null
          size_code: string | null
          size_name: string | null
          size_variant_id: string | null
          sku: string
          stock_quantity: number
          subcategory_id: string | null
          subcategory_name: string | null
          updated_at: string | null
        }
        Insert: {
          available_stock?: number | null
          category_id?: string | null
          category_name?: string | null
          color_name?: string | null
          color_variant_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          low_stock_threshold?: number | null
          product_id: string
          product_name: string
          reserved_stock?: number
          selling_price?: number | null
          size_code?: string | null
          size_name?: string | null
          size_variant_id?: string | null
          sku: string
          stock_quantity?: number
          subcategory_id?: string | null
          subcategory_name?: string | null
          updated_at?: string | null
        }
        Update: {
          available_stock?: number | null
          category_id?: string | null
          category_name?: string | null
          color_name?: string | null
          color_variant_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          low_stock_threshold?: number | null
          product_id?: string
          product_name?: string
          reserved_stock?: number
          selling_price?: number | null
          size_code?: string | null
          size_name?: string | null
          size_variant_id?: string | null
          sku?: string
          stock_quantity?: number
          subcategory_id?: string | null
          subcategory_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_inventory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_color_variant_id_fkey"
            columns: ["color_variant_id"]
            isOneToOne: false
            referencedRelation: "color_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_size_variant_id_fkey"
            columns: ["size_variant_id"]
            isOneToOne: false
            referencedRelation: "size_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          color_has_size_variants: boolean | null
          cost_price: number
          created_at: string | null
          description: string | null
          has_color_variants: boolean | null
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
          color_has_size_variants?: boolean | null
          cost_price: number
          created_at?: string | null
          description?: string | null
          has_color_variants?: boolean | null
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
          color_has_size_variants?: boolean | null
          cost_price?: number
          created_at?: string | null
          description?: string | null
          has_color_variants?: boolean | null
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
          contact_number: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          contact_number?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          contact_number?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      promocodes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_percentage: number
          id: string
          is_active: boolean | null
          minimum_order_amount: number | null
          updated_at: string | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_percentage: number
          id?: string
          is_active?: boolean | null
          minimum_order_amount?: number | null
          updated_at?: string | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          minimum_order_amount?: number | null
          updated_at?: string | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
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
        }
        Insert: {
          color_variant_id: string
          created_at?: string | null
          id?: string
          size_code?: string | null
          size_name: string
        }
        Update: {
          color_variant_id?: string
          created_at?: string | null
          id?: string
          size_code?: string | null
          size_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_size_variants_color_variant_id"
            columns: ["color_variant_id"]
            isOneToOne: false
            referencedRelation: "color_variants"
            referencedColumns: ["id"]
          },
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
          id: string
          image_url: string | null
          minimum_quantity: number
          name: string
          selling_price: number
          status: Database["public"]["Enums"]["category_status"]
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          minimum_quantity?: number
          name: string
          selling_price: number
          status?: Database["public"]["Enums"]["category_status"]
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          minimum_quantity?: number
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
      top_bar_text: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      inventory_overview: {
        Row: {
          available_stock: number | null
          category_name: string | null
          created_at: string | null
          id: string | null
          low_stock_threshold: number | null
          product_name: string | null
          product_sku: string | null
          reserved_stock: number | null
          size_name: string | null
          stock_quantity: number | null
          stock_status: string | null
          subcategory_name: string | null
          updated_at: string | null
          variant_name: string | null
        }
        Relationships: []
      }
      low_stock_alerts: {
        Row: {
          available_stock: number | null
          category_name: string | null
          id: string | null
          low_stock_threshold: number | null
          product_name: string | null
          product_sku: string | null
          reserved_stock: number | null
          size_name: string | null
          stock_needed: number | null
          stock_quantity: number | null
          subcategory_name: string | null
          updated_at: string | null
          variant_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_update_inventory: {
        Args: { p_updates: Json }
        Returns: {
          success_count: number
          error_count: number
          errors: Json
        }[]
      }
      export_inventory_data: {
        Args: { p_include_inactive?: boolean }
        Returns: {
          product_id: string
          sku: string
          product_name: string
          category_name: string
          subcategory_name: string
          color_name: string
          size_name: string
          stock_quantity: number
          reserved_stock: number
          available_stock: number
          low_stock_threshold: number
          cost_price: number
          selling_price: number
          stock_status: string
          last_updated: string
        }[]
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_product_sku: {
        Args: {
          p_product_name: string
          p_color_name?: string
          p_size_name?: string
        }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_detailed_inventory_analytics: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric_name: string
          metric_value: number
          description: string
        }[]
      }
      get_inventory_history: {
        Args: { p_product_id?: string; p_days_back?: number }
        Returns: {
          action_type: string
          product_name: string
          variant_name: string
          size_name: string
          change_amount: number
          reason: string
          created_at: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      reconcile_inventory: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      safe_update_stock: {
        Args: {
          p_product_id: string
          p_stock_change: number
          p_color_variant_id?: string
          p_size_variant_id?: string
          p_reservation_change?: number
          p_reason?: string
        }
        Returns: boolean
      }
      validate_inventory_integrity: {
        Args: Record<PropertyKey, never>
        Returns: {
          inventory_id: string
          product_name: string
          issue_type: string
          description: string
        }[]
      }
    }
    Enums: {
      category_status: "on" | "off"
      order_status:
        | "pending_payment"
        | "payment_confirmed"
        | "on_delivery"
        | "delivered"
        | "cancelled"
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
      order_status: [
        "pending_payment",
        "payment_confirmed",
        "on_delivery",
        "delivered",
        "cancelled",
      ],
      product_status: ["active", "inactive"],
      user_role: ["admin", "customer"],
    },
  },
} as const
