
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCartPricing } from './useCartPricing';
import { useComboManager } from './useComboManager';

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

  // Use the combo manager hook
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
    saveCartToStorage();
  }, [cartItems]);

  const setErrorWithTimeout = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
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
      localStorage.removeItem('cart'); // Clear corrupted data
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

  const validateStock = async (productId: string, colorVariantId?: string | null, sizeVariantId?: string | null, requestedQuantity: number): Promise<boolean> => {
    try {
      console.log('Validating stock for:', { productId, colorVariantId, sizeVariantId, requestedQuantity });
      
      // Check if we have size variant
      if (sizeVariantId) {
        const { data, error } = await supabase
          .from('size_variants')
          .select('stock_quantity')
          .eq('id', sizeVariantId)
          .single();

        if (error || !data) {
          console.error('Error checking size variant stock:', error);
          return false;
        }

        console.log('Size variant stock:', data.stock_quantity);
        return data.stock_quantity >= requestedQuantity;
      }
      
      // Check if we have color variant
      if (colorVariantId) {
        const { data, error } = await supabase
          .from('color_variants')
          .select('stock_quantity')
          .eq('id', colorVariantId)
          .single();

        if (error || !data) {
          console.error('Error checking color variant stock:', error);
          return false;
        }

        console.log('Color variant stock:', data.stock_quantity);
        return data.stock_quantity >= requestedQuantity;
      }
      
      // Check base product stock
      const { data, error } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (error || !data) {
        console.error('Error checking product stock:', error);
        return false;
      }

      console.log('Product stock:', data.stock_quantity);
      return data.stock_quantity >= requestedQuantity;
    } catch (error) {
      console.error('Unexpected error validating stock:', error);
      return false;
    }
  };

  const addToCart = async (params: AddToCartParams) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Adding to cart:', params);
      
      // Validate stock first
      const hasStock = await validateStock(
        params.productId, 
        params.colorVariantId, 
        params.sizeVariantId, 
        params.quantity
      );

      if (!hasStock) {
        setErrorWithTimeout('Insufficient stock for this item');
        toast({
          title: "Out of Stock",
          description: "Sorry, we don't have enough stock for this item",
          variant: "destructive",
        });
        return;
      }

      // Fetch product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, image_url, subcategory_id, selling_price')
        .eq('id', params.productId)
        .single();

      if (productError) {
        console.error('Error fetching product:', productError);
        throw new Error('Product not found');
      }

      // Get base price - use product selling_price if available, otherwise subcategory price
      let basePrice = product.selling_price;
      if (!basePrice) {
        const subcategory = subcategoriesData[product.subcategory_id];
        basePrice = subcategory?.selling_price || 0;
      }

      let colorName = '';
      let sizeName = '';

      // Fetch variant names
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

      // Check if item already exists
      const existingItemIndex = cartItems.findIndex(item => 
        item.productId === params.productId &&
        item.colorVariantId === params.colorVariantId &&
        item.sizeVariantId === params.sizeVariantId
      );

      if (existingItemIndex >= 0) {
        const existingItem = cartItems[existingItemIndex];
        const newQuantity = existingItem.quantity + params.quantity;
        
        // Validate total stock for updated quantity
        const hasStockForUpdate = await validateStock(
          params.productId, 
          params.colorVariantId, 
          params.sizeVariantId, 
          newQuantity
        );

        if (!hasStockForUpdate) {
          setErrorWithTimeout('Not enough stock to add more of this item');
          toast({
            title: "Insufficient Stock",
            description: `Only ${existingItem.quantity} items available`,
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

    // Validate stock for new quantity
    const hasStock = await validateStock(
      item.productId,
      item.colorVariantId,
      item.sizeVariantId,
      quantity
    );

    if (!hasStock) {
      setErrorWithTimeout('Not enough stock for this quantity');
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
