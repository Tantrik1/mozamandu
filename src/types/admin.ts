
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
  // Remove stock_quantity as it's now in product_inventory table
}

export interface ColorVariant {
  id?: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: SizeVariant[];
  // Remove stock_quantity as it's now in product_inventory table
}

export interface SizeVariant {
  id?: string;
  size_name: string;
  size_code?: string;
  // Remove stock_quantity as it's now in product_inventory table
}
