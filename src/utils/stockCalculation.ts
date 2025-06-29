
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
      .select('has_color_variants, has_size_variants, stock_quantity')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('Error fetching product:', productError);
      return { totalStock: 0 };
    }

    console.log('Product variant flags:', { 
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
            console.error('Error fetching size variants:', sizeError);
            colorStock = colorVariant.stock_quantity || 0;
          } else {
            sizeBreakdown = (sizeVariants || []).map(size => ({
              sizeName: size.size_name,
              stock: Number(size.stock_quantity) || 0
            }));
            colorStock = sizeBreakdown.reduce((sum, size) => sum + size.stock, 0);
            console.log(`Color ${colorVariant.color_name} has ${sizeVariants?.length || 0} size variants, total stock: ${colorStock}`);
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
