import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  color_variant_id?: string;
  size_variant_id?: string;
  product_name: string;
  color_name?: string;
  size_name?: string;
  size_code?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  cost_price?: number;
  selling_price?: number;
  category_id?: string;
  subcategory_id?: string;
  category_name?: string;
  subcategory_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryChange {
  id: string;
  product_inventory_id: string;
  product_id: string;
  color_variant_id?: string;
  size_variant_id?: string;
  action_type: 'stock_update' | 'reservation' | 'release' | 'deduction' | 'restoration';
  old_stock_quantity?: number;
  new_stock_quantity: number;
  old_reserved_stock?: number;
  new_reserved_stock: number;
  old_available_stock?: number;
  new_available_stock: number;
  change_amount: number;
  reason: string;
  user_id?: string;
  order_id?: string;
  cart_id?: string;
  created_at: string;
}

export interface InventoryOverview {
  id: string;
  product_name: string;
  product_sku: string;
  variant_name?: string;
  size_name?: string;
  category_name?: string;
  subcategory_name?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  stock_status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  created_at: string;
  updated_at: string;
}

export interface LowStockAlert {
  id: string;
  product_name: string;
  product_sku: string;
  variant_name?: string;
  size_name?: string;
  category_name?: string;
  subcategory_name?: string;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  low_stock_threshold: number;
  stock_needed: number;
  updated_at: string;
}

export interface InventoryAnalytics {
  total_items: number;
  active_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_stock_value: number;
  total_available_stock: number;
  total_reserved_stock: number;
}

export interface CartItem {
  productId: string;
  productInventoryId?: string;
  quantity: number;
  colorVariantId?: string;
  sizeVariantId?: string;
}

export interface CartItemForValidation {
  id: string;
  productId: string;
  productName: string;
  productInventoryId?: string | null;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  basePrice: number;
  subcategoryId: string;
  image_url?: string;
}

export interface CartValidationResult {
  validItems: CartItemForValidation[];
  removedItems: CartItemForValidation[];
  errors: string[];
}

export interface ProductStockSummary {
  productId: string;
  productName: string;
  categoryName?: string;
  subcategoryName?: string;
  totalStockQuantity: number;
  totalReservedStock: number;
  totalAvailableStock: number;
  variantCount: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Mixed';
  lastUpdated: string;
  isActive: boolean;
}

export interface StockCalculationResult {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockValue: number;
  totalAvailableValue: number;
  totalReservedValue: number;
  averageStockLevel: number;
  stockTurnoverRatio: number;
}

export interface VariantStockDetail {
  variantId: string;
  colorName?: string;
  sizeName?: string;
  stockQuantity: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastUpdated: string;
}

export interface StockValidationResult {
  isValid: boolean;
  errors: string[];
  insufficientItems?: Array<{
    productId: string;
    requested: number;
    available: number;
    colorVariantId?: string;
    sizeVariantId?: string;
  }>;
}

// ============================================================================
// REAL-TIME SUBSCRIPTION MANAGEMENT
// ============================================================================

class InventorySubscriptionManager {
  private subscriptions: Map<string, any> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  subscribeToInventory(channel: string, callback: (data: any) => void) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    if (!this.subscriptions.has(channel)) {
      const subscription = supabase
        .channel(channel)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'product_inventory'
          },
          (payload) => {
            this.notifyListeners(channel, payload);
          }
        )
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory_audit_log'
          },
          (payload) => {
            this.notifyListeners(channel, payload);
          }
        )
        .subscribe();

      this.subscriptions.set(channel, subscription);
    }

    return () => this.unsubscribeFromInventory(channel, callback);
  }

  private notifyListeners(channel: string, data: any) {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach(callback => callback(data));
    }
  }

  unsubscribeFromInventory(channel: string, callback: (data: any) => void) {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.delete(callback);
      if (channelListeners.size === 0) {
        this.listeners.delete(channel);
        const subscription = this.subscriptions.get(channel);
        if (subscription) {
          supabase.removeChannel(subscription);
          this.subscriptions.delete(channel);
        }
      }
    }
  }

  unsubscribeAll() {
    this.subscriptions.forEach((subscription) => {
      supabase.removeChannel(subscription);
    });
    this.subscriptions.clear();
    this.listeners.clear();
  }
}

export const inventorySubscriptionManager = new InventorySubscriptionManager();

// ============================================================================
// CORE INVENTORY OPERATIONS
// ============================================================================

/**
 * Get all inventory items with real-time updates
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Transform data to match InventoryItem interface
    return (data || []).map(item => ({
      id: item.id,
      product_id: item.product_id,
      sku: item.sku,
      color_variant_id: item.color_variant_id,
      size_variant_id: item.size_variant_id,
      product_name: item.product_name,
      color_name: item.color_name,
      size_name: item.size_name,
      size_code: item.size_code,
      stock_quantity: item.stock_quantity,
      reserved_stock: item.reserved_stock,
      available_stock: item.available_stock || 0,
      low_stock_threshold: item.low_stock_threshold || 10,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      category_id: item.category_id,
      subcategory_id: item.subcategory_id,
      category_name: item.category_name,
      subcategory_name: item.subcategory_name,
      is_active: item.is_active || true,
      created_at: item.created_at || '',
      updated_at: item.updated_at || ''
    }));
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    toast.error('Failed to load inventory items');
    return [];
  }
}

/**
 * Get inventory overview with real-time updates
 */
export async function getInventoryOverview(): Promise<InventoryOverview[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select(`
        id,
        product_name,
        sku,
        color_name,
        size_name,
        category_name,
        subcategory_name,
        stock_quantity,
        reserved_stock,
        available_stock,
        low_stock_threshold,
        created_at,
        updated_at
      `)
      .order('available_stock', { ascending: true });

    if (error) throw error;

    // Transform data to match InventoryOverview interface
    return (data || []).map(item => ({
      id: item.id,
      product_name: item.product_name,
      product_sku: item.sku,
      variant_name: item.color_name,
      size_name: item.size_name,
      category_name: item.category_name,
      subcategory_name: item.subcategory_name,
      stock_quantity: item.stock_quantity,
      reserved_stock: item.reserved_stock,
      available_stock: item.available_stock || 0,
      low_stock_threshold: item.low_stock_threshold || 10,
      stock_status: (item.available_stock || 0) <= (item.low_stock_threshold || 10)
        ? ((item.available_stock || 0) === 0 ? 'Out of Stock' : 'Low Stock')
        : 'In Stock',
      created_at: item.created_at || '',
      updated_at: item.updated_at || ''
    }));
  } catch (error) {
    console.error('Error fetching inventory overview:', error);
    toast.error('Failed to load inventory overview');
    return [];
  }
}

