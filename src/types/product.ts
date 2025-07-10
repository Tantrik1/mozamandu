
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

export interface Category {
  id: string;
  name: string;
  status: 'on' | 'off';
  description?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  status: 'on' | 'off';
  description?: string;
  image_url?: string;
  selling_price: number;
  minimum_quantity: number;
}
