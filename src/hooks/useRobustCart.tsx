import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getVariantStock } from '@/utils/stockCalculation';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  totalPrice: number;
  colorVariantId?: string;
  colorName?: string;
  sizeVariantId?: string;
  sizeName?: string;
  imageUrl?: string;
  maxStock: number;
  subcategoryId: string;
  addedOrder: number;
  sku?: string;
  inventoryId?: string;
}

export interface PricingInfo {
  finalPrice: number;
  currentItemPrice: number;
  mode: 'normal' | 'combo' | 'discount';
  description: string;
  breakdown?: string[];
  savings?: number;
}

interface RobustCartContextType {
  cartItems: CartItem[];
  loading: boolean;
  addToCart: (params: {
    productId: string;
    productName: string;
    quantity?: number;
    unitPrice: number;
    colorVariantId?: string;
    sizeVariantId?: string;
  }) => Promise<boolean>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getCartTotal: () => number;
  getTotalItems: () => number;
  getCartCount: () => number;
  getItemPricing: (item: CartItem) => PricingInfo;
  validateCartStock: () => Promise<boolean>;
  activeCombo: any;
}

const RobustCartContext = createContext<RobustCartContextType | undefined>(undefined);

// Helper to load cart from localStorage (used for lazy init)
const getInitialCart = (): CartItem[] => {
  try {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      return JSON.parse(savedCart);
    }
  } catch (error) {
    console.error('Error loading cart from storage:', error);
  }
  return [];
};

const getInitialAddedOrder = (items: CartItem[]): number => {
  return items.reduce((max, item) => Math.max(max, item.addedOrder || 0), 0) + 1;
};