/**
 * Get low stock alerts
 */
export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select(`
        id,
        product_name,
        sku,
        color_name,
        size_name,
        category_name,
        subcategory_name,
        stock_quantity,
        reserved_stock,
        available_stock,
        low_stock_threshold,
        updated_at
      `)
      .filter('available_stock', 'lte', 'low_stock_threshold')
      .order('available_stock', { ascending: true });

    if (error) throw error;

    // Transform data to match LowStockAlert interface
    return (data || []).map(item => ({
      id: item.id,
      product_name: item.product_name,
      product_sku: item.sku,
      variant_name: item.color_name,
      size_name: item.size_name,
      category_name: item.category_name,
      subcategory_name: item.subcategory_name,
      stock_quantity: item.stock_quantity,
      reserved_stock: item.reserved_stock,
      available_stock: item.available_stock || 0,
      low_stock_threshold: item.low_stock_threshold || 10,
      stock_needed: (item.low_stock_threshold || 10) - (item.available_stock || 0),
      updated_at: item.updated_at || ''
    }));
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    toast.error('Failed to load low stock alerts');
    return [];
  }
}

/**
 * Get inventory analytics
 */
export async function getInventoryAnalytics(): Promise<InventoryAnalytics | null> {
  try {
    const { data: items, error } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock, is_active, cost_price');

    if (error) throw error;

    const analytics: InventoryAnalytics = {
      total_items: items?.length || 0,
      active_items: items?.filter(item => item.is_active).length || 0,
      low_stock_items: items?.filter(item => (item.available_stock || 0) <= 10).length || 0,
      out_of_stock_items: items?.filter(item => (item.available_stock || 0) === 0).length || 0,
      total_stock_value: items?.reduce((sum, item) => sum + ((item.cost_price || 0) * item.stock_quantity), 0) || 0,
      total_available_stock: items?.reduce((sum, item) => sum + (item.available_stock || 0), 0) || 0,
      total_reserved_stock: items?.reduce((sum, item) => sum + item.reserved_stock, 0) || 0
    };

    return analytics;
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    toast.error('Failed to load inventory analytics');
    return null;
  }
}

/**
 * Get inventory history for a product
 */
export async function getInventoryHistory(
  productId?: string,
  daysBack: number = 30
): Promise<InventoryChange[]> {
  try {
    let query = supabase
      .from('inventory_audit_log')
      .select('*')
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to match InventoryChange interface
    return (data || []).map(item => ({
      id: item.id,
      product_inventory_id: item.product_inventory_id || '',
      product_id: item.product_id || '',
      color_variant_id: item.color_variant_id,
      size_variant_id: item.size_variant_id,
      action_type: item.action_type as InventoryChange['action_type'],
      old_stock_quantity: item.old_stock_quantity,
      new_stock_quantity: item.new_stock_quantity || 0,
      old_reserved_stock: item.old_reserved_stock,
      new_reserved_stock: item.new_reserved_stock || 0,
      old_available_stock: item.old_available_stock,
      new_available_stock: item.new_available_stock || 0,
      change_amount: item.change_amount || 0,
      reason: item.reason || '',
      user_id: item.user_id,
      order_id: item.order_id,
      cart_id: item.cart_id,
      created_at: item.created_at || ''
    }));
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    toast.error('Failed to load inventory history');
    return [];
  }
}

// ============================================================================
// ORDER STATUS UPDATE HANDLERS
// ============================================================================

/**
 * Handle inventory changes when order status is updated
 * This is the core function that manages stock based on order lifecycle
 */
export async function handleOrderStatusUpdate(
  orderId: string,
  oldStatus: string,
  newStatus: string,
  isCustomerOrder: boolean = false
): Promise<boolean> {
  try {
    console.log(`Processing inventory changes for order ${orderId}: ${oldStatus} -> ${newStatus}`);

    // Get order details and items
    const orderTable = isCustomerOrder ? 'customer_orders' : 'orders';
    const orderItemsTable = isCustomerOrder ? 'customer_order_items' : 'order_items';

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from(orderTable)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Failed to fetch order details:', orderError);
      return false;
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabase
      .from(orderItemsTable)
      .select('*')
      .eq('order_id', orderId);

    if (itemsError || !orderItems) {
      console.error('Failed to fetch order items:', itemsError);
      return false;
    }

    // Process stock changes based on status transition
    const stockUpdated = await processOrderStatusTransition(
      orderItems,
      oldStatus,
      newStatus,
      orderId
    );

    if (stockUpdated) {
      console.log(`Successfully processed inventory changes for order ${orderId}`);

      // Log the status change
      await logInventoryChange({
        productId: 'system',
        actionType: 'stock_update',
        changeAmount: 0,
        reason: `Order status changed from ${oldStatus} to ${newStatus}`,
        orderId: orderId
      });
    }

    return stockUpdated;
  } catch (error) {
    console.error('Error in handleOrderStatusUpdate:', error);
    return false;
  }
}

/**
 * Process stock changes based on order status transition
 */
