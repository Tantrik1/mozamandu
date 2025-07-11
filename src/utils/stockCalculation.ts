
import { supabase } from '@/integrations/supabase/client';

export interface ProductStockSummary {
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  hasVariants: boolean;
  variants: VariantStock[];
}

export interface VariantStock {
  id: string;
  sku: string;
  colorName?: string;
  sizeName?: string;
  stockQuantity: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export async function getProductStockSummary(productId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('available_stock')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error) throw error;

    if (!data || data.length === 0) {
      return 0;
    }

    return data.reduce((total, item) => total + (item.available_stock || 0), 0);
  } catch (error) {
    console.error('Error calculating stock summary:', error);
    return 0;
  }
}

export async function getDetailedProductStock(productId: string): Promise<ProductStockSummary> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('color_name, size_name');

    if (error) throw error;

    const variants: VariantStock[] = (data || []).map(item => ({
      id: item.id,
      sku: item.sku,
      colorName: item.color_name || undefined,
      sizeName: item.size_name || undefined,
      stockQuantity: item.stock_quantity,
      reservedStock: item.reserved_stock,
      availableStock: item.available_stock || 0,
      lowStockThreshold: item.low_stock_threshold || 10,
      isLowStock: (item.available_stock || 0) <= (item.low_stock_threshold || 10),
      isOutOfStock: (item.available_stock || 0) === 0,
    }));

    const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const reservedStock = variants.reduce((sum, v) => sum + v.reservedStock, 0);
    const availableStock = variants.reduce((sum, v) => sum + v.availableStock, 0);

    return {
      totalStock,
      reservedStock,
      availableStock,
      hasVariants: variants.length > 1,
      variants,
    };
  } catch (error) {
    console.error('Error getting detailed product stock:', error);
    return {
      totalStock: 0,
      reservedStock: 0,
      availableStock: 0,
      hasVariants: false,
      variants: [],
    };
  }
}

export async function getVariantStock(productId: string, colorVariantId?: string, sizeVariantId?: string): Promise<VariantStock | null> {
  try {
    let query = supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (colorVariantId) {
      query = query.eq('color_variant_id', colorVariantId);
    } else {
      query = query.is('color_variant_id', null);
    }

    if (sizeVariantId) {
      query = query.eq('size_variant_id', sizeVariantId);
    } else {
      query = query.is('size_variant_id', null);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No inventory record found
      }
      throw error;
    }

    return {
      id: data.id,
      sku: data.sku,
      colorName: data.color_name || undefined,
      sizeName: data.size_name || undefined,
      stockQuantity: data.stock_quantity,
      reservedStock: data.reserved_stock,
      availableStock: data.available_stock || 0,
      lowStockThreshold: data.low_stock_threshold || 10,
      isLowStock: (data.available_stock || 0) <= (data.low_stock_threshold || 10),
      isOutOfStock: (data.available_stock || 0) === 0,
    };
  } catch (error) {
    console.error('Error getting variant stock:', error);
    return null;
  }
}

export async function checkStockAvailability(productId: string, quantity: number, colorVariantId?: string, sizeVariantId?: string): Promise<boolean> {
  const variantStock = await getVariantStock(productId, colorVariantId, sizeVariantId);
  return variantStock ? variantStock.availableStock >= quantity : false;
}