export function RobustCartProvider({ children }: { children: React.ReactNode }) {
  // Lazy initialize from localStorage to prevent cart clearing on auth state changes
  const [cartItems, setCartItems] = useState<CartItem[]>(() => getInitialCart());
  const [loading, setLoading] = useState(false);
  const [nextAddedOrder, setNextAddedOrder] = useState(() => getInitialAddedOrder(getInitialCart()));
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Only save to localStorage after initialization (prevents overwriting on mount)
  useEffect(() => {
    if (isInitialized) {
      saveCartToStorage();
    }
  }, [cartItems, isInitialized]);

  // Stock cleanup moved to checkout page only - removed from here to improve performance

  const saveCartToStorage = () => {
    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  };

  const generateCartId = () => {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  };

  const getProductDetails = async (productId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('name, image_url, subcategory_id')
      .eq('id', productId)
      .single();

    if (error) throw error;
    return data;
  };

  const getVariantDetails = async (colorVariantId?: string, sizeVariantId?: string) => {
    let colorName = '';
    let sizeName = '';
    let imageUrl = '';

    if (colorVariantId) {
      const { data: colorData } = await supabase
        .from('color_variants')
        .select('color_name, image_url')
        .eq('id', colorVariantId)
        .single();

      if (colorData) {
        colorName = colorData.color_name;
        imageUrl = colorData.image_url || '';
      }
    }

    if (sizeVariantId) {
      const { data: sizeData } = await supabase
        .from('size_variants')
        .select('size_name')
        .eq('id', sizeVariantId)
        .single();

      if (sizeData) {
        sizeName = sizeData.size_name;
      }
    }

    return { colorName, sizeName, imageUrl };
  };

  const checkStockAvailability = async (
    productId: string,
    colorVariantId?: string,
    sizeVariantId?: string,
    requestedQuantity: number = 1
  ): Promise<{ available: boolean; maxStock: number }> => {
    try {
      const stockData = await getVariantStock(productId, colorVariantId, sizeVariantId);
      
      if (!stockData) {
        return { available: false, maxStock: 0 };
      }

      return {
        available: stockData.availableStock >= requestedQuantity,
        maxStock: stockData.availableStock
      };
    } catch (error) {
      console.error('Error checking stock:', error);
      return { available: false, maxStock: 0 };
    }
  };

  const addToCart = async ({
    productId,
    productName,
    quantity = 1,
    unitPrice,
    colorVariantId,
    sizeVariantId,
  }: {
    productId: string;
    productName: string;
    quantity?: number;
    unitPrice: number;
    colorVariantId?: string;
    sizeVariantId?: string;
  }) => {
    // Validate unitPrice - must be a positive number
    if (!unitPrice || unitPrice <= 0 || isNaN(unitPrice)) {
      toast({
        title: 'Invalid Price',
        description: 'This product has no valid price. Please contact support.',
        variant: 'destructive',
      });
      return false;
    }
    try {
      setLoading(true);

      // Enhanced stock validation for all pricing modes
      const stockCheck = await checkStockAvailability(productId, colorVariantId, sizeVariantId, quantity);
      
      if (!stockCheck.available) {
        toast({
          title: 'Out of Stock',
          description: `Only ${stockCheck.maxStock} units available`,
          variant: 'destructive',
        });
        return false;
      }

      const existingItemIndex = cartItems.findIndex(
        item =>
          item.productId === productId &&
          item.colorVariantId === colorVariantId &&
          item.sizeVariantId === sizeVariantId
      );

      if (existingItemIndex !== -1) {
        const existingItem = cartItems[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;

        const newStockCheck = await checkStockAvailability(productId, colorVariantId, sizeVariantId, newQuantity);
        
        if (!newStockCheck.available) {
          toast({
            title: 'Insufficient Stock',
            description: `Cannot add ${quantity} more items. Only ${newStockCheck.maxStock} units available in total.`,
            variant: 'destructive',
          });
          return false;
        }

        const updatedItems = [...cartItems];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          totalPrice: newQuantity * unitPrice,
          maxStock: newStockCheck.maxStock,
        };
        setCartItems(updatedItems);
      } else {
        const productDetails = await getProductDetails(productId);
        const variantDetails = await getVariantDetails(colorVariantId, sizeVariantId);

        // Enhanced SKU and inventory ID generation for all pricing modes
        const sku = `${productName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const inventoryId = `inv-${productId}-${colorVariantId || 'no-color'}-${sizeVariantId || 'no-size'}`;

        const newItem: CartItem = {
          id: generateCartId(),
          productId,
          productName: productName || productDetails.name,
          quantity,
          unitPrice,
          basePrice: unitPrice,
          totalPrice: quantity * unitPrice,
          colorVariantId,
          colorName: variantDetails.colorName,
          sizeVariantId,
          sizeName: variantDetails.sizeName,
          imageUrl: variantDetails.imageUrl || productDetails.image_url,
          maxStock: stockCheck.maxStock,
          subcategoryId: productDetails.subcategory_id,
          addedOrder: nextAddedOrder,
          sku,
          inventoryId,
        };

        setNextAddedOrder(prev => prev + 1);

        setCartItems(prev => [...prev, newItem]);
      }

      toast({
        title: 'Added to Cart',
        description: `${quantity} ${productName} added to cart (supports all pricing modes)`,
      });

      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to cart',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const item = cartItems.find(item => item.id === itemId);
    if (!item) return;

    try {
      setLoading(true);

      const stockCheck = await checkStockAvailability(
        item.productId,
        item.colorVariantId,
        item.sizeVariantId,
        newQuantity
      );

      if (!stockCheck.available) {
        toast({
          title: 'Insufficient Stock',
          description: `Only ${stockCheck.maxStock} units available`,
          variant: 'destructive',
        });
        return;
      }

      const updatedItems = cartItems.map(cartItem =>
        cartItem.id === itemId
          ? {
              ...cartItem,
              quantity: newQuantity,
              totalPrice: newQuantity * cartItem.unitPrice,
              maxStock: stockCheck.maxStock,
            }
          : cartItem
      );

      setCartItems(updatedItems);
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quantity',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    toast({
      title: 'Removed from Cart',
      description: 'Item removed from cart',
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setNextAddedOrder(1);
    localStorage.removeItem('cart');
    toast({
      title: 'Cart Cleared',
      description: 'All items removed from cart',
    });
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const getCartTotal = () => {
    return getTotalPrice();
  };

  const getTotalItems = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const getCartCount = () => {
    return getTotalItems();
  };

  // Enhanced pricing calculation compatible with all modes
  const getItemPricing = (item: CartItem): PricingInfo => {
    return {
      finalPrice: item.unitPrice,
      currentItemPrice: item.unitPrice,
      mode: 'normal' as const,
      description: `Rs. ${item.unitPrice.toFixed(2)} per item (Base price for all pricing modes)`,
      breakdown: [],
      savings: 0
    };
  };

  // Enhanced stock validation for all cart items
  const validateCartStock = async (): Promise<boolean> => {
    try {
      console.log('🔍 Validating stock for all cart items...');
      
      const validationPromises = cartItems.map(async (item) => {
        const stockCheck = await checkStockAvailability(
          item.productId,
          item.colorVariantId,
          item.sizeVariantId,
          item.quantity
        );
        
        return {
          item,
          valid: stockCheck.available,
          maxStock: stockCheck.maxStock
        };
      });

      const results = await Promise.all(validationPromises);
      const invalidItems = results.filter(result => !result.valid);

      if (invalidItems.length > 0) {
        const errorMessages = invalidItems.map(result => 
          `${result.item.productName}: Available ${result.maxStock}, Required ${result.item.quantity}`
        ).join(', ');
        
        toast({
          title: 'Stock Validation Failed',
          description: `Insufficient stock for: ${errorMessages}`,
          variant: 'destructive',
        });
        return false;
      }

      console.log('✅ All cart items have sufficient stock');
      return true;
    } catch (error) {
      console.error('❌ Cart stock validation failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate cart stock',
        variant: 'destructive',
      });
      return false;
    }
  };

  const contextValue: RobustCartContextType = {
    cartItems,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    getCartTotal,
    getTotalItems,
    getCartCount,
    getItemPricing,
    validateCartStock,
    activeCombo: null,
  };

  return (
    <RobustCartContext.Provider value={contextValue}>
      {children}
    </RobustCartContext.Provider>
  );
}

export function useRobustCart() {
  const context = useContext(RobustCartContext);
  if (context === undefined) {
    throw new Error('useRobustCart must be used within a RobustCartProvider');
  }
  return context;
}
