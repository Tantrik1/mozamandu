
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCartPricing } from './useCartPricing';

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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeCombo, setActiveCombo] = useState<ComboData | null>(null);
  const [subcategoriesData, setSubcategoriesData] = useState<{ [key: string]: SubcategoryData }>({});
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: DiscountTier[] }>({});

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
    checkComboEligibility();
  }, [cartItems]);

  const fetchSubcategoriesData = async () => {
    const { data, error } = await supabase
      .from('subcategories')
      .select('id, name, selling_price, minimum_quantity')
      .eq('status', 'on');

    if (!error && data) {
      const subcategoriesMap = data.reduce((acc, sub) => {
        acc[sub.id] = sub;
        return acc;
      }, {} as { [key: string]: SubcategoryData });
      setSubcategoriesData(subcategoriesMap);
    }
  };

  const fetchDiscountTiers = async () => {
    const { data, error } = await supabase
      .from('discount_tiers')
      .select('*')
      .order('subcategory_id')
      .order('min_quantity');

    if (!error && data) {
      const tiersMap = data.reduce((acc, tier) => {
        if (!acc[tier.subcategory_id]) {
          acc[tier.subcategory_id] = [];
        }
        acc[tier.subcategory_id].push(tier);
        return acc;
      }, {} as { [key: string]: DiscountTier[] });
      setDiscountTiers(tiersMap);
    }
  };

  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from storage:', error);
      }
    }
  };

  const saveCartToStorage = () => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  };

  const addToCart = async (params: AddToCartParams) => {
    try {
      // Fetch product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, image_url, subcategory_id, selling_price')
        .eq('id', params.productId)
        .single();

      if (productError) throw productError;

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
        const updatedItems = [...cartItems];
        updatedItems[existingItemIndex].quantity += params.quantity;
        setCartItems(updatedItems);
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
      }

      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setCartItems([]);
    setActiveCombo(null);
  };

  const getTotalPrice = (): number => {
    return calculateTotalPrice();
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const checkComboEligibility = async () => {
    try {
      const { data: combos, error: combosError } = await supabase
        .from('combos')
        .select(`
          id,
          name,
          description,
          combo_subcategories (
            subcategory_id,
            min_units,
            price
          )
        `)
        .eq('status', 'active');

      if (combosError) {
        console.error('Error fetching combos:', combosError);
        return;
      }

      const subcategoryCounts: { [key: string]: number } = {};
      
      for (const cartItem of cartItems) {
        const subcategoryId = cartItem.subcategoryId;
        subcategoryCounts[subcategoryId] = (subcategoryCounts[subcategoryId] || 0) + cartItem.quantity;
      }

      let newActiveCombo: ComboData | null = null;
      
      for (const combo of combos || []) {
        let isEligible = true;
        
        for (const comboSubcategory of combo.combo_subcategories) {
          const requiredUnits = comboSubcategory.min_units;
          const availableUnits = subcategoryCounts[comboSubcategory.subcategory_id] || 0;
          
          if (availableUnits < requiredUnits) {
            isEligible = false;
            break;
          }
        }

        if (isEligible) {
          if (!activeCombo || activeCombo.id !== combo.id) {
            toast({
              title: "🎉 Combo Applied!",
              description: `${combo.name}: ${combo.description}`,
              duration: 3000,
            });
          }
          newActiveCombo = combo;
          break;
        }
      }

      if (activeCombo && !newActiveCombo) {
        toast({
          title: "💰 Normal Prices Applied",
          description: "Combo requirements no longer met",
          duration: 3000,
        });
      }

      setActiveCombo(newActiveCombo);
    } catch (error) {
      console.error('Error checking combo eligibility:', error);
    }
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
    activeCombo
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
