
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

export async function validateVariantEditability(
  productId: string, 
  colorVariantId?: string | null, 
  sizeVariantId?: string | null
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

    // If checking specific variant, filter by it
    if (colorVariantId) {
      query = query.eq('color_variant_id', colorVariantId);
    }
    if (sizeVariantId) {
      query = query.eq('size_variant_id', sizeVariantId);
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