async function processOrderStatusTransition(
  orderItems: any[],
  oldStatus: string,
  newStatus: string,
  orderId: string
): Promise<boolean> {
  try {
    console.log(`Processing status transition: ${oldStatus} -> ${newStatus}`);

    // Define status transitions and their stock implications
    const statusTransitions: Record<string, { from: string; to: string; action: 'reserve' | 'release' | 'deduct' | 'none' }> = {
      // New order created - reserve stock
      'created_to_pending_payment': {
        from: 'created',
        to: 'pending_payment',
        action: 'reserve'
      },
      'pending_to_payment_confirmed': {
        from: 'pending_payment',
        to: 'payment_confirmed',
        action: 'none' // Stock already reserved
      },
      'payment_confirmed_to_on_delivery': {
        from: 'payment_confirmed',
        to: 'on_delivery',
        action: 'none' // Stock already reserved
      },
      // Order delivered - deduct stock from warehouse
      'on_delivery_to_delivered': {
        from: 'on_delivery',
        to: 'delivered',
        action: 'deduct'
      },
      'payment_confirmed_to_delivered': {
        from: 'payment_confirmed',
        to: 'delivered',
        action: 'deduct'
      },
      // Order cancelled - release reserved stock
      'pending_payment_to_cancelled': {
        from: 'pending_payment',
        to: 'cancelled',
        action: 'release'
      },
      'payment_confirmed_to_cancelled': {
        from: 'payment_confirmed',
        to: 'cancelled',
        action: 'release'
      },
      'on_delivery_to_cancelled': {
        from: 'on_delivery',
        to: 'cancelled',
        action: 'release'
      },
      // Failed payment - release reserved stock
      'pending_payment_to_failed': {
        from: 'pending_payment',
        to: 'failed',
        action: 'release'
      }
    };

    // Find the appropriate transition
    const transitionKey = `${oldStatus}_to_${newStatus}`;
    const transition = statusTransitions[transitionKey];

    if (!transition) {
      console.log(`No specific stock action for transition: ${transitionKey}`);
      return true; // No stock changes needed
    }

    console.log(`Applying stock action: ${transition.action} for transition: ${transitionKey}`);

    // Process each order item based on the transition action
    for (const item of orderItems) {
      const success = await processOrderItemStockChange(
        item,
        transition.action,
        orderId
      );

      if (!success) {
        console.error(`Failed to process stock change for item: ${item.id}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in processOrderStatusTransition:', error);
    return false;
  }
}

/**
 * Process stock change for a single order item
 */
async function processOrderItemStockChange(
  orderItem: any,
  action: 'reserve' | 'release' | 'deduct' | 'none',
  orderId: string
): Promise<boolean> {
  try {
    const { product_id, quantity, color_variant_id, size_variant_id } = orderItem;

    console.log(`Processing ${action} for product ${product_id}, quantity: ${quantity}`);

    switch (action) {
      case 'reserve':
        return await reserveStock(
          product_id,
          quantity,
          color_variant_id,
          size_variant_id,
          orderId
        );

      case 'release':
        return await releaseStock(
          product_id,
          quantity,
          color_variant_id,
          size_variant_id,
          orderId
        );

      case 'deduct':
        return await deductStock(
          product_id,
          quantity,
          color_variant_id,
          size_variant_id,
          orderId
        );

      case 'none':
        return true; // No stock changes needed

      default:
        console.warn(`Unknown stock action: ${action}`);
        return true;
    }
  } catch (error) {
    console.error('Error in processOrderItemStockChange:', error);
    return false;
  }
}

// ============================================================================
// CHECKOUT STOCK VALIDATION AND PROCESSING
// ============================================================================

/**
 * Validate and clean cart items
 */
export async function validateCartItems(cartItems: CartItemForValidation[]): Promise<CartValidationResult> {
  const validItems: CartItemForValidation[] = [];
  const removedItems: CartItemForValidation[] = [];
  const errors: string[] = [];

  for (const item of cartItems) {
    try {
      // Check if product still exists and is active
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, status, subcategory_id, selling_price')
        .eq('id', item.productId)
        .single();

      if (productError || !product) {
        removedItems.push(item);
        errors.push(`Product "${item.productName}" no longer exists`);
        continue;
      }

      if (product.status !== 'active') {
        removedItems.push(item);
        errors.push(`Product "${item.productName}" is no longer available`);
        continue;
      }

      // Validate stock availability
      const stockValidation = await validateStock(
        item.productId,
        item.productInventoryId,
        item.quantity
      );

      if (!stockValidation.isValid) {
        removedItems.push(item);
        errors.push(`Insufficient stock for "${item.productName}": ${stockValidation.errorMessage}`);
        continue;
      }

      // Update item with current product data
      const updatedItem: CartItemForValidation = {
        ...item,
        productName: product.name,
        subcategoryId: product.subcategory_id,
        basePrice: product.selling_price || item.basePrice
      };

      validItems.push(updatedItem);
    } catch (error) {
      console.error('Error validating cart item:', error);
      removedItems.push(item);
      errors.push(`Error validating "${item.productName}"`);
    }
  }

  return { validItems, removedItems, errors };
}

/**
 * Show cart cleanup notification
 */
export function showCartCleanupNotification(
  removedItems: CartItemForValidation[],
  errors: string[]
): void {
  if (removedItems.length > 0) {
    toast.error(`${removedItems.length} items were removed from your cart due to availability changes.`);
    // Log detailed errors for debugging
    console.log('Cart cleanup details:', { removedItems, errors });
  }
}

/**
 * Validate stock for a product
 */
export async function validateStock(
  productId: string,
  productInventoryId: string | null = null,
  requestedQuantity: number = 1
): Promise<{
  isValid: boolean;
  errorMessage?: string;
  availableStock: number;
}> {
  try {
    const stockInfo = await getRealTimeStock(productId, productInventoryId);

    if (!stockInfo) {
      return {
        isValid: false,
        errorMessage: 'Product not found in inventory',
        availableStock: 0
      };
    }

    if (!stockInfo.is_active) {
      return {
        isValid: false,
        errorMessage: 'Product is not active',
        availableStock: 0
      };
    }

    if (stockInfo.available_stock < requestedQuantity) {
      return {
        isValid: false,
        errorMessage: `Only ${stockInfo.available_stock} items available`,
        availableStock: stockInfo.available_stock
      };
    }

    return {
      isValid: true,
      availableStock: stockInfo.available_stock
    };
  } catch (error) {
    console.error('Error in validateStock:', error);
    return {
      isValid: false,
      errorMessage: 'Error checking stock availability',
      availableStock: 0
    };
  }
}

/**
 * Validate stock availability for checkout
 * This checks if there's enough available stock for all items in cart
 */
export async function validateCheckoutStock(cartItems: CartItem[]): Promise<StockValidationResult> {
  try {
    console.log('Validating stock for checkout items:', cartItems);

    const errors: string[] = [];
    const insufficientItems: StockValidationResult['insufficientItems'] = [];

    for (const item of cartItems) {
      const { productInventoryId, quantity, productId, colorVariantId, sizeVariantId } = item;

      if (!productInventoryId) {
        errors.push(`No inventory record for product ${productId}`);
        continue;
      }

      // Get current inventory for this inventory record
      const { data: inventory, error } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('id', productInventoryId)
        .single();

      if (error || !inventory) {
        errors.push(`Product inventory not found for productInventoryId ${productInventoryId}`);
        continue;
      }

      // Check if available stock is sufficient
      if ((inventory.available_stock || 0) < quantity) {
        const insufficientItem = {
          productId,
          requested: quantity,
          available: inventory.available_stock || 0,
          colorVariantId,
          sizeVariantId
        };

        insufficientItems.push(insufficientItem);
        errors.push(
          `Insufficient stock for ${inventory.product_name}. ` +
          `Requested: ${quantity}, Available: ${inventory.available_stock || 0}`
        );
      }
    }

    const isValid = errors.length === 0;

    console.log(`Stock validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
    if (!isValid) {
      console.log('Validation errors:', errors);
    }

    return {
      isValid,
      errors,
      insufficientItems
    };
  } catch (error) {
    console.error('Error in validateCheckoutStock:', error);
    return {
      isValid: false,
      errors: ['Failed to validate stock availability']
    };
  }
}

/**
 * Process stock changes for successful checkout
 * This reserves stock for the order
 */
export async function processCheckoutStock(
  orderItems: CartItem[],
  orderId: string
): Promise<boolean> {
  try {
    console.log('Processing stock changes for checkout:', orderItems);

    // First validate stock again to ensure nothing changed during checkout
    const validation = await validateCheckoutStock(orderItems);
    if (!validation.isValid) {
      console.error('Stock validation failed during checkout processing');
      return false;
    }

    // Process each item to reserve stock
    for (const item of orderItems) {
      const { productInventoryId, quantity } = item;
      if (!productInventoryId) {
        console.error('No productInventoryId for item', item);
        return false;
      }
      // Get inventory record to extract productId, colorVariantId, sizeVariantId
      const { data: inventory, error } = await supabase
        .from('product_inventory')
        .select('product_id, color_variant_id, size_variant_id')
        .eq('id', productInventoryId)
        .single();
      if (error || !inventory) {
        console.error('Inventory record not found for reservation', productInventoryId);
        return false;
      }
      const success = await reserveStock(
        productInventoryId, // pass inventory id as productId for reservation
        quantity,
        inventory.color_variant_id,
        inventory.size_variant_id,
        orderId
      );
      if (!success) {
        console.error(`Failed to reserve stock for inventory ${productInventoryId}`);
        // Try to release any already reserved stock
        await rollbackCheckoutStockReservations(orderItems.slice(0, orderItems.indexOf(item)), orderId);
        return false;
      }
    }

    console.log('Successfully processed stock changes for checkout');
    return true;
  } catch (error) {
    console.error('Error in processCheckoutStock:', error);
    return false;
  }
}

/**
 * Rollback stock reservations in case of checkout failure
 */
async function rollbackCheckoutStockReservations(
  reservedItems: CartItem[],
  orderId: string
): Promise<void> {
  try {
    console.log('Rolling back stock reservations for failed checkout');

    for (const item of reservedItems) {
      await releaseStock(
        item.productInventoryId || '',
        item.quantity,
        item.colorVariantId,
        item.sizeVariantId,
        orderId
      );
    }
  } catch (error) {
    console.error('Error rolling back stock reservations:', error);
  }
}

// ============================================================================
// ENHANCED STOCK OPERATIONS WITH CONCURRENCY CONTROL
// ============================================================================

/**
 * Safe stock update with concurrency control
 * This ensures atomic updates and prevents overbooking
 */
async function safeStockUpdate(
  productId: string,
  stockChange: number,
  reservationChange: number,
  colorVariantId?: string,
  sizeVariantId?: string,
  reason: string = 'Manual update',
  orderId?: string
): Promise<boolean> {
  try {
    // Use database transaction for atomicity
    const { data, error } = await supabase.rpc('safe_update_stock', {
      p_product_id: productId,
      p_stock_change: stockChange,
      p_color_variant_id: colorVariantId,
      p_size_variant_id: sizeVariantId,
      p_reservation_change: reservationChange,
      p_reason: reason
    });

    if (error) {
      console.error('Error in safe stock update:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in safeStockUpdate:', error);
    return false;
  }
}

/**
 * Enhanced stock update with better error handling and validation
 */
export async function updateStock(
  productId: string,
  stockChange: number,
  colorVariantId?: string,
  sizeVariantId?: string,
  reservationChange: number = 0,
  reason: string = 'Manual update',
  orderId?: string,
  cartId?: string
): Promise<boolean> {
  try {
    console.log(`Updating stock for product ${productId}: stock=${stockChange}, reserved=${reservationChange}`);

    // Validate inputs
    if (stockChange === 0 && reservationChange === 0) {
      console.warn('No stock changes requested');
      return true;
    }

    // Use safe update function
    const success = await safeStockUpdate(
      productId,
      stockChange,
      reservationChange,
      colorVariantId,
      sizeVariantId,
      reason,
      orderId
    );

    if (success) {
      console.log(`Successfully updated stock for product ${productId}`);

      // Log the change
      await logInventoryChange({
        productId,
        colorVariantId,
        sizeVariantId,
        actionType: stockChange !== 0 ? 'stock_update' : 'reservation',
        changeAmount: stockChange !== 0 ? stockChange : reservationChange,
        reason,
        orderId,
        cartId
      });
    }

    return success;
  } catch (error) {
    console.error('Error in updateStock:', error);
    return false;
  }
}

/**
 * Enhanced stock reservation with concurrency control
 */
export async function reserveStock(
  productId: string,
  quantity: number,
  colorVariantId?: string,
  sizeVariantId?: string,
  orderId?: string,
  cartId?: string
): Promise<boolean> {
  try {
    console.log(`Reserving ${quantity} units for product ${productId}`);

    if (quantity <= 0) {
      console.warn('Invalid reservation quantity:', quantity);
      return false;
    }

    // Use safe update with reservation change only
    const success = await safeStockUpdate(
      productId,
      0, // No stock change
      quantity, // Increase reserved stock
      colorVariantId,
      sizeVariantId,
      'Stock reserved for order',
      orderId
    );

    if (success) {
      console.log(`Successfully reserved ${quantity} units for product ${productId}`);

      // Log the reservation
      await logInventoryChange({
        productId,
        colorVariantId,
        sizeVariantId,
        actionType: 'reservation',
        changeAmount: quantity,
        reason: 'Stock reserved for order',
        orderId,
        cartId
      });
    }

    return success;
  } catch (error) {
    console.error('Error in reserveStock:', error);
    return false;
  }
}

/**
 * Enhanced stock release with concurrency control
 */
export async function releaseStock(
  productId: string,
  quantity: number,
  colorVariantId?: string,
  sizeVariantId?: string,
  orderId?: string,
  cartId?: string
): Promise<boolean> {
  try {
    console.log(`Releasing ${quantity} units for product ${productId}`);

    if (quantity <= 0) {
      console.warn('Invalid release quantity:', quantity);
      return false;
    }

    // Use safe update with negative reservation change
    const success = await safeStockUpdate(
      productId,
      0, // No stock change
      -quantity, // Decrease reserved stock
      colorVariantId,
      sizeVariantId,
      'Stock released from order',
      orderId
    );

    if (success) {
      console.log(`Successfully released ${quantity} units for product ${productId}`);

      // Log the release
      await logInventoryChange({
        productId,
        colorVariantId,
        sizeVariantId,
        actionType: 'release',
        changeAmount: quantity,
        reason: 'Stock released from order',
        orderId,
        cartId
      });
    }

    return success;
  } catch (error) {
    console.error('Error in releaseStock:', error);
    return false;
  }
}

/**
 * Enhanced stock deduction with concurrency control
 */
export async function deductStock(
  productId: string,
  quantity: number,
  colorVariantId?: string,
  sizeVariantId?: string,
  orderId?: string
): Promise<boolean> {
  try {
    console.log(`Deducting ${quantity} units for product ${productId}`);

    if (quantity <= 0) {
      console.warn('Invalid deduction quantity:', quantity);
      return false;
    }

    // Use safe update with stock and reservation changes
    const success = await safeStockUpdate(
      productId,
      -quantity, // Decrease stock quantity
      -quantity, // Decrease reserved stock
      colorVariantId,
      sizeVariantId,
      'Stock deducted for delivery',
      orderId
    );

    if (success) {
      console.log(`Successfully deducted ${quantity} units for product ${productId}`);

      // Log the deduction
      await logInventoryChange({
        productId,
        colorVariantId,
        sizeVariantId,
        actionType: 'deduction',
        changeAmount: quantity,
        reason: 'Stock deducted for delivery',
        orderId
      });
    }

    return success;
  } catch (error) {
    console.error('Error in deductStock:', error);
    return false;
  }
}

/**
 * Restore stock (for returns/cancellations after delivery)
 */
export async function restoreStock(
  productId: string,
  quantity: number,
  colorVariantId?: string,
  sizeVariantId?: string,
  orderId?: string
): Promise<boolean> {
  try {
    console.log(`Restoring ${quantity} units for product ${productId}`);

    if (quantity <= 0) {
      console.warn('Invalid restoration quantity:', quantity);
      return false;
    }

    // Use safe update with stock increase only
    const success = await safeStockUpdate(
      productId,
      quantity, // Increase stock quantity
      0, // No change to reserved stock
      colorVariantId,
      sizeVariantId,
      'Stock restored',
      orderId
    );

    if (success) {
      console.log(`Successfully restored ${quantity} units for product ${productId}`);

      // Log the restoration
      await logInventoryChange({
        productId,
        colorVariantId,
        sizeVariantId,
        actionType: 'restoration',
        changeAmount: quantity,
        reason: 'Stock restored',
        orderId
      });
    }

    return success;
  } catch (error) {
    console.error('Error in restoreStock:', error);
    return false;
  }
}

// ============================================================================
// AUDIT LOGGING AND UTILITIES
// ============================================================================

/**
 * Log inventory change for audit trail
 */
export async function logInventoryChange({
  productId,
  colorVariantId,
  sizeVariantId,
  actionType,
  changeAmount,
  reason,
  orderId,
  cartId
}: {
  productId: string;
  colorVariantId?: string;
  sizeVariantId?: string;
  actionType: InventoryChange['action_type'];
  changeAmount: number;
  reason: string;
  orderId?: string;
  cartId?: string;
}): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Get inventory record for additional context
    let inventoryRecord = null;
    if (productId !== 'system') {
      const { data } = await supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', productId)
        .eq('color_variant_id', colorVariantId || null)
        .eq('size_variant_id', sizeVariantId || null)
        .single();

      inventoryRecord = data;
    }

    // Insert audit log entry
    const { error } = await supabase
      .from('inventory_audit_log')
      .insert({
        product_inventory_id: inventoryRecord?.id,
        product_id: productId,
        color_variant_id: colorVariantId,
        size_variant_id: sizeVariantId,
        category_id: inventoryRecord?.category_id,
        subcategory_id: inventoryRecord?.subcategory_id,
        action_type: actionType,
        old_stock_quantity: inventoryRecord ? inventoryRecord.stock_quantity - changeAmount : null,
        new_stock_quantity: inventoryRecord?.stock_quantity || 0,
        old_reserved_stock: inventoryRecord ? inventoryRecord.reserved_stock - changeAmount : null,
        new_reserved_stock: inventoryRecord?.reserved_stock || 0,
        old_available_stock: inventoryRecord ? (inventoryRecord.available_stock || 0) + changeAmount : null,
        new_available_stock: inventoryRecord?.available_stock || 0,
        change_amount: changeAmount,
        reason: reason,
        user_id: user?.id,
        order_id: orderId,
        cart_id: cartId
      });

    if (error) {
      console.error('Error logging inventory change:', error);
    }
  } catch (error) {
    console.error('Error in logInventoryChange:', error);
  }
}

/**
 * Bulk update stock for multiple products
 */
export async function bulkUpdateStock(
  updates: Array<{
    productId: string;
    stockChange: number;
    colorVariantId?: string;
    sizeVariantId?: string;
    reason?: string;
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const update of updates) {
    const result = await updateStock(
      update.productId,
      update.stockChange,
      update.colorVariantId,
      update.sizeVariantId,
      0,
      update.reason || 'Bulk update'
    );

    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Set low stock threshold for a product
 */
export async function setLowStockThreshold(
  inventoryId: string,
  threshold: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .update({ low_stock_threshold: threshold })
      .eq('id', inventoryId);

    if (error) throw error;

    toast.success(`Low stock threshold updated to ${threshold}`);
    return true;
  } catch (error) {
    console.error('Error setting low stock threshold:', error);
    toast.error('Failed to update low stock threshold');
    return false;
  }
}

/**
 * Get real-time stock information for a product
 */
export async function getRealTimeStock(
  productId: string,
  productInventoryId?: string | null
): Promise<{
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  is_active: boolean;
} | null> {
  try {
    let query = supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock, is_active');

    if (productInventoryId) {
      query = query.eq('id', productInventoryId);
    } else {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching stock info:', error);
      return null;
    }

    return {
      stock_quantity: data.stock_quantity,
      reserved_stock: data.reserved_stock,
      available_stock: data.available_stock || 0,
      is_active: data.is_active || true
    };
  } catch (error) {
    console.error('Error in getRealTimeStock:', error);
    return null;
  }
}

/**
 * Calculate total stock for a product (sum of all variants)
 */
export async function calculateTotalProductStock(productId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('available_stock')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (error || !data) {
      return 0;
    }

    return data.reduce((sum, item) => sum + (item.available_stock || 0), 0);
  } catch (error) {
    console.error('Error calculating total product stock:', error);
    return 0;
  }
}

/**
 * Validate stock for a single cart item
 */
export async function validateCartItemStock(
  productId: string,
  quantity: number,
  colorVariantId?: string,
  sizeVariantId?: string
): Promise<{
  productId: string;
  colorVariantId?: string;
  sizeVariantId?: string;
  requestedQuantity: number;
  availableStock: number;
  isValid: boolean;
  errorMessage?: string;
}> {
  try {
    const variantStock = await getVariantStockInfo(productId, colorVariantId, sizeVariantId);

    if (!variantStock) {
      return {
        productId,
        colorVariantId,
        sizeVariantId,
        requestedQuantity: quantity,
        availableStock: 0,
        isValid: false,
        errorMessage: 'Product variant not found in inventory'
      };
    }

    if (!variantStock.isActive) {
      return {
        productId,
        colorVariantId,
        sizeVariantId,
        requestedQuantity: quantity,
        availableStock: variantStock.availableStock,
        isValid: false,
        errorMessage: 'Product variant is not active'
      };
    }

    const isValid = variantStock.availableStock >= quantity;

    return {
      productId,
      colorVariantId,
      sizeVariantId,
      requestedQuantity: quantity,
      availableStock: variantStock.availableStock,
      isValid,
      errorMessage: isValid ? undefined : `Insufficient stock. Available: ${variantStock.availableStock}, Requested: ${quantity}`
    };
  } catch (error) {
    console.error('Error validating cart item stock:', error);
    return {
      productId,
      colorVariantId,
      sizeVariantId,
      requestedQuantity: quantity,
      availableStock: 0,
      isValid: false,
      errorMessage: 'Error validating stock'
    };
  }
}

/**
 * Get variant stock information
 */
export async function getVariantStockInfo(
  productId: string,
  colorVariantId?: string,
  sizeVariantId?: string
): Promise<{
  colorVariantId?: string;
  sizeVariantId?: string;
  colorName?: string;
  sizeName?: string;
  stockQuantity: number;
  reservedStock: number;
  availableStock: number;
  isActive: boolean;
} | null> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('color_variant_id', colorVariantId || null)
      .eq('size_variant_id', sizeVariantId || null)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      colorVariantId: data.color_variant_id,
      sizeVariantId: data.size_variant_id,
      colorName: data.color_name,
      sizeName: data.size_name,
      stockQuantity: data.stock_quantity,
      reservedStock: data.reserved_stock,
      availableStock: data.available_stock || 0,
      isActive: data.is_active || true
    };
  } catch (error) {
    console.error('Error getting variant stock info:', error);
    return null;
  }
}

