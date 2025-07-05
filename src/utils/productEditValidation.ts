import { supabase } from '@/integrations/supabase/client';

export interface ProductEditValidationResult {
  canEdit: boolean;
  reason?: string;
  pendingOrdersCount?: number;
}

export async function validateProductEditability(productId: string): Promise<ProductEditValidationResult> {
  try {
    // Check if the product has any pending orders (not delivered or cancelled)
    const { data: pendingOrders, error } = await supabase
      .from('customer_order_items')
      .select(`
        id,
        customer_orders!inner(
          id,
          status,
          order_number
        )
      `)
      .eq('product_id', productId)
      .not('customer_orders.status', 'in', '(delivered,cancelled)');

    if (error) {
      console.error('Error checking product order status:', error);
      return {
        canEdit: false,
        reason: 'Unable to verify order status. Please try again.'
      };
    }

    const pendingOrdersCount = pendingOrders?.length || 0;

    if (pendingOrdersCount > 0) {
      return {
        canEdit: false,
        reason: `This product cannot be modified because it's part of ${pendingOrdersCount} pending order(s). Please wait until orders are delivered or cancelled.`,
        pendingOrdersCount
      };
    }

    return {
      canEdit: true
    };
  } catch (error) {
    console.error('Error validating product editability:', error);
    return {
      canEdit: false,
      reason: 'Unable to verify product status. Please try again.'
    };
  }
}

export async function validateInventoryEditability(
  productId: string,
  productInventoryId?: string | null
): Promise<ProductEditValidationResult> {
  try {
    let query = supabase
      .from('customer_order_items')
      .select(`
        id,
        customer_orders!inner(
          id,
          status,
          order_number
        )
      `)
      .eq('product_id', productId)
      .not('customer_orders.status', 'in', '(delivered,cancelled)');

    // If checking specific inventory item, filter by it
    if (productInventoryId) {
      query = query.eq('product_inventory_id', productInventoryId);
    }

    const { data: pendingOrders, error } = await query;

    if (error) {
      console.error('Error checking inventory order status:', error);
      return {
        canEdit: false,
        reason: 'Unable to verify order status. Please try again.'
      };
    }

    const pendingOrdersCount = pendingOrders?.length || 0;

    if (pendingOrdersCount > 0) {
      return {
        canEdit: false,
        reason: `This inventory item cannot be modified because it's part of ${pendingOrdersCount} pending order(s). Please wait until orders are delivered or cancelled.`,
        pendingOrdersCount
      };
    }

    return {
      canEdit: true
    };
  } catch (error) {
    console.error('Error validating inventory editability:', error);
    return {
      canEdit: false,
      reason: 'Unable to verify inventory status. Please try again.'
    };
  }
}

// Legacy function for backward compatibility
export async function validateVariantEditability(
  productId: string,
  colorVariantId?: string | null,
  sizeVariantId?: string | null
): Promise<ProductEditValidationResult> {
  // For backward compatibility, we'll check if any inventory items with these variants have pending orders
  try {
    let query = supabase
      .from('customer_order_items')
      .select(`
        id,
        customer_orders!inner(
          id,
          status,
          order_number
        )
      `)
      .eq('product_id', productId)
      .not('customer_orders.status', 'in', '(delivered,cancelled)');

    // If we have variant IDs, we need to check the product_inventory table
    if (colorVariantId || sizeVariantId) {
      // Get inventory items that match the variant criteria
      const inventoryQuery = supabase
        .from('product_inventory')
        .select('id')
        .eq('product_id', productId)
        .eq('is_active', true);

      if (colorVariantId) {
        inventoryQuery.eq('color_variant_id', colorVariantId);
      }
      if (sizeVariantId) {
        inventoryQuery.eq('size_variant_id', sizeVariantId);
      }

      const { data: inventoryItems, error: inventoryError } = await inventoryQuery;

      if (inventoryError || !inventoryItems || inventoryItems.length === 0) {
        return {
          canEdit: true // No inventory items found, so no pending orders
        };
      }

      // Check if any of these inventory items have pending orders
      const inventoryIds = inventoryItems.map(item => item.id);
      query = query.in('product_inventory_id', inventoryIds);
    }

    const { data: pendingOrders, error } = await query;

    if (error) {
      console.error('Error checking variant order status:', error);
      return {
        canEdit: false,
        reason: 'Unable to verify order status. Please try again.'
      };
    }

    const pendingOrdersCount = pendingOrders?.length || 0;

    if (pendingOrdersCount > 0) {
      return {
        canEdit: false,
        reason: `This variant cannot be modified because it's part of ${pendingOrdersCount} pending order(s). Please wait until orders are delivered or cancelled.`,
        pendingOrdersCount
      };
    }

    return {
      canEdit: true
    };
  } catch (error) {
    console.error('Error validating variant editability:', error);
    return {
      canEdit: false,
      reason: 'Unable to verify variant status. Please try again.'
    };
  }
}
