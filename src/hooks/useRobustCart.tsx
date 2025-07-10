
import { useState, useEffect } from 'react';
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
  price: number; // Calculated price
  subcategoryId: string;
  image_url?: string;
  // Legacy support
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
}

const CART_STORAGE_KEY = 'robust_cart_items';

export function useRobustCart() {
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
        // Validate cart items
        const { validItems, removedItems, errors } = await validateCartItems(items);
        
        if (removedItems.length > 0) {
          showCartCleanupNotification(removedItems, errors);
        }
        
        setCartItems(validItems);
        if (validItems.length !== items.length) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(validItems));
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
      price: item.basePrice
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

  return {
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
}
