
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
    
    // Get product details to understand variant structure
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

    console.log('Product variant structure:', { 
      name: product.name,
      has_color_variants: product.has_color_variants, 
      has_size_variants: product.has_size_variants,
      stock_quantity: product.stock_quantity 
    });

    // Case 1: Product has no variants - use product stock
    if (!product.has_color_variants) {
      const stock = product.stock_quantity || 0;
      console.log(`Product has no variants, stock: ${stock}`);
      return { totalStock: stock };
    }

    // Case 2: Product has color variants - check each color
    console.log('Product has color variants, checking each color...');
    
    const { data: colorVariants, error: colorError } = await supabase
      .from('color_variants')
      .select(`
        id, 
        color_name, 
        stock_quantity,
        size_variants(size_name, stock_quantity)
      `)
      .eq('product_id', productId)
      .order('color_name');

    if (colorError) {
      console.error('Error fetching color variants:', colorError);
      return { totalStock: 0 };
    }

    const colorBreakdown = [];
    let totalStock = 0;

    for (const colorVariant of colorVariants || []) {
      const sizeVariants = colorVariant.size_variants || [];
      
      // Case 2a: This color has size variants - use size variant stocks
      if (sizeVariants.length > 0) {
        console.log(`Color ${colorVariant.color_name} has ${sizeVariants.length} size variants`);
        
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

        totalStock += colorStock;
        console.log(`Color ${colorVariant.color_name}: ${colorStock} units from sizes`);
      }
      // Case 2b: This color has no size variants - use color variant stock
      else {
        console.log(`Color ${colorVariant.color_name} has no size variants`);
        
        const colorStock = Number(colorVariant.stock_quantity) || 0;
        
        colorBreakdown.push({
          colorName: colorVariant.color_name,
          stock: colorStock
        });

        totalStock += colorStock;
        console.log(`Color ${colorVariant.color_name}: ${colorStock} units from color stock`);
      }
    }

    console.log(`Total stock calculated: ${totalStock}`);
    return { totalStock, colorBreakdown };

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

// Robust variant stock validation following the correct hierarchy
export async function validateVariantStock(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null,
  requestedQuantity: number = 1
): Promise<{ isValid: boolean; availableStock: number; errorMessage?: string }> {
  try {
    console.log('Validating variant stock:', { productId, colorVariantId, sizeVariantId, requestedQuantity });

    // Get product info first
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, status, has_color_variants, has_size_variants, stock_quantity')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return {
        isValid: false,
        availableStock: 0,
        errorMessage: 'Product not found'
      };
    }

    if (product.status !== 'active') {
      return {
        isValid: false,
        availableStock: 0,
        errorMessage: 'Product is no longer available'
      };
    }

    let availableStock = 0;
    let stockSource = '';

    // Hierarchy 1: If no color variants, use product stock
    if (!product.has_color_variants) {
      availableStock = product.stock_quantity || 0;
      stockSource = 'product';
      console.log(`Using product stock: ${availableStock}`);
    }
    // Hierarchy 2: Has color variants - check the specific color
    else if (colorVariantId) {
      const { data: colorVariant, error: colorError } = await supabase
        .from('color_variants')
        .select(`
          color_name, 
          stock_quantity,
          size_variants(id, size_name, stock_quantity)
        `)
        .eq('id', colorVariantId)
        .single();

      if (colorError || !colorVariant) {
        return {
          isValid: false,
          availableStock: 0,
          errorMessage: 'Selected color is no longer available'
        };
      }

      const sizeVariants = colorVariant.size_variants || [];

      // Hierarchy 2a: If this color has size variants and a specific size is selected
      if (sizeVariants.length > 0 && sizeVariantId) {
        const selectedSize = sizeVariants.find(size => size.id === sizeVariantId);
        
        if (!selectedSize) {
          return {
            isValid: false,
            availableStock: 0,
            errorMessage: 'Selected size is no longer available'
          };
        }

        availableStock = selectedSize.stock_quantity || 0;
        stockSource = `size variant (${selectedSize.size_name})`;
        console.log(`Using size variant stock: ${availableStock} for ${selectedSize.size_name}`);
      }
      // Hierarchy 2b: If this color has no size variants, use color stock
      else if (sizeVariants.length === 0) {
        availableStock = colorVariant.stock_quantity || 0;
        stockSource = `color variant (${colorVariant.color_name})`;
        console.log(`Using color variant stock: ${availableStock} for ${colorVariant.color_name}`);
      }
      // Hierarchy 2c: Color has sizes but no size selected - invalid
      else {
        return {
          isValid: false,
          availableStock: 0,
          errorMessage: 'Please select a size'
        };
      }
    }
    // Invalid case: Product has colors but no color selected
    else {
      return {
        isValid: false,
        availableStock: 0,
        errorMessage: 'Please select a color'
      };
    }

    console.log(`Stock validation result: ${availableStock} available from ${stockSource}`);

    return {
      isValid: availableStock >= requestedQuantity,
      availableStock,
      errorMessage: availableStock < requestedQuantity ? 
        `Only ${availableStock} items available` : undefined
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
