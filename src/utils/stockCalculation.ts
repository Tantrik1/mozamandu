
import { supabase } from '@/integrations/supabase/client';
import { getVariantStockInfo, getProductVariantDetails, getStockBreakdown } from './unifiedStockManager';

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
    console.log('=== CALCULATING PRODUCT STOCK ===');
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

    // Use the improved stock breakdown function
    const breakdown = await getStockBreakdown(productId);
    
    if (!product.has_color_variants) {
      return { totalStock: breakdown.totalStock };
    }

    // Convert breakdown to the expected format
    const colorBreakdown = breakdown.colorVariants.map(colorVariant => ({
      colorName: colorVariant.colorName,
      stock: colorVariant.colorStock,
      sizeBreakdown: colorVariant.sizeVariants.length > 0 
        ? colorVariant.sizeVariants.map(sizeVariant => ({
            sizeName: sizeVariant.sizeName,
            stock: sizeVariant.sizeStock
          }))
        : undefined
    }));

    return { 
      totalStock: breakdown.totalStock, 
      colorBreakdown 
    };
  } catch (error) {
    console.error('Error in calculateProductStock:', error);
    return { totalStock: 0 };
  }
}

export async function getProductStockSummary(productId: string): Promise<number> {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    return product?.stock_quantity || 0;
  } catch (error) {
    console.error('Error getting product stock summary:', error);
    return 0;
  }
}

// Main stock validation function using unified system
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

// Helper function to get all available variants for a product
export async function getAvailableVariants(productId: string) {
  try {
    const variants = await getProductVariantDetails(productId);
    
    // Filter out variants with zero stock
    return variants.filter(variant => 
      variant.variant_stock_quantity > 0
    );
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