/**
 * Get comprehensive stock summary for a product
 */
export async function getProductStockSummary(productId: string): Promise<ProductStockSummary | null> {
  try {
    // Get all inventory records for the product
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId);

    if (inventoryError || !inventoryData) {
      console.error('Error fetching inventory data:', inventoryError);
      return null;
    }

    if (inventoryData.length === 0) {
      return null;
    }

    // Calculate totals
    const totalStockQuantity = inventoryData.reduce((sum, item) => sum + item.stock_quantity, 0);
    const totalReservedStock = inventoryData.reduce((sum, item) => sum + item.reserved_stock, 0);
    const totalAvailableStock = inventoryData.reduce((sum, item) => sum + (item.available_stock || 0), 0);

    const variantCount = inventoryData.length;
    const lowStockVariants = inventoryData.filter(item =>
      (item.available_stock || 0) > 0 &&
      (item.available_stock || 0) <= (item.low_stock_threshold || 10)
    ).length;

    const outOfStockVariants = inventoryData.filter(item =>
      (item.available_stock || 0) === 0
    ).length;

    // Determine overall stock status
    let stockStatus: ProductStockSummary['stockStatus'];
    if (outOfStockVariants === variantCount) {
      stockStatus = 'Out of Stock';
    } else if (lowStockVariants === variantCount || (lowStockVariants > 0 && outOfStockVariants === 0)) {
      stockStatus = 'Low Stock';
    } else if (lowStockVariants === 0 && outOfStockVariants === 0) {
      stockStatus = 'In Stock';
    } else {
      stockStatus = 'Mixed';
    }

    // Get product details
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        name,
        categories(name),
        subcategories(name)
      `)
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('Error fetching product data:', productError);
    }

    // Get the most recent update time
    const lastUpdated = inventoryData.reduce((latest, item) => {
      const itemTime = new Date(item.updated_at || item.created_at).getTime();
      const latestTime = new Date(latest).getTime();
      return itemTime > latestTime ? item.updated_at || item.created_at : latest;
    }, inventoryData[0].updated_at || inventoryData[0].created_at);

    // Check if any variant is active
    const isActive = inventoryData.some(item => item.is_active);

    return {
      productId,
      productName: productData?.name || inventoryData[0].product_name || 'Unknown Product',
      categoryName: productData?.categories?.name,
      subcategoryName: productData?.subcategories?.name,
      totalStockQuantity,
      totalReservedStock,
      totalAvailableStock,
      variantCount,
      lowStockVariants,
      outOfStockVariants,
      stockStatus,
      lastUpdated,
      isActive
    };
  } catch (error) {
    console.error('Error in getProductStockSummary:', error);
    return null;
  }
}

/**
 * Get detailed stock information for all variants of a product
 */
export async function getProductVariantStockDetails(productId: string): Promise<VariantStockDetail[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .order('color_name', { ascending: true })
      .order('size_name', { ascending: true });

    if (error || !data) {
      console.error('Error fetching variant stock details:', error);
      return [];
    }

    return data.map(item => ({
      variantId: item.id,
      colorName: item.color_name,
      sizeName: item.size_name,
      stockQuantity: item.stock_quantity,
      reservedStock: item.reserved_stock,
      availableStock: item.available_stock || 0,
      lowStockThreshold: item.low_stock_threshold || 10,
      stockStatus: (item.available_stock || 0) === 0 ? 'Out of Stock' :
        (item.available_stock || 0) <= (item.low_stock_threshold || 10) ? 'Low Stock' : 'In Stock',
      lastUpdated: item.updated_at || item.created_at
    }));
  } catch (error) {
    console.error('Error in getProductVariantStockDetails:', error);
    return [];
  }
}

/**
 * Get comprehensive stock calculations for the entire inventory
 */
export async function getInventoryStockCalculations(): Promise<StockCalculationResult> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('stock_quantity, reserved_stock, available_stock, is_active, cost_price');

    if (error || !data) {
      console.error('Error fetching inventory data for calculations:', error);
      return {
        totalItems: 0,
        activeItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalStockValue: 0,
        totalAvailableValue: 0,
        totalReservedValue: 0,
        averageStockLevel: 0,
        stockTurnoverRatio: 0
      };
    }

    const totalItems = data.length;
    const activeItems = data.filter(item => item.is_active).length;
    const lowStockItems = data.filter(item =>
      (item.available_stock || 0) > 0 &&
      (item.available_stock || 0) <= 10
    ).length;
    const outOfStockItems = data.filter(item => (item.available_stock || 0) === 0).length;

    const totalStockValue = data.reduce((sum, item) =>
      sum + ((item.cost_price || 0) * item.stock_quantity), 0
    );
    const totalAvailableValue = data.reduce((sum, item) =>
      sum + ((item.cost_price || 0) * (item.available_stock || 0)), 0
    );
    const totalReservedValue = data.reduce((sum, item) =>
      sum + ((item.cost_price || 0) * item.reserved_stock), 0
    );

    const averageStockLevel = totalItems > 0 ?
      data.reduce((sum, item) => sum + item.stock_quantity, 0) / totalItems : 0;

    const stockTurnoverRatio = totalStockValue > 0 ?
      totalAvailableValue / totalStockValue : 0;

    return {
      totalItems,
      activeItems,
      lowStockItems,
      outOfStockItems,
      totalStockValue,
      totalAvailableValue,
      totalReservedValue,
      averageStockLevel,
      stockTurnoverRatio
    };
  } catch (error) {
    console.error('Error in getInventoryStockCalculations:', error);
    return {
      totalItems: 0,
      activeItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalStockValue: 0,
      totalAvailableValue: 0,
      totalReservedValue: 0,
      averageStockLevel: 0,
      stockTurnoverRatio: 0
    };
  }
}

/**
 * Get stock summary for multiple products
 */
export async function getMultipleProductStockSummaries(productIds: string[]): Promise<ProductStockSummary[]> {
  try {
    const summaries: ProductStockSummary[] = [];

    for (const productId of productIds) {
      const summary = await getProductStockSummary(productId);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  } catch (error) {
    console.error('Error in getMultipleProductStockSummaries:', error);
    return [];
  }
}

/**
 * Calculate stock utilization percentage
 */
export function calculateStockUtilization(availableStock: number, totalStock: number): number {
  if (totalStock === 0) return 0;
  return Math.round((availableStock / totalStock) * 100);
}

/**
 * Calculate stock turnover rate
 */
export function calculateStockTurnoverRate(
  totalStock: number,
  reservedStock: number,
  timePeriod: number = 30
): number {
  if (totalStock === 0) return 0;
  const availableStock = totalStock - reservedStock;
  return Math.round((availableStock / totalStock) * (365 / timePeriod));
}

/**
 * Get stock alerts for products
 */
export async function getStockAlerts(threshold: number = 10): Promise<ProductStockSummary[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('product_id')
      .lte('available_stock', threshold)
      .eq('is_active', true);

    if (error || !data) {
      return [];
    }

    // Get unique product IDs
    const uniqueProductIds = [...new Set(data.map(item => item.product_id))];

    // Get summaries for these products
    return await getMultipleProductStockSummaries(uniqueProductIds);
  } catch (error) {
    console.error('Error in getStockAlerts:', error);
    return [];
  }
}

/**
 * Calculate stock value by category
 */
export async function getStockValueByCategory(): Promise<Array<{
  categoryName: string;
  totalValue: number;
  itemCount: number;
  averageValue: number;
}>> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select(`
        stock_quantity,
        cost_price,
        categories(name)
      `)
      .eq('is_active', true);

    if (error || !data) {
      return [];
    }

    // Group by category
    const categoryGroups = data.reduce((groups, item) => {
      const categoryName = (item.categories as any)?.name || 'Uncategorized';
      if (!groups[categoryName]) {
        groups[categoryName] = {
          categoryName,
          totalValue: 0,
          itemCount: 0,
          averageValue: 0
        };
      }

      groups[categoryName].totalValue += (item.cost_price || 0) * item.stock_quantity;
      groups[categoryName].itemCount += 1;

      return groups;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.values(categoryGroups).forEach((group: any) => {
      group.averageValue = group.itemCount > 0 ? group.totalValue / group.itemCount : 0;
    });

    return Object.values(categoryGroups);
  } catch (error) {
    console.error('Error in getStockValueByCategory:', error);
    return [];
  }
}

/**
 * Get product inventory for a specific product
 */
export async function getProductInventory(productId: string): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('product_id', productId)
      .order('color_name', { ascending: true })
      .order('size_name', { ascending: true });

    if (error) throw error;

    // Transform data to match InventoryItem interface
    return (data || []).map(item => ({
      id: item.id,
      product_id: item.product_id,
      sku: item.sku,
      color_variant_id: item.color_variant_id,
      size_variant_id: item.size_variant_id,
      product_name: item.product_name,
      color_name: item.color_name,
      size_name: item.size_name,
      size_code: item.size_code,
      stock_quantity: item.stock_quantity,
      reserved_stock: item.reserved_stock,
      available_stock: item.available_stock || 0,
      low_stock_threshold: item.low_stock_threshold || 10,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      category_id: item.category_id,
      subcategory_id: item.subcategory_id,
      category_name: item.category_name,
      subcategory_name: item.subcategory_name,
      is_active: item.is_active || true,
      created_at: item.created_at || '',
      updated_at: item.updated_at || ''
    }));
  } catch (error) {
    console.error('Error fetching product inventory:', error);
    return [];
  }
}

/**
 * Update an inventory item
 */
export async function updateInventoryItem(
  inventoryId: string,
  updates: Partial<{
    stock_quantity: number;
    reserved_stock: number;
    available_stock: number;
    low_stock_threshold: number;
    cost_price: number;
    selling_price: number;
    is_active: boolean;
  }>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_inventory')
      .update(updates)
      .eq('id', inventoryId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return false;
  }
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(
  inventoryData: {
    product_id: string;
    sku: string;
    color_variant_id?: string;
    size_variant_id?: string;
    product_name: string;
    color_name?: string;
    size_name?: string;
    size_code?: string;
    stock_quantity: number;
    reserved_stock: number;
    available_stock: number;
    low_stock_threshold: number;
    cost_price?: number;
    selling_price?: number;
    category_id?: string;
    subcategory_id?: string;
    category_name?: string;
    subcategory_name?: string;
    is_active: boolean;
  }
): Promise<InventoryItem | null> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .insert(inventoryData)
      .select()
      .single();

    if (error) throw error;

    return data ? {
      id: data.id,
      product_id: data.product_id,
      sku: data.sku,
      color_variant_id: data.color_variant_id,
      size_variant_id: data.size_variant_id,
      product_name: data.product_name,
      color_name: data.color_name,
      size_name: data.size_name,
      size_code: data.size_code,
      stock_quantity: data.stock_quantity,
      reserved_stock: data.reserved_stock,
      available_stock: data.available_stock || 0,
      low_stock_threshold: data.low_stock_threshold || 10,
      cost_price: data.cost_price,
      selling_price: data.selling_price,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id,
      category_name: data.category_name,
      subcategory_name: data.subcategory_name,
      is_active: data.is_active || true,
      created_at: data.created_at || '',
      updated_at: data.updated_at || ''
    } : null;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return null;
  }
}

/**
 * Create inventory for a product (used when creating new products)
 */
export async function createInventoryForProduct(
  productId: string,
  productName: string,
  categoryId: string,
  subcategoryId: string,
  categoryName: string,
  subcategoryName: string,
  costPrice: number,
  sellingPrice: number
): Promise<boolean> {
  try {
    // Generate SKU for the product
    const sku = await generateProductSKU(productName);

    // Create base inventory item
    const inventoryData = {
      product_id: productId,
      sku,
      product_name: productName,
      stock_quantity: 0,
      reserved_stock: 0,
      available_stock: 0,
      low_stock_threshold: 10,
      cost_price: costPrice,
      selling_price: sellingPrice,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      category_name: categoryName,
      subcategory_name: subcategoryName,
      is_active: true
    };

    const { error } = await supabase
      .from('product_inventory')
      .insert(inventoryData);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error creating inventory for product:', error);
    return false;
  }
}

/**
 * Generate a unique SKU for a product
 */
export async function generateProductSKU(productName: string): Promise<string> {
  try {
    // Create base SKU from product name
    const baseSku = productName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);

    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4);
    const sku = `${baseSku}${timestamp}`;

    // Check if SKU already exists
    const { data: existing } = await supabase
      .from('product_inventory')
      .select('id')
      .eq('sku', sku)
      .single();

    if (existing) {
      // If exists, add random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      return `${sku}${randomSuffix}`;
    }

    return sku;
  } catch (error) {
    console.error('Error generating SKU:', error);
    // Fallback SKU
    return `PROD${Date.now()}`;
  }
}

/**
 * Validate cart stock (for checkout validation)
 */
export async function validateCartStock(cartItems: CartItem[]): Promise<StockValidationResult> {
  return await validateCheckoutStock(cartItems);
}

/**
 * Get inventory by SKU
 */
export async function getInventoryBySKU(sku: string): Promise<InventoryItem | null> {
  try {
    const { data, error } = await supabase
      .from('product_inventory')
      .select('*')
      .eq('sku', sku)
      .single();

    if (error) throw error;

    if (!data) return null;

    // Transform data to match InventoryItem interface
    return {
      id: data.id,
      product_id: data.product_id,
      sku: data.sku,
      color_variant_id: data.color_variant_id,
      size_variant_id: data.size_variant_id,
      product_name: data.product_name,
      color_name: data.color_name,
      size_name: data.size_name,
      size_code: data.size_code,
      stock_quantity: data.stock_quantity,
      reserved_stock: data.reserved_stock,
      available_stock: data.available_stock || 0,
      low_stock_threshold: data.low_stock_threshold || 10,
      cost_price: data.cost_price,
      selling_price: data.selling_price,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id,
      category_name: data.category_name,
      subcategory_name: data.subcategory_name,
      is_active: data.is_active || true,
      created_at: data.created_at || '',
      updated_at: data.updated_at || ''
    };
  } catch (error) {
    console.error('Error fetching inventory by SKU:', error);
    return null;
  }
}

/**
 * Search inventory with filters
 */
export async function searchInventory(
  query: string,
  filters?: {
    categoryId?: string;
    subcategoryId?: string;
    stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
    isActive?: boolean;
  }
): Promise<InventoryItem[]> {
  try {
    let queryBuilder = supabase
      .from('product_inventory')
      .select('*')
      .or(`product_name.ilike.%${query}%,sku.ilike.%${query}%`);

    if (filters?.categoryId) {
      queryBuilder = queryBuilder.eq('category_id', filters.categoryId);
    }

    if (filters?.subcategoryId) {
      queryBuilder = queryBuilder.eq('subcategory_id', filters.subcategoryId);
    }

    if (filters?.stockStatus) {
      switch (filters.stockStatus) {
        case 'out_of_stock':
          queryBuilder = queryBuilder.eq('available_stock', 0);
          break;
        case 'low_stock':
          queryBuilder = queryBuilder.lte('available_stock', 'low_stock_threshold');
          break;
        case 'in_stock':
          queryBuilder = queryBuilder.gt('available_stock', 'low_stock_threshold');
          break;
      }
    }

    if (filters?.isActive !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', filters.isActive);
    }

    const { data, error } = await queryBuilder.order('product_name');

    if (error) throw error;

    // Transform data to match InventoryItem interface
    return (data || []).map(item => ({
      id: item.id,
      product_id: item.product_id,
      sku: item.sku,
      color_variant_id: item.color_variant_id,
      size_variant_id: item.size_variant_id,
      product_name: item.product_name,
      color_name: item.color_name,
      size_name: item.size_name,
      size_code: item.size_code,
      stock_quantity: item.stock_quantity,
      reserved_stock: item.reserved_stock,
      available_stock: item.available_stock || 0,
      low_stock_threshold: item.low_stock_threshold || 10,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      category_id: item.category_id,
      subcategory_id: item.subcategory_id,
      category_name: item.category_name,
      subcategory_name: item.subcategory_name,
      is_active: item.is_active || true,
      created_at: item.created_at || '',
      updated_at: item.updated_at || ''
    }));
  } catch (error) {
    console.error('Error searching inventory:', error);
    return [];
  }
}

// ============================================================================
// REACT HOOKS FOR REAL-TIME UPDATES
// ============================================================================

/**
 * React hook for real-time inventory updates
 */
export function useInventoryRealtime(
  channel: string = 'inventory-updates',
  callback?: (data: any) => void
) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = inventorySubscriptionManager.subscribeToInventory(
      channel,
      (payload) => {
        setData(payload);
        if (callback) {
          callback(payload);
        }
      }
    );

    return unsubscribe;
  }, [channel, callback]);

  return data;
}
