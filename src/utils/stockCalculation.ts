
import { supabase } from '@/integrations/supabase/client';

export interface ProductStockSummary {
  productId: string;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  variants: VariantStock[];
}

export interface VariantStock {
  id: string;
  sku: string;
  colorName?: string;
  sizeName?: string;
  stockQuantity: number;
  availableStock: number;
  reservedStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  costPrice: number;
  sellingPrice: number;
}

export interface StockCalculationResult {
  totalStock: number;
  availableStock?: number;
  reservedStock?: number;
  colorBreakdown?: Array<{
    colorName: string;
    stock: number;
    sizeBreakdown?: Array<{
      sizeName: string;
      stock: number;
    }>;
  }>;
}

export async function getProductStockSummary(productId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('available_stock')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).reduce((total, item) => total + (item.available_stock || 0), 0);
  } catch (error) {
    console.error('Error calculating product stock:', error);
    return 0;
  }
}

export async function calculateProductStock(productId: string): Promise<StockCalculationResult> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error) throw error;

    const totalStock = (data || []).reduce((sum, item) => sum + (item.stock_quantity || 0), 0);
    const availableStock = (data || []).reduce((sum, item) => sum + (item.available_stock || 0), 0);
    const reservedStock = (data || []).reduce((sum, item) => sum + (item.reserved_stock || 0), 0);

    // Group by color
    const colorGroups = (data || []).reduce((groups, item) => {
      const colorName = item.color_name || 'Default';
      if (!groups[colorName]) {
        groups[colorName] = [];
      }
      groups[colorName].push(item);
      return groups;
    }, {} as Record<string, any[]>);

    const colorBreakdown = Object.entries(colorGroups).map(([colorName, items]) => ({
      colorName,
      stock: items.reduce((sum, item) => sum + (item.available_stock || 0), 0),
      sizeBreakdown: items.map(item => ({
        sizeName: item.size_name || 'One Size',
        stock: item.available_stock || 0
      }))
    }));

    return {
      totalStock,
      availableStock,
      reservedStock,
      colorBreakdown
    };
  } catch (error) {
    console.error('Error calculating product stock:', error);
    return { totalStock: 0 };
  }
}

export async function getDetailedProductStock(productId: string): Promise<ProductStockSummary> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error) throw error;

    const variants: VariantStock[] = (data || []).map(item => ({
      id: item.id,
      sku: item.sku,
      colorName: item.color_name,
      sizeName: item.size_name,
      stockQuantity: item.stock_quantity,
      availableStock: item.available_stock || 0,
      reservedStock: item.reserved_stock || 0,
      lowStockThreshold: item.low_stock_threshold || 10,
      isLowStock: (item.available_stock || 0) <= (item.low_stock_threshold || 10),
      isOutOfStock: (item.available_stock || 0) === 0,
      costPrice: item.cost_price,
      sellingPrice: item.selling_price || 0,
    }));

    const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const availableStock = variants.reduce((sum, v) => sum + v.availableStock, 0);
    const reservedStock = variants.reduce((sum, v) => sum + v.reservedStock, 0);

    return {
      productId,
      totalStock,
      availableStock,
      reservedStock,
      variants,
    };
  } catch (error) {
    console.error('Error fetching detailed product stock:', error);
    return {
      productId,
      totalStock: 0,
      availableStock: 0,
      reservedStock: 0,
      variants: [],
    };
  }
}

export async function getVariantStock(
  productId: string,
  colorVariantId?: string,
  sizeVariantId?: string
): Promise<VariantStock | null> {
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

    const { data, error } = await query.limit(1);

    if (error) throw error;

    if (!data || data.length === 0) return null;

    const item = data[0];

    return {
      id: item.id,
      sku: item.sku,
      colorName: item.color_name,
      sizeName: item.size_name,
      stockQuantity: item.stock_quantity,
      availableStock: item.available_stock || 0,
      reservedStock: item.reserved_stock || 0,
      lowStockThreshold: item.low_stock_threshold || 10,
      isLowStock: (item.available_stock || 0) <= (item.low_stock_threshold || 10),
      isOutOfStock: (item.available_stock || 0) === 0,
      costPrice: item.cost_price,
      sellingPrice: item.selling_price || 0,
    };
  } catch (error) {
    console.error('Error fetching variant stock:', error);
    return null;
  }
}

export async function checkProductAvailability(
  productId: string,
  colorVariantId?: string,
  sizeVariantId?: string,
  requestedQuantity: number = 1
): Promise<boolean> {
  try {
    const variant = await getVariantStock(productId, colorVariantId, sizeVariantId);
    return variant ? variant.availableStock >= requestedQuantity : false;
  } catch (error) {
    console.error('Error checking availability:', error);
    return false;
  }
}

export async function getExactVariantData(
  productId: string,
  colorVariantId?: string,
  sizeVariantId?: string
): Promise<{
  id: string;
  sku: string;
  stock: number;
  availableStock: number;
  reservedStock: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  costPrice: number;
  sellingPrice: number;
} | null> {
  try {
    let query = supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true);

    // Build the exact query based on variant IDs
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

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      sku: data.sku,
      stock: data.stock_quantity,
      availableStock: data.available_stock || 0,
      reservedStock: data.reserved_stock || 0,
      isOutOfStock: (data.available_stock || 0) === 0,
      isLowStock: (data.available_stock || 0) <= (data.low_stock_threshold || 10),
      costPrice: data.cost_price,
      sellingPrice: data.selling_price || 0,
    };
  } catch (error) {
    console.error('Error fetching exact variant data:', error);
    return null;
  }
}
