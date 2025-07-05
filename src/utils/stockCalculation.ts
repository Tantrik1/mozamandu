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

// Function to calculate stock using the new inventory system
export async function calculateProductStockNew(productId: string): Promise<StockCalculationResult> {
  try {
    console.log('=== CALCULATING PRODUCT STOCK (NEW INVENTORY SYSTEM) ===');
    console.log('Product ID:', productId);

    // Get product details first
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants, name, status')
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
      color_has_size_variants: product.color_has_size_variants
    });

    // Get all inventory items for this product
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('color_name', { ascending: true })
      .order('size_name', { ascending: true });

    if (inventoryError) {
      console.error('Error fetching inventory items:', inventoryError);
      return { totalStock: 0 };
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      console.log('No inventory items found for product');
      return { totalStock: 0 };
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

    // Group inventory items by color
    const colorGroups: { [key: string]: any[] } = {};

    for (const item of inventoryItems) {
      const colorKey = item.color_name || 'default';
      if (!colorGroups[colorKey]) {
        colorGroups[colorKey] = [];
      }
      colorGroups[colorKey].push(item);
    }

    // Process each color group
    for (const [colorName, items] of Object.entries(colorGroups)) {
      if (product.has_color_variants && product.color_has_size_variants) {
        // Product has color and size variants
        const sizeBreakdown: Array<{
          sizeName: string;
          stock: number;
        }> = [];

        let colorStock = 0;

        for (const item of items) {
          const itemStock = item.available_stock || item.stock_quantity || 0;
          colorStock += itemStock;
          totalStock += itemStock;

          if (item.size_name) {
            sizeBreakdown.push({
              sizeName: item.size_name,
              stock: itemStock
            });
          }
        }

        colorBreakdown.push({
          colorName: colorName === 'default' ? 'No Color' : colorName,
          stock: colorStock,
          sizeBreakdown: sizeBreakdown.length > 0 ? sizeBreakdown : undefined
        });
      } else if (product.has_color_variants) {
        // Product has only color variants
        const colorStock = items.reduce((sum, item) => sum + (item.available_stock || item.stock_quantity || 0), 0);
        totalStock += colorStock;

        colorBreakdown.push({
          colorName: colorName === 'default' ? 'No Color' : colorName,
          stock: colorStock
        });
      } else {
        // Product has no variants
        const itemStock = items[0]?.available_stock || items[0]?.stock_quantity || 0;
        totalStock += itemStock;
      }
    }

    return {
      totalStock,
      colorBreakdown: colorBreakdown.length > 0 ? colorBreakdown : undefined
    };
  } catch (error) {
    console.error('Error in calculateProductStockNew:', error);
    return { totalStock: 0 };
  }
}

// Fallback function to calculate stock from existing tables if breakdown table is not available
export async function calculateProductStockFallback(productId: string): Promise<StockCalculationResult> {
  try {
    console.log('=== CALCULATING PRODUCT STOCK (FALLBACK) ===');
    console.log('Product ID:', productId);

    // Get product details first
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('has_color_variants, color_has_size_variants, name, status')
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
      color_has_size_variants: product.color_has_size_variants
    });

    if (!product.has_color_variants) {
      // Try to get stock from inventory first
      const { data: inventoryItem } = await supabase
        .from('product_inventory')
        .select('available_stock, stock_quantity')
        .eq('product_id', productId)
        .is('color_variant_id', null)
        .is('size_variant_id', null)
        .eq('is_active', true)
        .single();

      const stock = inventoryItem?.available_stock || inventoryItem?.stock_quantity || 0;
      return { totalStock: stock };
    }

    // Get color variants
    const { data: colorVariants, error: colorError } = await supabase
      .from('color_variants')
      .select('*')
      .eq('product_id', productId);

    if (colorError) {
      console.error('Error fetching color variants:', colorError);
      return { totalStock: 0 };
    }

    if (!colorVariants || colorVariants.length === 0) {
      return { totalStock: 0 };
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
        // Color variant without sizes - check inventory
        const { data: inventoryItem } = await supabase
          .from('product_inventory')
          .select('available_stock, stock_quantity')
          .eq('product_id', productId)
          .eq('color_variant_id', colorVariant.id)
          .is('size_variant_id', null)
          .eq('is_active', true)
          .single();

        const colorStock = inventoryItem?.available_stock || inventoryItem?.stock_quantity || 0;
        totalStock += colorStock;
        colorBreakdown.push({
          colorName: colorVariant.color_name,
          stock: colorStock
        });
      } else {
        // Color variant with sizes - check inventory for each size
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
            // Check inventory for this size variant
            const { data: inventoryItem } = await supabase
              .from('product_inventory')
              .select('available_stock, stock_quantity')
              .eq('product_id', productId)
              .eq('color_variant_id', colorVariant.id)
              .eq('size_variant_id', sizeVariant.id)
              .eq('is_active', true)
              .single();

            const sizeStock = inventoryItem?.available_stock || inventoryItem?.stock_quantity || 0;
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

    // Try new inventory system first
    try {
      return await calculateProductStockNew(productId);
    } catch (newSystemError) {
      console.log('New inventory system failed, using fallback:', newSystemError);
      return await calculateProductStockFallback(productId);
    }
  } catch (error) {
    console.error('Error in calculateProductStock:', error);
    return { totalStock: 0 };
  }
}

export async function getProductStockSummary(productId: string): Promise<number> {
  try {
    const result = await calculateProductStock(productId);
    return result.totalStock;
  } catch (error) {
    console.error('Error getting product stock summary:', error);
    return 0;
  }
}

// Main stock validation function
export async function validateVariantStock(
  productId: string,
  productInventoryId?: string | null,
  requestedQuantity: number = 1
): Promise<{ isValid: boolean; availableStock: number; errorMessage?: string }> {
  try {
    console.log('=== STOCK VALIDATION START ===');
    console.log('Validating:', { productId, productInventoryId, requestedQuantity });

    // Use unified stock manager
    const stockInfo = await getVariantStockInfo(productId, productInventoryId);

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

    return {
      isValid: false,
      availableStock: 0,
      errorMessage: stockInfo.errorMessage || 'Stock validation failed'
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
    // Get inventory items with stock
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .gt('available_stock', 0)
      .order('color_name')
      .order('size_name');

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
  productInventoryId?: string | null
): Promise<boolean> {
  try {
    if (!productInventoryId) {
      // Check if base product inventory exists
      const { data, error } = await supabase
        .from('product_inventory')
        .select('id')
        .eq('product_id', productId)
        .is('color_variant_id', null)
        .is('size_variant_id', null)
        .eq('is_active', true)
        .single();

      return !error && !!data;
    }

    // Check specific inventory item
    const { data, error } = await supabase
      .from('product_inventory')
      .select('id')
      .eq('id', productInventoryId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking variant existence:', error);
    return false;
  }
}

// Legacy function for backward compatibility
export async function checkVariantExistsLegacy(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null
): Promise<boolean> {
  try {
    // Check if any inventory item matches the variant criteria
    let query = supabase
      .from('product_inventory')
      .select('id')
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

    const { data, error } = await query.single();
    return !error && !!data;
  } catch (error) {
    console.error('Error checking legacy variant existence:', error);
    return false;
  }
}
