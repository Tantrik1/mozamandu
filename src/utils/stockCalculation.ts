
import { supabase } from '@/integrations/supabase/client';

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
    console.log('Calculating stock for product:', productId);
    
    // First get product details to understand variant structure
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, has_size_variants, stock_quantity, name')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('Error fetching product:', productError);
      return { totalStock: 0 };
    }

    console.log('Product variant flags:', { 
      name: product.name,
      has_color_variants: product.has_color_variants, 
      has_size_variants: product.has_size_variants,
      stock_quantity: product.stock_quantity 
    });

    // If no variants, return product stock
    if (!product.has_color_variants && !product.has_size_variants) {
      const stock = product.stock_quantity || 0;
      console.log('No variants, returning product stock:', stock);
      return { totalStock: stock };
    }

    // If has color variants, fetch them
    if (product.has_color_variants) {
      const { data: colorVariants, error: colorError } = await supabase
        .from('color_variants')
        .select('id, color_name, stock_quantity, has_sizes')
        .eq('product_id', productId)
        .order('color_name');

      if (colorError) {
        console.error('Error fetching color variants:', colorError);
        return { totalStock: 0 };
      }

      console.log('Found color variants:', colorVariants?.length || 0);

      const colorBreakdown = [];
      let totalStock = 0;

      for (const colorVariant of colorVariants || []) {
        let colorStock = 0;
        let sizeBreakdown = undefined;

        // If this color has size variants, calculate from sizes
        if (product.has_size_variants && colorVariant.has_sizes) {
          const { data: sizeVariants, error: sizeError } = await supabase
            .from('size_variants')
            .select('size_name, stock_quantity')
            .eq('color_variant_id', colorVariant.id)
            .order('size_name');

          if (sizeError) {
            console.error('Error fetching size variants for color:', colorVariant.color_name, sizeError);
            // Fall back to color variant stock if size variants can't be fetched
            colorStock = Number(colorVariant.stock_quantity) || 0;
            console.log(`Falling back to color variant stock for ${colorVariant.color_name}: ${colorStock}`);
          } else if (sizeVariants && sizeVariants.length > 0) {
            sizeBreakdown = sizeVariants.map(size => ({
              sizeName: size.size_name,
              stock: Number(size.stock_quantity) || 0
            }));
            colorStock = sizeBreakdown.reduce((sum, size) => sum + size.stock, 0);
            console.log(`Color ${colorVariant.color_name} has ${sizeVariants.length} size variants, total stock: ${colorStock}`);
          } else {
            // No size variants found, use color variant stock
            colorStock = Number(colorVariant.stock_quantity) || 0;
            console.log(`No size variants found for ${colorVariant.color_name}, using color stock: ${colorStock}`);
          }
        } else {
          // Use color variant stock directly
          colorStock = Number(colorVariant.stock_quantity) || 0;
          console.log(`Color ${colorVariant.color_name} stock (no sizes): ${colorStock}`);
        }

        colorBreakdown.push({
          colorName: colorVariant.color_name,
          stock: colorStock,
          sizeBreakdown
        });

        totalStock += colorStock;
      }

      console.log('Total calculated stock:', totalStock);
      return {
        totalStock,
        colorBreakdown
      };
    }

    console.log('No color variants found, returning 0 stock');
    return { totalStock: 0 };
  } catch (error) {
    console.error('Error in calculateProductStock:', error);
    return { totalStock: 0 };
  }
}

export async function getProductStockSummary(productId: string): Promise<number> {
  const result = await calculateProductStock(productId);
  console.log(`Stock summary for product ${productId}: ${result.totalStock}`);
  return result.totalStock;
}

// Helper function to validate if a specific variant combination exists and has stock
export async function validateVariantStock(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null,
  requestedQuantity: number = 1
): Promise<{ isValid: boolean; availableStock: number; errorMessage?: string }> {
  try {
    let availableStock = 0;
    let errorMessage = '';

    if (sizeVariantId) {
      const { data: sizeVariant, error } = await supabase
        .from('size_variants')
        .select('stock_quantity, size_name')
        .eq('id', sizeVariantId)
        .single();

      if (error || !sizeVariant) {
        // Try to fall back to color variant
        if (colorVariantId) {
          const { data: colorVariant, error: colorError } = await supabase
            .from('color_variants')
            .select('stock_quantity, color_name')
            .eq('id', colorVariantId)
            .single();

          if (colorError || !colorVariant) {
            return {
              isValid: false,
              availableStock: 0,
              errorMessage: 'Selected variant combination not found'
            };
          }

          availableStock = colorVariant.stock_quantity || 0;
          errorMessage = `Size not available, showing stock for color variant`;
        } else {
          return {
            isValid: false,
            availableStock: 0,
            errorMessage: 'Size variant not found'
          };
        }
      } else {
        availableStock = sizeVariant.stock_quantity || 0;
      }
    } else if (colorVariantId) {
      const { data: colorVariant, error } = await supabase
        .from('color_variants')
        .select('stock_quantity')
        .eq('id', colorVariantId)
        .single();

      if (error || !colorVariant) {
        return {
          isValid: false,
          availableStock: 0,
          errorMessage: 'Color variant not found'
        };
      }

      availableStock = colorVariant.stock_quantity || 0;
    } else {
      const { data: product, error } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (error || !product) {
        return {
          isValid: false,
          availableStock: 0,
          errorMessage: 'Product not found'
        };
      }

      availableStock = product.stock_quantity || 0;
    }

    return {
      isValid: availableStock >= requestedQuantity,
      availableStock,
      errorMessage: availableStock < requestedQuantity ? 
        `Only ${availableStock} items available` : errorMessage
    };
  } catch (error) {
    console.error('Error validating variant stock:', error);
    return {
      isValid: false,
      availableStock: 0,
      errorMessage: 'Error checking stock availability'
    };
  }
}
