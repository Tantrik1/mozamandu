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
  addedOrder: number; // Order in which item was added to cart
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
  activeCombo: any;
}

const RobustCartContext = createContext<RobustCartContextType | undefined>(undefined);

export function RobustCartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextAddedOrder, setNextAddedOrder] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    loadCartFromStorage();
  }, []);

  useEffect(() => {
    saveCartToStorage();
  }, [cartItems]);

  const loadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
        
        // Update next order counter based on existing items
        const maxOrder = parsedCart.reduce((max: number, item: CartItem) => 
          Math.max(max, item.addedOrder || 0), 0);
        setNextAddedOrder(maxOrder + 1);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    }
  };

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
    try {
      setLoading(true);

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

        // Generate SKU and get inventory ID
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
        description: `${quantity} ${productName} added to cart`,
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

  const getItemPricing = (item: CartItem): PricingInfo => {
    return {
      finalPrice: item.unitPrice,
      currentItemPrice: item.unitPrice,
      mode: 'normal' as const,
      description: `Rs. ${item.unitPrice.toFixed(2)} per item`,
      breakdown: [],
      savings: 0
    };
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
