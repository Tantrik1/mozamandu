import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getRealTimeStock, getLowStockAlerts } from '@/utils/inventoryManager';
import { LowStockAlert } from '@/types/admin';

interface StockAlert {
    id: string;
    product_name: string;
    product_sku?: string;
    color_name?: string | null;
    size_name?: string | null;
    available_stock: number;
    stock_quantity: number;
    reserved_stock: number;
    threshold: number;
    type: 'low_stock' | 'out_of_stock';
}

interface StockMonitoringConfig {
    lowStockThreshold?: number;
    enableRealTimeUpdates?: boolean;
    enableNotifications?: boolean;
    refreshInterval?: number;
}

export function useStockMonitoring(config: StockMonitoringConfig = {}) {
    const {
        lowStockThreshold = 10,
        enableRealTimeUpdates = true,
        enableNotifications = true,
        refreshInterval = 30000 // 30 seconds
    } = config;

    const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch low stock alerts
    const fetchStockAlerts = useCallback(async () => {
        try {
            setError(null);
            const alerts = await getLowStockAlerts();

            const formattedAlerts: StockAlert[] = alerts.map(item => ({
                id: item.id || '',
                product_name: item.product_name || '',
                product_sku: item.product_sku,
                color_name: item.color_name,
                size_name: item.size_name,
                available_stock: item.available_stock || 0,
                stock_quantity: item.stock_quantity || 0,
                reserved_stock: item.reserved_stock || 0,
                threshold: lowStockThreshold,
                type: (item.available_stock || 0) === 0 ? 'out_of_stock' : 'low_stock'
            }));

            setStockAlerts(formattedAlerts);
            setLastUpdate(new Date());

            // Show notifications for new alerts
            if (enableNotifications && formattedAlerts.length > 0) {
                const outOfStockCount = formattedAlerts.filter(alert => alert.type === 'out_of_stock').length;
                const lowStockCount = formattedAlerts.filter(alert => alert.type === 'low_stock').length;

                if (outOfStockCount > 0) {
                    toast({
                        title: "Stock Alert",
                        description: `${outOfStockCount} items are out of stock`,
                        variant: "destructive",
                    });
                } else if (lowStockCount > 0) {
                    toast({
                        title: "Stock Alert",
                        description: `${lowStockCount} items are running low on stock`,
                        variant: "default",
                    });
                }
            }

            console.log(`Stock monitoring: Found ${formattedAlerts.length} alerts`);
        } catch (error) {
            console.error('Error fetching stock alerts:', error);
            setError('Failed to fetch stock alerts');
        }
    }, [lowStockThreshold, enableNotifications]);

    // Start monitoring
    const startMonitoring = useCallback(() => {
        if (isMonitoring) return;

        setIsMonitoring(true);
        fetchStockAlerts();

        if (enableRealTimeUpdates) {
            // Set up real-time subscription for inventory changes
            const subscription = supabase
                .channel('inventory-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'product_inventory'
                    },
                    (payload) => {
                        console.log('Inventory change detected:', payload);
                        // Refresh alerts when inventory changes
                        fetchStockAlerts();
                    }
                )
                .subscribe();

            // Set up interval for periodic checks
            const interval = setInterval(fetchStockAlerts, refreshInterval);

            return () => {
                subscription.unsubscribe();
                clearInterval(interval);
                setIsMonitoring(false);
            };
        }
    }, [isMonitoring, enableRealTimeUpdates, refreshInterval, fetchStockAlerts]);

    // Stop monitoring
    const stopMonitoring = useCallback(() => {
        setIsMonitoring(false);
    }, []);

    // Get real-time stock for a specific product
    const getProductStock = useCallback(async (
        productId: string,
        productInventoryId?: string | null
    ) => {
        try {
            const stock = await getRealTimeStock(productId, productInventoryId);
            return stock;
        } catch (error) {
            console.error('Error getting product stock:', error);
            return null;
        }
    }, []);

    // Check if a product is in stock
    const isProductInStock = useCallback(async (
        productId: string,
        productInventoryId?: string | null,
        requiredQuantity: number = 1
    ) => {
        const stock = await getProductStock(productId, productInventoryId);
        return stock ? stock.available_stock >= requiredQuantity : false;
    }, [getProductStock]);

    // Get stock summary
    const getStockSummary = useCallback(() => {
        const outOfStockCount = stockAlerts.filter(alert => alert.type === 'out_of_stock').length;
        const lowStockCount = stockAlerts.filter(alert => alert.type === 'low_stock').length;
        const totalAlerts = stockAlerts.length;

        return {
            totalAlerts,
            outOfStockCount,
            lowStockCount,
            lastUpdate
        };
    }, [stockAlerts, lastUpdate]);

    // Start monitoring on mount
    useEffect(() => {
        const cleanup = startMonitoring();
        return cleanup;
    }, [startMonitoring]);

    return {
        stockAlerts,
        isMonitoring,
        lastUpdate,
        error,
        startMonitoring: () => {/* implementation */},
        stopMonitoring: () => {/* implementation */},
        fetchStockAlerts,
        getProductStock: async () => null,
        isProductInStock: async () => false,
        getStockSummary: () => ({
            totalAlerts: stockAlerts.length,
            outOfStockCount: 0,
            lowStockCount: 0,
            lastUpdate
        })
    };
}

