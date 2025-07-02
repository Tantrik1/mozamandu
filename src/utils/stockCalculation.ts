
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
    
    // Get product details
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

    // HIERARCHY 1: Product has no color variants - use product stock directly
    if (!product.has_color_variants) {
      const stock = product.stock_quantity || 0;
      console.log(`No color variants - using product stock: ${stock}`);
      return { totalStock: stock };
    }

    // HIERARCHY 2: Product has color variants - check each color
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

    if (!colorVariants || colorVariants.length === 0) {
      console.log('No color variants found for product with has_color_variants=true');
      return { totalStock: 0 };
    }

    const colorBreakdown = [];
    let totalStock = 0;

    for (const colorVariant of colorVariants) {
      const sizeVariants = colorVariant.size_variants || [];
      
      // HIERARCHY 2A: This color has size variants - sum size variant stocks
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
        console.log(`Color ${colorVariant.color_name}: ${colorStock} units from ${sizeVariants.length} sizes`);
      }
      // HIERARCHY 2B: This color has no size variants - use color variant stock
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

    console.log(`Total calculated stock: ${totalStock}`);
    return { totalStock, colorBreakdown };

  } catch (error) {
    console.error('Error in calculateProductStock:', error);
    return { totalStock: 0 };
  }
}

export async function getProductStockSummary(productId: string): Promise<number> {
  const result = await calculateProductStock(productId);
  return result.totalStock;
}

// Main stock validation function - follows correct hierarchy
export async function validateVariantStock(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null,
  requestedQuantity: number = 1
): Promise<{ isValid: boolean; availableStock: number; errorMessage?: string }> {
  try {
    console.log('=== STOCK VALIDATION START ===');
    console.log('Validating:', { productId, colorVariantId, sizeVariantId, requestedQuantity });

    // Step 1: Get product info
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, status, has_color_variants, has_size_variants, stock_quantity')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.log('Product not found:', productError);
      return {
        isValid: false,
        availableStock: 0,
        errorMessage: 'Product not found'
      };
    }

    if (product.status !== 'active') {
      console.log('Product inactive');
      return {
        isValid: false,
        availableStock: 0,
        errorMessage: 'Product is no longer available'
      };
    }

    console.log('Product found:', { 
      name: product.name, 
      has_color_variants: product.has_color_variants,
      has_size_variants: product.has_size_variants,
      stock_quantity: product.stock_quantity 
    });

    let availableStock = 0;
    let stockSource = '';

    // STEP 2: Follow the hierarchy to determine stock source
    
    // CASE 1: Product has no color variants → use product stock
    if (!product.has_color_variants) {
      availableStock = product.stock_quantity || 0;
      stockSource = 'product level';
      console.log(`Case 1 - No color variants: stock = ${availableStock}`);
    }
    // CASE 2: Product has color variants → need to check specific color
    else {
      if (!colorVariantId) {
        console.log('Case 2 - Color variant required but not provided');
        return {
          isValid: false,
          availableStock: 0,
          errorMessage: 'Please select a color'
        };
      }

      // Get the specific color variant
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
        console.log('Color variant not found:', colorError);
        return {
          isValid: false,
          availableStock: 0,
          errorMessage: 'Selected color is no longer available'
        };
      }

      const sizeVariants = colorVariant.size_variants || [];
      console.log(`Color variant found: ${colorVariant.color_name}, has ${sizeVariants.length} size variants`);

      // CASE 2A: This color has size variants → check specific size
      if (sizeVariants.length > 0) {
        if (!sizeVariantId) {
          console.log('Case 2A - Size variant required but not provided');
          return {
            isValid: false,
            availableStock: 0,
            errorMessage: 'Please select a size'
          };
        }

        const selectedSize = sizeVariants.find(size => size.id === sizeVariantId);
        
        if (!selectedSize) {
          console.log('Size variant not found in color variants');
          return {
            isValid: false,
            availableStock: 0,
            errorMessage: 'Selected size is no longer available'
          };
        }

        availableStock = selectedSize.stock_quantity || 0;
        stockSource = `size variant (${selectedSize.size_name})`;
        console.log(`Case 2A - Size variant: ${selectedSize.size_name} stock = ${availableStock}`);
      }
      // CASE 2B: This color has no size variants → use color stock
      else {
        availableStock = colorVariant.stock_quantity || 0;
        stockSource = `color variant (${colorVariant.color_name})`;
        console.log(`Case 2B - Color variant: ${colorVariant.color_name} stock = ${availableStock}`);
      }
    }

    const isValid = availableStock >= requestedQuantity;
    console.log(`=== STOCK VALIDATION RESULT ===`);
    console.log(`Stock source: ${stockSource}`);
    console.log(`Available: ${availableStock}, Requested: ${requestedQuantity}, Valid: ${isValid}`);

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
