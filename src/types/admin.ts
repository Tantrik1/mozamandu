
export interface Product {
  id: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price?: number;
  category_id: string;
  subcategory_id: string;
  is_featured: boolean;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  status: 'active' | 'inactive';
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: SizeVariant[];
}

export interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  category_id: string;
  subcategory_id: string;
  category_name?: string;
  subcategory_name?: string;
  color_name?: string;
  size_name?: string;
  size_code?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold?: number;
  cost_price?: number;
  selling_price?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventorySummary {
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  variant_count: number;
}

export interface Order {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  shipping_method: string;
  order_notes: string;
  user_id: string | null;
  contact_number: string;
  delivery_address: string;
}

export interface CustomerOrder {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  total_amount: number;
  payment_method: string;
  shipping_method: string;
  order_notes: string;
  user_id: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_inventory_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CustomerOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_inventory_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InventoryOverview {
  id?: string;
  product_name?: string;
  category_name?: string;
  subcategory_name?: string;
  variant_name?: string;
  size_name?: string;
  product_sku?: string;
  stock_quantity?: number;
  reserved_stock?: number;
  available_stock?: number;
  low_stock_threshold?: number;
  stock_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LowStockAlert {
  id?: string;
  product_id?: string;
  product_name?: string;
  category_name?: string;
  subcategory_name?: string;
  variant_name?: string;
  size_name?: string;
  product_sku?: string;
  sku?: string;
  color_name?: string | null;
  stock_quantity?: number;
  reserved_stock?: number;
  available_stock?: number;
  low_stock_threshold: number;
  stock_needed?: number;
  updated_at?: string;
}

export interface InventoryAnalytics {
  total_items: number;
  active_items: number;
  total_available_stock: number;
  total_reserved_stock: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_stock_value: number;
}

export interface InventoryChange {
  action_type: string;
  product_name: string;
  variant_name: string;
  size_name: string;
  change_amount: number;
  reason: string;
  created_at: string;
}
