
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { validateCartItems, showCartCleanupNotification } from '@/utils/cartValidation';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productInventoryId?: string | null;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  basePrice: number;
  price: number;
  subcategoryId: string;
  image_url?: string;
  // Legacy support
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
}

const CART_STORAGE_KEY = 'robust_cart_items';

interface CartContextType {
  cartItems: CartItem[];
  isLoading: boolean;
  addToCart: (item: Omit<CartItem, 'id' | 'price'>) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  refreshCart: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const items = JSON.parse(savedCart);
        // Ensure all items have the required price property
        const itemsWithPrice = items.map((item: any) => ({
          ...item,
          price: item.price || item.basePrice * item.quantity
        }));
        
        // Only validate if products exist, no stock checking
        const { validItems, removedItems, errors } = await validateCartItems(itemsWithPrice);
        
        if (removedItems.length > 0) {
          showCartCleanupNotification(removedItems, errors);
        }
        
        // Ensure validItems have price property before setting state
        const validItemsWithPrice = validItems.map((item: any) => ({
          ...item,
          price: item.price || item.basePrice * item.quantity
        }));
        
        setCartItems(validItemsWithPrice);
        if (validItemsWithPrice.length !== itemsWithPrice.length) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(validItemsWithPrice));
        }
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCart = (items: CartItem[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  };

  const addToCart = (item: Omit<CartItem, 'id' | 'price'>) => {
    const newItem: CartItem = {
      ...item,
      id: `${item.productId}-${item.productInventoryId || 'default'}-${Date.now()}`,
      price: item.basePrice * item.quantity
    };

    const existingItemIndex = cartItems.findIndex(
      cartItem => 
        cartItem.productId === item.productId &&
        cartItem.productInventoryId === item.productInventoryId
    );

    let newItems: CartItem[];
    if (existingItemIndex > -1) {
      newItems = [...cartItems];
      newItems[existingItemIndex].quantity += item.quantity;
      newItems[existingItemIndex].price = newItems[existingItemIndex].basePrice * newItems[existingItemIndex].quantity;
    } else {
      newItems = [...cartItems, newItem];
    }

    setCartItems(newItems);
    saveCart(newItems);
  };

  const removeFromCart = (itemId: string) => {
    const newItems = cartItems.filter(item => item.id !== itemId);
    setCartItems(newItems);
    saveCart(newItems);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const newItems = cartItems.map(item => 
      item.id === itemId 
        ? { ...item, quantity, price: item.basePrice * quantity }
        : item
    );
    setCartItems(newItems);
    saveCart(newItems);
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.basePrice * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const value: CartContextType = {
    cartItems,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    refreshCart: loadCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