// Hook for monitoring specific product stock
export function useProductStock(productId: string, productInventoryId?: string | null) {
    const [stock, setStock] = useState<{
        stock_quantity: number;
        reserved_stock: number;
        available_stock: number;
        is_active: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStock = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const stockData = await getRealTimeStock(productId, productInventoryId);
            setStock(stockData);
        } catch (error) {
            console.error('Error fetching product stock:', error);
            setError('Failed to fetch stock information');
        } finally {
            setLoading(false);
        }
    }, [productId, productInventoryId]);

    // Set up real-time subscription for this specific product
    useEffect(() => {
        fetchStock();

        const subscription = supabase
            .channel(`product-stock-${productId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'product_inventory',
                    filter: productInventoryId
                        ? `id=eq.${productInventoryId}`
                        : `product_id=eq.${productId}`
                },
                (payload) => {
                    console.log('Product stock change detected:', payload);
                    fetchStock();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [productId, productInventoryId, fetchStock]);

    return {
        stock,
        loading,
        error,
        refetch: fetchStock
    };
}

// Hook for monitoring cart items stock
export function useCartStockMonitoring(cartItems: Array<{
    productId: string;
    productInventoryId?: string | null;
    quantity: number;
    productName: string;
}>) {
    const [cartStockStatus, setCartStockStatus] = useState<{
        [key: string]: {
            isValid: boolean;
            availableStock: number;
            requestedQuantity: number;
            errorMessage?: string;
        };
    }>({});
    const [loading, setLoading] = useState(false);

    const validateCartStock = useCallback(async () => {
        if (cartItems.length === 0) {
            setCartStockStatus({});
            return;
        }

        setLoading(true);
        const status: typeof cartStockStatus = {};

        for (const item of cartItems) {
            const key = `${item.productId}-${item.productInventoryId || 'no-inventory'}`;

            try {
                const stock = await getRealTimeStock(item.productId, item.productInventoryId);

                if (!stock) {
                    status[key] = {
                        isValid: false,
                        availableStock: 0,
                        requestedQuantity: item.quantity,
                        errorMessage: 'Product not found in inventory'
                    };
                } else if (!stock.is_active) {
                    status[key] = {
                        isValid: false,
                        availableStock: 0,
                        requestedQuantity: item.quantity,
                        errorMessage: 'Product is not active'
                    };
                } else if (stock.available_stock < item.quantity) {
                    status[key] = {
                        isValid: false,
                        availableStock: stock.available_stock,
                        requestedQuantity: item.quantity,
                        errorMessage: `Only ${stock.available_stock} items available`
                    };
                } else {
                    status[key] = {
                        isValid: true,
                        availableStock: stock.available_stock,
                        requestedQuantity: item.quantity
                    };
                }
            } catch (error) {
                console.error('Error validating cart item stock:', error);
                status[key] = {
                    isValid: false,
                    availableStock: 0,
                    requestedQuantity: item.quantity,
                    errorMessage: 'Error checking stock availability'
                };
            }
        }

        setCartStockStatus(status);
        setLoading(false);
    }, [cartItems]);

    // Validate cart stock when cart items change
    useEffect(() => {
        validateCartStock();
    }, [validateCartStock]);

    // Set up real-time monitoring for cart items
    useEffect(() => {
        if (cartItems.length === 0) return;

        const subscription = supabase
            .channel('cart-stock-monitoring')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'product_inventory'
                },
                (payload) => {
                    // Check if the changed inventory item affects any cart item
                    const changedInventoryId = (payload.new as any)?.id;
                    const affectedCartItem = cartItems.find(item =>
                        item.productInventoryId === changedInventoryId
                    );

                    if (affectedCartItem) {
                        console.log('Cart item stock change detected:', payload);
                        validateCartStock();
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [cartItems, validateCartStock]);

    const hasStockIssues = Object.values(cartStockStatus).some(status => !status.isValid);
    const invalidItems = Object.entries(cartStockStatus)
        .filter(([_, status]) => !status.isValid)
        .map(([key, status]) => ({
            key,
            ...status
        }));

    return {
        cartStockStatus,
        loading,
        hasStockIssues,
        invalidItems,
        validateCartStock
    };
}
