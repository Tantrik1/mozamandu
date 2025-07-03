
import { supabase } from '@/integrations/supabase/client';
import { getVariantStockInfo, getStockBreakdown } from './unifiedStockManager';

export interface StockCalculationResult {
  totalStock: number;
  colorBreakdown?: Array<{
    colorName: string;
    stock: number;
    sizeBreakdown?: Array<{
      sizeName: string;
      stock: number;
    }>;
  }>;
}

export async function calculateProductStock(productId: string): Promise<StockCalculationResult> {
  try {
    console.log('=== CALCULATING PRODUCT STOCK FROM BREAKDOWN ===');
    console.log('Product ID:', productId);
    
    // Get product details first
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants, stock_quantity, name, status')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productId, productError);
      return { totalStock: 0 };
    }

    if (product.status !== 'active') {
      console.log('Product is inactive:', product.name);
      return { totalStock: 0 };
    }

    console.log('Product details:', { 
      name: product.name,
      has_color_variants: product.has_color_variants, 
      color_has_size_variants: product.color_has_size_variants,
      stock_quantity: product.stock_quantity 
    });

    // Use the new breakdown table for accurate stock calculation
    const { data: breakdownData, error: breakdownError } = await supabase
      .from('product_variants_breakdown')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (breakdownError) {
      console.error('Error fetching breakdown data:', breakdownError);
      return { totalStock: 0 };
    }

    if (!breakdownData || breakdownData.length === 0) {
      console.log('No breakdown data found for product:', productId);
      return { totalStock: product.stock_quantity || 0 };
    }

    // Calculate total stock from breakdown
    const totalStock = breakdownData.reduce((sum, variant) => sum + variant.stock_quantity, 0);

    if (!product.has_color_variants) {
      return { totalStock };
    }

    // Group by color for breakdown
    const colorMap = new Map();
    
    breakdownData.forEach(variant => {
      if (variant.color_variant_id) {
        if (!colorMap.has(variant.color_variant_id)) {
          colorMap.set(variant.color_variant_id, {
            colorName: variant.color_name,
            stock: 0,
            sizeBreakdown: []
          });
        }
        
        const colorVariant = colorMap.get(variant.color_variant_id);
        colorVariant.stock += variant.stock_quantity;
        
        if (variant.size_variant_id) {
          colorVariant.sizeBreakdown.push({
            sizeName: variant.size_name,
            stock: variant.stock_quantity
          });
        }
      }
    });

    const colorBreakdown = Array.from(colorMap.values());

    return { 
      totalStock, 
      colorBreakdown 
    };
  } catch (error) {
    console.error('Error in calculateProductStock:', error);
    return { totalStock: 0 };
  }
}

export async function getProductStockSummary(productId: string): Promise<number> {
  try {
    // Use the breakdown table for accurate total
    const { data, error } = await supabase.rpc('calculate_product_stock_from_breakdown', {
      p_product_id: productId
    });

    if (error) {
      console.error('Error getting product stock summary:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error getting product stock summary:', error);
    return 0;
  }
}

// Main stock validation function using breakdown table
export async function validateVariantStock(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null,
  requestedQuantity: number = 1
): Promise<{ isValid: boolean; availableStock: number; errorMessage?: string }> {
  try {
    console.log('=== STOCK VALIDATION START ===');
    console.log('Validating:', { productId, colorVariantId, sizeVariantId, requestedQuantity });

    const stockInfo = await getVariantStockInfo(productId, colorVariantId, sizeVariantId);
    
    if (!stockInfo.isValid) {
      return {
        isValid: false,
        availableStock: 0,
        errorMessage: stockInfo.errorMessage || 'Stock validation failed'
      };
    }

    const isValid = stockInfo.stockAmount >= requestedQuantity;
    
    console.log(`=== STOCK VALIDATION RESULT ===`);
    console.log(`Stock source: ${stockInfo.stockSource}`);
    console.log(`Available: ${stockInfo.stockAmount}, Requested: ${requestedQuantity}, Valid: ${isValid}`);

    return {
      isValid,
      availableStock: stockInfo.stockAmount,
      errorMessage: !isValid ? 
        `Only ${stockInfo.stockAmount} items available` : undefined
    };
  } catch (error) {
    console.error('Error in validateVariantStock:', error);
    return {
      isValid: false,
      availableStock: 0,
      errorMessage: 'Error checking stock availability'
    };
  }
}

// Helper function to get all available variants for a product using breakdown table
export async function getAvailableVariants(productId: string) {
  try {
    const { data, error } = await supabase
      .from('product_variants_breakdown')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .gt('stock_quantity', 0);
    
    if (error) {
      console.error('Error getting available variants:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting available variants:', error);
    return [];
  }
}

// Helper function to check if a specific variant combination exists
export async function checkVariantExists(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null
): Promise<boolean> {
  try {
    const stockInfo = await getVariantStockInfo(productId, colorVariantId, sizeVariantId);
    return stockInfo.isValid;
  } catch (error) {
    console.error('Error checking variant existence:', error);
    return false;
  }
}
