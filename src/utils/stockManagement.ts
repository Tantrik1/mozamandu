import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// STOCK VALIDATION AND MANAGEMENT UTILITIES
// ============================================================================

export interface StockInfo {
    stock_quantity: number;
    reserved_stock: number;
    available_stock: number;
    is_active: boolean;
}

export interface StockValidationResult {
    isValid: boolean;
    errorMessage?: string;
    availableStock: number;
}

/**
 * Get real-time stock information for a product
 */
export async function getRealTimeStock(
    productId: string,
    productInventoryId?: string | null
): Promise<StockInfo | null> {
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
 * Validate stock availability for a product
 */
export async function validateStock(
    productId: string,
    productInventoryId: string | null = null,
    requestedQuantity: number = 1
): Promise<StockValidationResult> {
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
 * Reserve stock for a cart item
 */
export async function reserveStockForCartItem(
    productId: string,
    productInventoryId: string | null,
    quantity: number
): Promise<boolean> {
    try {
        // Use the safe_update_stock function to reserve stock
        const { data, error } = await supabase.rpc('safe_update_stock', {
            p_product_id: productId,
            p_stock_change: 0,
            p_color_variant_id: null,
            p_size_variant_id: null,
            p_reservation_change: quantity,
            p_reason: 'Stock reserved for cart'
        });

        if (error) {
            console.error('Error reserving stock:', error);
            return false;
        }

        return data === true;
    } catch (error) {
        console.error('Error in reserveStockForCartItem:', error);
        return false;
    }
}

/**
 * Release stock for a cart item
 */
export async function releaseStockForCartItem(
    productId: string,
    productInventoryId: string | null,
    quantity: number
): Promise<boolean> {
    try {
        // Use the safe_update_stock function to release stock
        const { data, error } = await supabase.rpc('safe_update_stock', {
            p_product_id: productId,
            p_stock_change: 0,
            p_color_variant_id: null,
            p_size_variant_id: null,
            p_reservation_change: -quantity,
            p_reason: 'Stock released from cart'
        });

        if (error) {
            console.error('Error releasing stock:', error);
            return false;
        }

        return data === true;
    } catch (error) {
        console.error('Error in releaseStockForCartItem:', error);
        return false;
    }
}

/**
 * Update cart item stock reservation
 */
export async function updateCartItemStock(
    productId: string,
    productInventoryId: string | null,
    oldQuantity: number,
    newQuantity: number
): Promise<boolean> {
    try {
        const quantityDifference = newQuantity - oldQuantity;

        if (quantityDifference === 0) {
            return true; // No change needed
        }

        // Use the safe_update_stock function to update stock reservation
        const { data, error } = await supabase.rpc('safe_update_stock', {
            p_product_id: productId,
            p_stock_change: 0,
            p_color_variant_id: null,
            p_size_variant_id: null,
            p_reservation_change: quantityDifference,
            p_reason: `Cart quantity updated from ${oldQuantity} to ${newQuantity}`
        });

        if (error) {
            console.error('Error updating cart item stock:', error);
            return false;
        }

        return data === true;
    } catch (error) {
        console.error('Error in updateCartItemStock:', error);
        return false;
    }
}

// ============================================================================
// CART VALIDATION UTILITIES
// ============================================================================

export interface CartItem {
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
    validItems: CartItem[];
    removedItems: CartItem[];
    errors: string[];
}

/**
 * Validate and clean cart items
 */
export async function validateCartItems(cartItems: CartItem[]): Promise<CartValidationResult> {
    const validItems: CartItem[] = [];
    const removedItems: CartItem[] = [];
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
            const updatedItem: CartItem = {
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
    removedItems: CartItem[],
    errors: string[]
): void {
    if (removedItems.length > 0) {
        toast({
            title: "Cart Updated",
            description: `${removedItems.length} items were removed from your cart due to availability changes.`,
            variant: "default",
            duration: 5000,
        });

        // Log detailed errors for debugging
        console.log('Cart cleanup details:', { removedItems, errors });
    }
}

// ============================================================================
// UNIFIED STOCK MANAGER
// ============================================================================

/**
 * Get variant stock information
 */
export async function getVariantStockInfo(
    productId: string,
    colorVariantId?: string,
    sizeVariantId?: string
): Promise<StockInfo | null> {
    try {
        let query = supabase
            .from('product_inventory')
            .select('stock_quantity, reserved_stock, available_stock, is_active')
            .eq('product_id', productId);

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

        if (error) {
            console.error('Error fetching variant stock info:', error);
            return null;
        }

        return {
            stock_quantity: data.stock_quantity,
            reserved_stock: data.reserved_stock,
            available_stock: data.available_stock || 0,
            is_active: data.is_active || true
        };
    } catch (error) {
        console.error('Error in getVariantStockInfo:', error);
        return null;
    }
}

/**
 * Get low stock alerts with custom threshold
 */
export async function getLowStockAlerts(threshold: number = 10): Promise<any[]> {
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
            .filter('available_stock', 'lte', threshold)
            .order('available_stock', { ascending: true });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error fetching low stock alerts:', error);
        return [];
    }
} 