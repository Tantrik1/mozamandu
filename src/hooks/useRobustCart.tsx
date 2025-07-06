
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { validateCartStock } from '@/utils/inventoryManager';

interface CartItem {
  id: string;
  productId: string;
  productInventoryId?: string;
  quantity: number;
  productName: string;
  price: number;
  basePrice: number;
  imageUrl?: string;
  image_url?: string;
  colorName?: string;
  sizeName?: string;
  sku?: string;
  subcategoryId: string;
}

interface StockValidationResult {
  isValid: boolean;
  errorMessages: string[];
  validationResults: Array<{
    isValid: boolean;
    productId: string;
    productInventoryId?: string | null;
    availableStock?: number;
    requestedQuantity: number;
    errorMessage?: string;
  }>;
}

interface ComboData {
  id: string;
  name: string;
  description?: string;
  combo_subcategories: Array<{
    subcategory_id: string;
    min_units: number;
    price: number;
  }>;
}

interface DiscountTier {
  min_quantity: number;
  discount_amount: number;
}

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  validationErrors: string[];
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  clearCart: () => void;
  validateStock: () => Promise<StockValidationResult>;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  isInCart: (productId: string, productInventoryId?: string) => boolean;
  getCartItem: (productId: string, productInventoryId?: string) => CartItem | undefined;
  getItemPricing: (item: CartItem) => any;
  activeCombo: ComboData | null;
  discountTiers: { [subcategoryId: string]: DiscountTier[] };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useRobustCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useRobustCart must be used within a RobustCartProvider');
  }
  return context;
}

export function RobustCartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeCombo, setActiveCombo] = useState<ComboData | null>(null);
  const [discountTiers, setDiscountTiers] = useState<{ [subcategoryId: string]: DiscountTier[] }>({});

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing saved cart:', error);
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const newItem: CartItem = {
      id: `${item.productId}-${item.productInventoryId || 'no-inventory'}-${Date.now()}`,
      ...item,
      quantity: item.quantity || 1,
      basePrice: item.price,
      image_url: item.imageUrl,
      subcategoryId: item.subcategoryId || '',
    };

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        cartItem =>
          cartItem.productId === item.productId &&
          cartItem.productInventoryId === item.productInventoryId
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + (item.quantity || 1)
        };
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, newItem];
      }
    });

    toast({
      title: 'Added to cart',
      description: `${item.productName} has been added to your cart.`,
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));

    toast({
      title: 'Removed from cart',
      description: 'Item has been removed from your cart.',
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setValidationErrors([]);
    localStorage.removeItem('cart');
    
    toast({
      title: 'Cart cleared',
      description: 'All items have been removed from your cart.',
    });
  }, []);

  const validateStock = useCallback(async (): Promise<StockValidationResult> => {
    setLoading(true);
    setValidationErrors([]);

    try {
      const cartItemsForValidation = cartItems.map(item => ({
        productId: item.productId,
        productInventoryId: item.productInventoryId,
        quantity: item.quantity,
        productName: item.productName,
      }));

      const result = await validateCartStock(cartItemsForValidation);
      
      if (!result.isValid) {
        setValidationErrors(result.errorMessages);
        toast({
          title: 'Stock validation failed',
          description: 'Some items in your cart are not available in the requested quantities.',
          variant: 'destructive',
        });
      }

      return result;
    } catch (error) {
      console.error('Error validating stock:', error);
      const errorMessage = 'Failed to validate stock availability';
      setValidationErrors([errorMessage]);
      
      toast({
        title: 'Validation error',
        description: errorMessage,
        variant: 'destructive',
      });

      return {
        isValid: false,
        errorMessages: [errorMessage],
        validationResults: [],
      };
    } finally {
      setLoading(false);
    }
  }, [cartItems]);

  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const isInCart = useCallback((productId: string, productInventoryId?: string) => {
    return cartItems.some(
      item =>
        item.productId === productId && item.productInventoryId === productInventoryId
    );
  }, [cartItems]);

  const getCartItem = useCallback((productId: string, productInventoryId?: string) => {
    return cartItems.find(
      item =>
        item.productId === productId && item.productInventoryId === productInventoryId
    );
  }, [cartItems]);

  const getItemPricing = useCallback((item: CartItem) => {
    return {
      finalPrice: item.price,
      originalPrice: item.basePrice,
      description: `Rs. ${item.price.toFixed(2)} each`,
      mode: 'normal' as const,
      savings: 0,
      breakdown: []
    };
  }, []);

  // Real-time stock monitoring for cart items
  useEffect(() => {
    if (cartItems.length === 0) return;

    const checkStockPeriodically = setInterval(async () => {
      try {
        const cartItemsForValidation = cartItems.map(item => ({
          productId: item.productId,
          productInventoryId: item.productInventoryId,
          quantity: item.quantity,
          productName: item.productName,
        }));

        const result = await validateCartStock(cartItemsForValidation);
        
        if (!result.isValid) {
          // Update validation errors but don't show toast for periodic checks
          setValidationErrors(result.errorMessages);
        } else {
          setValidationErrors([]);
        }
      } catch (error) {
        console.error('Error in periodic stock check:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkStockPeriodically);
  }, [cartItems]);

  const contextValue: CartContextType = {
    cartItems,
    loading,
    validationErrors,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    validateStock,
    getTotalPrice,
    getTotalItems,
    isInCart,
    getCartItem,
    getItemPricing,
    activeCombo,
    discountTiers,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}
