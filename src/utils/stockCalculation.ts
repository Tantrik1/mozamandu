
import { supabase } from '@/integrations/supabase/client';
import { getVariantStockInfo, calculateTotalProductStock } from './unifiedStockManager';

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
      .select('has_color_variants, has_size_variants, stock_quantity, name, status')
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
      has_size_variants: product.has_size_variants,
      stock_quantity: product.stock_quantity 
    });

    // Use unified stock calculation
    const totalStock = await calculateTotalProductStock(productId);
    
    if (!product.has_color_variants) {
      return { totalStock };
    }

    // Get detailed breakdown for color variants
    const { data: colorVariants, error: colorError } = await supabase
      .from('color_variants')
      .select(`
        id, 
        color_name, 
        stock_quantity,
        has_sizes,
        size_variants(id, size_name, stock_quantity)
      `)
      .eq('product_id', productId)
      .order('color_name');

    if (colorError || !colorVariants) {
      console.error('Error fetching color variants:', colorError);
      return { totalStock };
    }

    const colorBreakdown = [];

    for (const colorVariant of colorVariants) {
      const sizeVariants = colorVariant.size_variants || [];
      
      if (colorVariant.has_sizes && sizeVariants.length > 0) {
        const sizeBreakdown = sizeVariants.map(size => ({
          sizeName: size.size_name,
          stock: Number(size.stock_quantity) || 0
        }));

        const colorStock = sizeBreakdown.reduce((sum, size) => sum + size.stock, 0);
        
        colorBreakdown.push({
          colorName: colorVariant.color_name,
          stock: colorStock,
          sizeBreakdown
        });
      } else {
        const colorStock = Number(colorVariant.stock_quantity) || 0;
        
        colorBreakdown.push({
          colorName: colorVariant.color_name,
          stock: colorStock
        });
      }
    }

    return { totalStock, colorBreakdown };
  } catch (error) {
    console.error('Error in calculateProductStock:', error);
    return { totalStock: 0 };
  }
}

export async function getProductStockSummary(productId: string): Promise<number> {
  return await calculateTotalProductStock(productId);
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
