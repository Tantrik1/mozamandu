import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCartPricing } from './useCartPricing';
import { useComboManager } from './useComboManager';
import { validateCartItems, showCartCleanupNotification } from '@/utils/cartValidation';
import { getVariantStockInfo } from '@/utils/unifiedStockManager';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  basePrice: number;
  subcategoryId: string;
  image_url?: string;
}

interface AddToCartParams {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  quantity: number;
}

interface SubcategoryData {
  id: string;
  name: string;
  selling_price: number;  
  minimum_quantity: number;
}

interface ComboData {
  id: string;
  name: string;
  description: string;
  combo_subcategories: {
    subcategory_id: string;
    min_units: number;
    price: number;
  }[];
}

interface DiscountTier {
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface PricingInfo {
  finalPrice: number;
  description: string;
  mode: 'normal' | 'discount' | 'combo';
  isCombo?: boolean;
  breakdown?: string[];
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (params: AddToCartParams) => Promise<void>;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getItemPricing: (item: CartItem) => PricingInfo;
  activeCombo: ComboData | null;
  loading: boolean;
  error: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function RobustCartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subcategoriesData, setSubcategoriesData] = useState<{ [key: string]: SubcategoryData }>({});
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: DiscountTier[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartValidated, setCartValidated] = useState(false);

  const { activeCombo } = useComboManager({ cartItems });

  const { getItemPricing, getTotalPrice: calculateTotalPrice } = useCartPricing({
    cartItems,
    activeCombo,
    discountTiers
  });

  useEffect(() => {
    loadCartFromStorage();
    fetchSubcategoriesData();
    fetchDiscountTiers();
  }, []);

  useEffect(() => {
    if (cartItems.length > 0 && !cartValidated) {
      validateAndCleanCart();
    }
  }, [cartItems, cartValidated]);

  useEffect(() => {
    if (cartValidated) {
      saveCartToStorage();
    }
  }, [cartItems, cartValidated]);

  const setErrorWithTimeout = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const validateAndCleanCart = async () => {
    if (cartItems.length === 0) {
      setCartValidated(true);
      return;
    }

    console.log('Validating cart items...');
    setLoading(true);

    try {
      const { validItems, removedItems, errors } = await validateCartItems(cartItems);
      
      if (removedItems.length > 0) {
        console.log(`Removed ${removedItems.length} invalid items from cart`);
        setCartItems(validItems);
        showCartCleanupNotification(removedItems, errors);
      }
      
      setCartValidated(true);
    } catch (error) {
      console.error('Error validating cart:', error);
      setErrorWithTimeout('Error validating cart items');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategoriesData = async () => {
    try {
      console.log('Fetching subcategories data...');
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, selling_price, minimum_quantity')
        .eq('status', 'on');

      if (error) {
        console.error('Error fetching subcategories:', error);
        setErrorWithTimeout('Failed to load pricing data');
        return;
      }

      const subcategoriesMap = data?.reduce((acc, sub) => {
        acc[sub.id] = sub;
        return acc;
      }, {} as { [key: string]: SubcategoryData }) || {};
      
      console.log('Loaded subcategories:', Object.keys(subcategoriesMap).length);
      setSubcategoriesData(subcategoriesMap);
    } catch (error) {
      console.error('Unexpected error fetching subcategories:', error);
      setErrorWithTimeout('Failed to load pricing data');
    }
  };

  const fetchDiscountTiers = async () => {
    try {
      console.log('Fetching discount tiers...');
      const { data, error } = await supabase
        .from('discount_tiers')
        .select('*')
        .order('subcategory_id')
        .order('min_quantity');

      if (error) {
        console.error('Error fetching discount tiers:', error);
        return;
      }

      const tiersMap = data?.reduce((acc, tier) => {
        if (!acc[tier.subcategory_id]) {
          acc[tier.subcategory_id] = [];
        }
        acc[tier.subcategory_id].push(tier);
        return acc;
      }, {} as { [key: string]: DiscountTier[] }) || {};
      
      console.log('Loaded discount tiers for subcategories:', Object.keys(tiersMap).length);
      setDiscountTiers(tiersMap);
    } catch (error) {
      console.error('Unexpected error fetching discount tiers:', error);
    }
  };

  const loadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        console.log('Loaded cart from storage:', parsedCart.length, 'items');
        setCartItems(parsedCart);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      localStorage.removeItem('cart');
    }
  };

  const saveCartToStorage = () => {
    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
      console.log('Saved cart to storage:', cartItems.length, 'items');
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  };

