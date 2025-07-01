
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

    // Case 1: Product has size variants (must also have color variants in our data model)
    if (product.has_size_variants) {
      console.log('Product has size variants, calculating from size_variants table');
      
      const { data: colorVariants, error: colorError } = await supabase
        .from('color_variants')
        .select(`
          id, 
          color_name, 
          size_variants(size_name, stock_quantity)
        `)
        .eq('product_id', productId)
        .order('color_name');

      if (colorError) {
        console.error('Error fetching color variants with sizes:', colorError);
        return { totalStock: 0 };
      }

      const colorBreakdown = [];
      let totalStock = 0;

      for (const colorVariant of colorVariants || []) {
        const sizeVariants = colorVariant.size_variants || [];
        
        if (sizeVariants.length === 0) {
          console.warn(`No size variants found for color ${colorVariant.color_name}`);
          continue;
        }

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
        console.log(`Color ${colorVariant.color_name}: ${colorStock} units (${sizeVariants.length} sizes)`);
      }

      console.log(`Total stock from size variants: ${totalStock}`);
      return { totalStock, colorBreakdown };
    }

    // Case 2: Product has only color variants (no sizes)
    if (product.has_color_variants && !product.has_size_variants) {
      console.log('Product has color variants only, calculating from color_variants table');
      
      const { data: colorVariants, error: colorError } = await supabase
        .from('color_variants')
        .select('color_name, stock_quantity')
        .eq('product_id', productId)
        .order('color_name');

      if (colorError) {
        console.error('Error fetching color variants:', colorError);
        return { totalStock: 0 };
      }

      const colorBreakdown = [];
      let totalStock = 0;

      for (const colorVariant of colorVariants || []) {
        const colorStock = Number(colorVariant.stock_quantity) || 0;
        
        colorBreakdown.push({
          colorName: colorVariant.color_name,
          stock: colorStock
        });

        totalStock += colorStock;
        console.log(`Color ${colorVariant.color_name}: ${colorStock} units`);
      }

      console.log(`Total stock from color variants: ${totalStock}`);
      return { totalStock, colorBreakdown };
    }

    // Case 3: Product has no variants, use product stock directly
    console.log('Product has no variants, using product stock directly');
    const stock = product.stock_quantity || 0;
    console.log(`Product stock: ${stock}`);
    return { totalStock: stock };

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

// Simplified variant stock validation with clear hierarchy
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

    // Priority 1: Size variant stock (if size variant ID is provided)
    if (sizeVariantId) {
      const { data: sizeVariant, error: sizeError } = await supabase
        .from('size_variants')
        .select('stock_quantity, size_name')
        .eq('id', sizeVariantId)
        .single();

      if (sizeError || !sizeVariant) {
        return {
          isValid: false,
          availableStock: 0,
          errorMessage: 'Selected size is no longer available'
        };
      }

      availableStock = sizeVariant.stock_quantity || 0;
      stockSource = `size variant (${sizeVariant.size_name})`;
    }
    // Priority 2: Color variant stock (if color variant ID is provided and no size variant)
    else if (colorVariantId) {
      const { data: colorVariant, error: colorError } = await supabase
        .from('color_variants')
        .select('stock_quantity, color_name')
        .eq('id', colorVariantId)
        .single();

      if (colorError || !colorVariant) {
        return {
          isValid: false,
          availableStock: 0,
          errorMessage: 'Selected color is no longer available'
        };
      }

      availableStock = colorVariant.stock_quantity || 0;
      stockSource = `color variant (${colorVariant.color_name})`;
    }
    // Priority 3: Product stock (if no variants specified)
    else {
      availableStock = product.stock_quantity || 0;
      stockSource = 'product';
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
