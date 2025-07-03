
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

// Fallback function to calculate stock from existing tables if breakdown table is not available
export async function calculateProductStockFallback(productId: string): Promise<StockCalculationResult> {
  try {
    console.log('=== CALCULATING PRODUCT STOCK (FALLBACK) ===');
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

    if (!product.has_color_variants) {
      return { totalStock: product.stock_quantity || 0 };
    }

    // Get color variants
    const { data: colorVariants, error: colorError } = await supabase
      .from('color_variants')
      .select('*')
      .eq('product_id', productId);

    if (colorError) {
      console.error('Error fetching color variants:', colorError);
      return { totalStock: product.stock_quantity || 0 };
    }

    if (!colorVariants || colorVariants.length === 0) {
      return { totalStock: product.stock_quantity || 0 };
    }

    let totalStock = 0;
    const colorBreakdown: Array<{
      colorName: string;
      stock: number;
      sizeBreakdown?: Array<{
        sizeName: string;
        stock: number;
      }>;
    }> = [];

    for (const colorVariant of colorVariants) {
      if (!colorVariant.has_sizes) {
        // Color variant without sizes
        totalStock += colorVariant.stock_quantity || 0;
        colorBreakdown.push({
          colorName: colorVariant.color_name,
          stock: colorVariant.stock_quantity || 0
        });
      } else {
        // Color variant with sizes
        const { data: sizeVariants, error: sizeError } = await supabase
          .from('size_variants')
          .select('*')
          .eq('color_variant_id', colorVariant.id);

        if (sizeError) {
          console.error('Error fetching size variants:', sizeError);
          continue;
        }

        const sizeBreakdown: Array<{
          sizeName: string;
          stock: number;
        }> = [];

        let colorStock = 0;
        if (sizeVariants) {
          for (const sizeVariant of sizeVariants) {
            const sizeStock = sizeVariant.stock_quantity || 0;
            colorStock += sizeStock;
            totalStock += sizeStock;
            sizeBreakdown.push({
              sizeName: sizeVariant.size_name,
              stock: sizeStock
            });
          }
        }

        colorBreakdown.push({
          colorName: colorVariant.color_name,
          stock: colorStock,
          sizeBreakdown
        });
      }
    }

    return { 
      totalStock, 
      colorBreakdown 
    };
  } catch (error) {
    console.error('Error in calculateProductStockFallback:', error);
    return { totalStock: 0 };
  }
}

export async function calculateProductStock(productId: string): Promise<StockCalculationResult> {
  try {
    console.log('=== CALCULATING PRODUCT STOCK ===');
    console.log('Product ID:', productId);
    
    // Use fallback method directly since RPC function doesn't exist
    return await calculateProductStockFallback(productId);
  } catch (error) {
    console.error('Error in calculateProductStock:', error);
    return { totalStock: 0 };
  }
}

export async function getProductStockSummary(productId: string): Promise<number> {
  try {
    // Use fallback method directly since RPC function doesn't exist
    const result = await calculateProductStockFallback(productId);
    return result.totalStock;
  } catch (error) {
    console.error('Error getting product stock summary:', error);
    return 0;
  }
}

// Main stock validation function
export async function validateVariantStock(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null,
  requestedQuantity: number = 1
): Promise<{ isValid: boolean; availableStock: number; errorMessage?: string }> {
  try {
    console.log('=== STOCK VALIDATION START ===');
    console.log('Validating:', { productId, colorVariantId, sizeVariantId, requestedQuantity });

    // Try using unified stock manager if available
    try {
      const stockInfo = await getVariantStockInfo(productId, colorVariantId, sizeVariantId);
      
      if (stockInfo.isValid) {
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
      }
    } catch (unifiedError) {
      console.log('Unified stock manager not available, using fallback');
    }

    // Fallback validation
    const stockResult = await calculateProductStockFallback(productId);
    const availableStock = stockResult.totalStock;
    const isValid = availableStock >= requestedQuantity;

    return {
      isValid,
      availableStock,
      errorMessage: !isValid ? 
        `Only ${availableStock} items available` : undefined
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

// Helper function to get all available variants for a product
export async function getAvailableVariants(productId: string) {
  try {
    // Fallback to color variants
    const { data, error } = await supabase
      .from('color_variants')
      .select('*')
      .eq('product_id', productId)
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
    // Try using unified stock manager
    try {
      const stockInfo = await getVariantStockInfo(productId, colorVariantId, sizeVariantId);
      return stockInfo.isValid;
    } catch (unifiedError) {
      console.log('Unified stock manager not available');
    }

    // Fallback check
    if (!colorVariantId && !sizeVariantId) {
      // Check if product exists
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('status', 'active')
        .single();
      
      return !error && !!data;
    }

    if (colorVariantId && !sizeVariantId) {
      // Check color variant
      const { data, error } = await supabase
        .from('color_variants')
        .select('id')
        .eq('id', colorVariantId)
        .eq('product_id', productId)
        .single();
      
      return !error && !!data;
    }

    if (sizeVariantId) {
      // Check size variant
      const { data, error } = await supabase
        .from('size_variants')
        .select('id')
        .eq('id', sizeVariantId)
        .single();
      
      return !error && !!data;
    }

    return false;
  } catch (error) {
    console.error('Error checking variant existence:', error);
    return false;
  }
}