  const validateStock = async (productId: string, colorVariantId: string | null = null, sizeVariantId: string | null = null, requestedQuantity: number): Promise<boolean> => {
    try {
      console.log('=== CART STOCK VALIDATION ===');
      console.log('Validating stock for cart addition:', { productId, colorVariantId, sizeVariantId, requestedQuantity });
      
      const stockInfo = await getVariantStockInfo(productId, colorVariantId, sizeVariantId);
      
      if (!stockInfo.isValid) {
        setErrorWithTimeout(stockInfo.errorMessage || 'Stock validation failed');
        console.log(`Cart stock validation failed: ${stockInfo.errorMessage}`);
        return false;
      }

      if (stockInfo.stockAmount < requestedQuantity) {
        setErrorWithTimeout(`Only ${stockInfo.stockAmount} items available`);
        console.log(`Cart stock validation failed: insufficient stock`);
        return false;
      }

      console.log(`Cart stock validation passed: ${stockInfo.stockAmount} available`);
      return true;
    } catch (error) {
      console.error('Cart stock validation error:', error);
      setErrorWithTimeout('Error checking stock availability');
      return false;
    }
  };

  const addToCart = async (params: AddToCartParams) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('=== ADDING TO CART ===');
      console.log('Add to cart params:', params);
      
      const hasStock = await validateStock(
        params.productId, 
        params.colorVariantId, 
        params.sizeVariantId, 
        params.quantity
      );

      if (!hasStock) {
        toast({
          title: "Stock Issue",
          description: "Not enough stock available for this item",
          variant: "destructive",
        });
        return;
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, image_url, subcategory_id, selling_price, status')
        .eq('id', params.productId)
        .single();

      if (productError || !product) {
        console.error('Error fetching product:', productError);
        throw new Error('Product not found');
      }

      if (product.status !== 'active') {
        setErrorWithTimeout('Product is no longer available');
        toast({
          title: "Product Unavailable",
          description: "This product is no longer available",
          variant: "destructive",
        });
        return;
      }

      let basePrice = product.selling_price;
      if (!basePrice) {
        const subcategory = subcategoriesData[product.subcategory_id];
        basePrice = subcategory?.selling_price || 0;
      }

      let colorName = '';
      let sizeName = '';

      if (params.colorVariantId) {
        const { data: colorVariant } = await supabase
          .from('color_variants')
          .select('color_name')
          .eq('id', params.colorVariantId)
          .single();
        colorName = colorVariant?.color_name || '';
      }

      if (params.sizeVariantId) {
        const { data: sizeVariant } = await supabase
          .from('size_variants')
          .select('size_name')
          .eq('id', params.sizeVariantId)
          .single();
        sizeName = sizeVariant?.size_name || '';
      }

      const existingItemIndex = cartItems.findIndex(item => 
        item.productId === params.productId &&
        item.colorVariantId === params.colorVariantId &&
        item.sizeVariantId === params.sizeVariantId
      );

      if (existingItemIndex >= 0) {
        const existingItem = cartItems[existingItemIndex];
        const newQuantity = existingItem.quantity + params.quantity;
        
        const hasStockForUpdate = await validateStock(
          params.productId, 
          params.colorVariantId, 
          params.sizeVariantId, 
          newQuantity
        );

        if (!hasStockForUpdate) {
          toast({
            title: "Insufficient Stock",
            description: `Cannot add more of this item`,
            variant: "destructive",
          });
          return;
        }

        const updatedItems = [...cartItems];
        updatedItems[existingItemIndex].quantity = newQuantity;
        setCartItems(updatedItems);
        
        console.log('Updated existing cart item quantity:', newQuantity);
      } else {
        const newItem: CartItem = {
          id: `${params.productId}-${params.colorVariantId || 'no-color'}-${params.sizeVariantId || 'no-size'}`,
          productId: params.productId,
          productName: product.name,
          colorVariantId: params.colorVariantId,
          sizeVariantId: params.sizeVariantId,
          colorName,
          sizeName,
          quantity: params.quantity,
          basePrice,
          subcategoryId: product.subcategory_id,
          image_url: product.image_url
        };

        setCartItems(prev => [...prev, newItem]);
        console.log('Added new cart item:', newItem);
      }

      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      setErrorWithTimeout('Failed to add item to cart');
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = (itemId: string) => {
    console.log('Removing item from cart:', itemId);
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    
    toast({
      title: "Removed from Cart",
      description: "Item has been removed from your cart",
    });
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const item = cartItems.find(i => i.id === itemId);
    if (!item) return;

    const hasStock = await validateStock(
      item.productId,
      item.colorVariantId,
      item.sizeVariantId,
      quantity
    );

    if (!hasStock) {
      toast({
        title: "Insufficient Stock",
        description: "Not enough items in stock for this quantity",
        variant: "destructive",
      });
      return;
    }

    console.log('Updating cart item quantity:', itemId, 'to', quantity);
    setCartItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    console.log('Clearing cart');
    setCartItems([]);
    toast({
      title: "Cart Cleared",
      description: "All items have been removed from your cart",
    });
  };

  const getTotalPrice = (): number => {
    return calculateTotalPrice();
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getItemPricing,
    activeCombo,
    loading,
    error
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useRobustCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useRobustCart must be used within a RobustCartProvider');
  }
  return context;
}
