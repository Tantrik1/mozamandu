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
      analytics_settings: {
        Row: {
          created_at: string | null
          facebook_pixel_id: string | null
          google_analytics_id: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          facebook_pixel_id?: string | null
          google_analytics_id?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          facebook_pixel_id?: string | null
          google_analytics_id?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_faqs: {
        Row: {
          answer: string
          blog_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          blog_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          blog_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_faqs_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_products: {
        Row: {
          blog_id: string
          created_at: string | null
          display_order: number | null
          id: string
          product_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_products_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      blogs: {
        Row: {
          author_name: string | null
          category_id: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_featured: boolean | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          published_at: string | null
          reading_time_minutes: number | null
          slug: string
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_name?: string | null
          category_id?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_name?: string | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blogs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chatbot_knowledge: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          question?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      color_variants: {
        Row: {
          color_code: string | null
          color_id: string | null
          color_name: string
          created_at: string | null
          display_order: number | null
          has_sizes: boolean | null
          id: string
          image_url: string | null
          is_active: boolean | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          color_code?: string | null
          color_id?: string | null
          color_name: string
          created_at?: string | null
          display_order?: number | null
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          color_code?: string | null
          color_id?: string | null
          color_name?: string
          created_at?: string | null
          display_order?: number | null
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "color_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      colors: {
        Row: {
          created_at: string | null
          hex_code: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hex_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hex_code?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
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
          pricing_mode: string | null
          product_inventory_id: string | null
          product_name: string
          quantity: number
          size_name: string | null
          sku: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          pricing_details?: Json | null
          pricing_mode?: string | null
          product_inventory_id?: string | null
          product_name: string
          quantity?: number
          size_name?: string | null
          sku?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          pricing_details?: Json | null
          pricing_mode?: string | null
          product_inventory_id?: string | null
          product_name?: string
          quantity?: number
          size_name?: string | null
          sku?: string | null
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
          {
            foreignKeyName: "customer_order_item_details_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
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
        ]
      }
      customer_orders: {
        Row: {
          contact_number: string
          created_at: string | null
          customer_email: string
          customer_name: string
          delivery_address: string
          delivery_charge: number
          delivery_location_id: string | null
          id: string
          order_number: string
          paid_amount: number | null
          payment_method_id: string | null
          payment_screenshot_url: string | null
          pricing_breakdown: Json | null
          promocode_discount: number | null
          promocode_used: string | null
          remaining_amount: number | null
          status: string | null
          subtotal: number
          total_amount: number
          updated_at: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          contact_number: string
          created_at?: string | null
          customer_email: string
          customer_name: string
          delivery_address: string
          delivery_charge?: number
          delivery_location_id?: string | null
          id?: string
          order_number: string
          paid_amount?: number | null
          payment_method_id?: string | null
          payment_screenshot_url?: string | null
          pricing_breakdown?: Json | null
          promocode_discount?: number | null
          promocode_used?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          contact_number?: string
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          delivery_address?: string
          delivery_charge?: number
          delivery_location_id?: string | null
          id?: string
          order_number?: string
          paid_amount?: number | null
          payment_method_id?: string | null
          payment_screenshot_url?: string | null
          pricing_breakdown?: Json | null
          promocode_discount?: number | null
          promocode_used?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
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
          charge: number
          created_at: string | null
          delivery_price: number | null
          display_order: number | null
          id: string
          is_active: boolean | null
          place_name: string
          updated_at: string | null
        }
        Insert: {
          charge?: number
          created_at?: string | null
          delivery_price?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          place_name: string
          updated_at?: string | null
        }
        Update: {
          charge?: number
          created_at?: string | null
          delivery_price?: number | null
          display_order?: number | null
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
          discount_percentage: number
          id: string
          is_active: boolean | null
          max_quantity: number | null
          min_quantity: number
          price_per_unit: number | null
          subcategory_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity: number
          price_per_unit?: number | null
          subcategory_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number
          price_per_unit?: number | null
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
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string | null
          new_reserved: number | null
          new_stock: number | null
          order_id: string | null
          order_number: string | null
          previous_reserved: number | null
          previous_stock: number | null
          quantity_change: number
          reason: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          new_reserved?: number | null
          new_stock?: number | null
          order_id?: string | null
          order_number?: string | null
          previous_reserved?: number | null
          previous_stock?: number | null
          quantity_change?: number
          reason?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          new_reserved?: number | null
          new_stock?: number | null
          order_id?: string | null
          order_number?: string | null
          previous_reserved?: number | null
          previous_stock?: number | null
          quantity_change?: number
          reason?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
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
          pricing_mode: string | null
          product_inventory_id: string | null
          product_name: string
          quantity: number
          size_name: string | null
          sku: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          pricing_details?: Json | null
          pricing_mode?: string | null
          product_inventory_id?: string | null
          product_name: string
          quantity?: number
          size_name?: string | null
          sku?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          color_name?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          pricing_details?: Json | null
          pricing_mode?: string | null
          product_inventory_id?: string | null
          product_name?: string
          quantity?: number
          size_name?: string | null
          sku?: string | null
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
          {
            foreignKeyName: "order_item_details_product_inventory_id_fkey"
            columns: ["product_inventory_id"]
            isOneToOne: false
            referencedRelation: "product_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
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
        ]
      }
      orders: {
        Row: {
          contact_number: string
          created_at: string | null
          customer_email: string
          customer_name: string
          delivery_address: string
          delivery_charge: number
          delivery_location_id: string | null
          id: string
          order_number: string
          paid_amount: number | null
          payment_method_id: string | null
          payment_screenshot_url: string | null
          pricing_breakdown: Json | null
          promocode_discount: number | null
          promocode_used: string | null
          remaining_amount: number | null
          status: string | null
          subtotal: number
          total_amount: number
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          contact_number: string
          created_at?: string | null
          customer_email: string
          customer_name: string
          delivery_address: string
          delivery_charge?: number
          delivery_location_id?: string | null
          id?: string
          order_number: string
          paid_amount?: number | null
          payment_method_id?: string | null
          payment_screenshot_url?: string | null
          pricing_breakdown?: Json | null
          promocode_discount?: number | null
          promocode_used?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          contact_number?: string
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          delivery_address?: string
          delivery_charge?: number
          delivery_location_id?: string | null
          id?: string
          order_number?: string
          paid_amount?: number | null
          payment_method_id?: string | null
          payment_screenshot_url?: string | null
          pricing_breakdown?: Json | null
          promocode_discount?: number | null
          promocode_used?: string | null
          remaining_amount?: number | null
          status?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
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
          account_details: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
          qr_code_url: string | null
          updated_at: string | null
        }
        Insert: {
          account_details?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
          qr_code_url?: string | null
          updated_at?: string | null
        }
        Update: {
          account_details?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          qr_code_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_faqs: {
        Row: {
          answer: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          product_id: string
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          product_id: string
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          product_id?: string
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
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
          category_name: string | null
          color_name: string | null
          color_variant_id: string | null
          cost_price: number
          created_at: string | null
          id: string
          is_active: boolean | null
          low_stock_threshold: number | null
          product_id: string
          product_name: string
          reserved_stock: number | null
          selling_price: number | null
          size_name: string | null
          size_variant_id: string | null
          sku: string
          stock_quantity: number | null
          subcategory_name: string | null
          updated_at: string | null
        }
        Insert: {
          available_stock?: number | null
          category_name?: string | null
          color_name?: string | null
          color_variant_id?: string | null
          cost_price?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          low_stock_threshold?: number | null
          product_id: string
          product_name: string
          reserved_stock?: number | null
          selling_price?: number | null
          size_name?: string | null
          size_variant_id?: string | null
          sku: string
          stock_quantity?: number | null
          subcategory_name?: string | null
          updated_at?: string | null
        }
        Update: {
          available_stock?: number | null
          category_name?: string | null
          color_name?: string | null
          color_variant_id?: string | null
          cost_price?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          low_stock_threshold?: number | null
          product_id?: string
          product_name?: string
          reserved_stock?: number | null
          selling_price?: number | null
          size_name?: string | null
          size_variant_id?: string | null
          sku?: string
          stock_quantity?: number | null
          subcategory_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
        ]
      }
      product_reviews: {
        Row: {
          created_at: string | null
          id: string
          is_approved: boolean | null
          product_id: string
          rating: number
          review_text: string | null
          reviewer_email: string | null
          reviewer_name: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          product_id: string
          rating: number
          review_text?: string | null
          reviewer_email?: string | null
          reviewer_name: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          review_text?: string | null
          reviewer_email?: string | null
          reviewer_name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          additional_images: string[] | null
          care_instructions: string[] | null
          category_id: string | null
          color_has_size_variants: boolean | null
          cost_price: number
          created_at: string | null
          description: string | null
          has_color_variants: boolean | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          material_composition: string | null
          name: string
          selling_price: number | null
          status: string | null
          subcategory_id: string | null
          updated_at: string | null
        }
        Insert: {
          additional_images?: string[] | null
          care_instructions?: string[] | null
          category_id?: string | null
          color_has_size_variants?: boolean | null
          cost_price?: number
          created_at?: string | null
          description?: string | null
          has_color_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          material_composition?: string | null
          name: string
          selling_price?: number | null
          status?: string | null
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_images?: string[] | null
          care_instructions?: string[] | null
          category_id?: string | null
          color_has_size_variants?: boolean | null
          cost_price?: number
          created_at?: string | null
          description?: string | null
          has_color_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          material_composition?: string | null
          name?: string
          selling_price?: number | null
          status?: string | null
          subcategory_id?: string | null
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
          address: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      promocodes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_percentage: number
          discount_type: string
          id: string
          is_active: boolean | null
          max_discount: number | null
          minimum_order_amount: number | null
          updated_at: string | null
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_percentage: number
          discount_type: string
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          minimum_order_amount?: number | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number
          discount_type?: string
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          minimum_order_amount?: number | null
          updated_at?: string | null
          usage_limit?: number | null
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
          display_order: number | null
          id: string
          is_active: boolean | null
          size_code: string | null
          size_name: string
          updated_at: string | null
        }
        Insert: {
          color_variant_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          size_code?: string | null
          size_name: string
          updated_at?: string | null
        }
        Update: {
          color_variant_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          size_code?: string | null
          size_name?: string
          updated_at?: string | null
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
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          max_selling_price: number | null
          min_selling_price: number | null
          minimum_quantity: number | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          max_selling_price?: number | null
          min_selling_price?: number | null
          minimum_quantity?: number | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          max_selling_price?: number | null
          min_selling_price?: number | null
          minimum_quantity?: number | null
          name?: string
          status?: string | null
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
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          link: string | null
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      generate_product_sku: {
        Args: {
          p_color_name?: string
          p_product_name: string
          p_size_name?: string
        }
        Returns: string
      }
      is_admin: { Args: { _user_id?: string }; Returns: boolean }
      safe_update_stock: {
        Args: {
          p_color_variant_id?: string
          p_product_id: string
          p_reason?: string
          p_reservation_change?: number
          p_size_variant_id?: string
          p_stock_change: number
          p_transaction_type?: string
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
