
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ComboCongratsModal } from '@/components/customer/ComboCongratsModal';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  price: number;
  subcategoryId: string;
  image_url?: string;
  pricingDescription?: string;
  subtotal: number;
}

interface AddToCartParams {
  productId: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  quantity: number;
  price: number;
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

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (params: AddToCartParams) => Promise<void>;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => Promise<number>;
  getTotalItems: () => number;
  activeCombo: ComboData | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeCombo, setActiveCombo] = useState<ComboData | null>(null);
  const [subcategoriesData, setSubcategoriesData] = useState<{ [key: string]: SubcategoryData }>({});
  const [showComboModal, setShowComboModal] = useState(false);
  const [newCombo, setNewCombo] = useState<ComboData | null>(null);

  useEffect(() => {
    loadCartFromStorage();
    fetchSubcategoriesData();
  }, []);

  useEffect(() => {
    if (Object.keys(subcategoriesData).length > 0) {
      recalculateCart();
    }
  }, [cartItems.length, activeCombo, subcategoriesData]);

  const fetchSubcategoriesData = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
      } catch (error) {
        console.error('Error loading cart from storage:', error);
        setCartItems([]);
      }
    }
  };

  const saveCartToStorage = (items: CartItem[]) => {
    localStorage.setItem('cart', JSON.stringify(items));
  };

  const calculateSubcategoryTotals = (items: CartItem[]) => {
    const totals: { [key: string]: number } = {};
    items.forEach(item => {
      totals[item.subcategoryId] = (totals[item.subcategoryId] || 0) + item.quantity;
    });
    return totals;
  };

  const getDiscountTiers = async (subcategoryId: string) => {
    try {
      const { data } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', subcategoryId)
        .order('min_quantity', { ascending: true });
      return data || [];
    } catch (error) {
      console.error('Error fetching discount tiers:', error);
      return [];
    }
  };

  const calculateItemPricing = async (item: CartItem, subcategoryTotal: number) => {
    const subcategoryData = subcategoriesData[item.subcategoryId];
    if (!subcategoryData) {
      return {
        unitPrice: item.price,
        subtotal: item.price * item.quantity,
        description: 'Regular Price'
      };
    }

    // Check combo pricing first (highest priority)
    if (activeCombo) {
      const comboSubcat = activeCombo.combo_subcategories.find(cs => cs.subcategory_id === item.subcategoryId);
      if (comboSubcat) {
        return {
          unitPrice: comboSubcat.price,
          subtotal: comboSubcat.price * item.quantity,
          description: `Combo Price: Rs. ${comboSubcat.price.toFixed(2)}`
        };
      }
    }

    // Check discount tiers
    const discountTiers = await getDiscountTiers(item.subcategoryId);
    const basePrice = subcategoryData.selling_price;

    if (discountTiers.length === 0) {
      return {
        unitPrice: basePrice,
        subtotal: basePrice * item.quantity,
        description: `Regular Price: Rs. ${basePrice.toFixed(2)}`
      };
    }

    // Find applicable discount tier
    const applicableTier = discountTiers.find(tier => 
      subcategoryTotal >= tier.min_quantity && 
      (!tier.max_quantity || subcategoryTotal <= tier.max_quantity)
    );

    if (applicableTier && subcategoryTotal >= applicableTier.min_quantity) {
      const discountedPrice = basePrice - applicableTier.discount_amount;
      const moq = applicableTier.min_quantity;
      
      if (subcategoryTotal === moq) {
        return {
          unitPrice: discountedPrice,
          subtotal: discountedPrice * item.quantity,
          description: `First ${moq} items: Rs. ${discountedPrice.toFixed(2)}`
        };
      } else {
        // Mixed pricing - some at regular, some at discount
        const totalRegularItems = Math.min(moq, subcategoryTotal);
        const totalDiscountItems = subcategoryTotal - totalRegularItems;
        
        return {
          unitPrice: discountedPrice, // Show discounted price as primary
          subtotal: discountedPrice * item.quantity, // Simplified for now
          description: `First ${totalRegularItems} items: Rs. ${basePrice.toFixed(2)}, Next ${totalDiscountItems} items: Rs. ${discountedPrice.toFixed(2)}`
        };
      }
    }

    return {
      unitPrice: basePrice,
      subtotal: basePrice * item.quantity,
      description: `Regular Price: Rs. ${basePrice.toFixed(2)}`
    };
  };

  const recalculateCart = async () => {
    if (cartItems.length === 0) return;

    try {
      // Check combo eligibility first
      await checkComboEligibility();
      
      // Calculate subcategory totals
      const subcategoryTotals = calculateSubcategoryTotals(cartItems);
      
      // Update each item's pricing
      const updatedItems = await Promise.all(
        cartItems.map(async (item) => {
          const subcategoryTotal = subcategoryTotals[item.subcategoryId];
          const pricing = await calculateItemPricing(item, subcategoryTotal);
          
          return {
            ...item,
            subtotal: pricing.subtotal,
            pricingDescription: pricing.description
          };
        })
      );

      setCartItems(updatedItems);
      saveCartToStorage(updatedItems);
    } catch (error) {
      console.error('Error recalculating cart:', error);
    }
  };

  const checkComboEligibility = async () => {
    try {
      const { data: combos } = await supabase
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

      if (!combos) return;

      const subcategoryCounts = calculateSubcategoryTotals(cartItems);
      let newActiveCombo: ComboData | null = null;

      for (const combo of combos) {
        let isEligible = true;
        
        for (const comboSubcat of combo.combo_subcategories) {
          const availableUnits = subcategoryCounts[comboSubcat.subcategory_id] || 0;
          if (availableUnits < comboSubcat.min_units) {
            isEligible = false;
            break;
          }
        }

        if (isEligible) {
          if (!activeCombo || activeCombo.id !== combo.id) {
            setNewCombo(combo);
            setShowComboModal(true);
          }
          newActiveCombo = combo;
          break;
        }
      }

      setActiveCombo(newActiveCombo);
    } catch (error) {
      console.error('Error checking combo eligibility:', error);
    }
  };

  const addToCart = async (params: AddToCartParams) => {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('name, image_url, subcategory_id')
        .eq('id', params.productId)
        .single();

      if (!product) throw new Error('Product not found');

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

      const itemId = `${params.productId}-${params.colorVariantId || 'no-color'}-${params.sizeVariantId || 'no-size'}`;
      const existingItemIndex = cartItems.findIndex(item => item.id === itemId);
      
      let updatedItems: CartItem[];
      
      if (existingItemIndex >= 0) {
        updatedItems = [...cartItems];
        updatedItems[existingItemIndex].quantity += params.quantity;
      } else {
        const newItem: CartItem = {
          id: itemId,
          productId: params.productId,
          productName: product.name,
          colorVariantId: params.colorVariantId,
          sizeVariantId: params.sizeVariantId,
          colorName,
          sizeName,
          quantity: params.quantity,
          price: params.price,
          subcategoryId: product.subcategory_id,
          image_url: product.image_url,
          pricingDescription: '',
          subtotal: params.price * params.quantity
        };
        updatedItems = [...cartItems, newItem];
      }

      setCartItems(updatedItems);
      saveCartToStorage(updatedItems);
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const removeFromCart = (itemId: string) => {
    const updatedItems = cartItems.filter(item => item.id !== itemId);
    setCartItems(updatedItems);
    saveCartToStorage(updatedItems);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const updatedItems = cartItems.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    );
    setCartItems(updatedItems);
    saveCartToStorage(updatedItems);
  };

  const clearCart = () => {
    setCartItems([]);
    setActiveCombo(null);
    localStorage.removeItem('cart');
  };

  const getTotalPrice = async () => {
    try {
      let total = 0;
      for (const item of cartItems) {
        total += item.subtotal || 0;
      }
      return total;
    } catch (error) {
      console.error('Error calculating total price:', error);
      return 0;
    }
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
    activeCombo
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {newCombo && (
        <ComboCongratsModal
          isOpen={showComboModal}
          onClose={() => {
            setShowComboModal(false);
            setNewCombo(null);
          }}
          combo={newCombo}
          subcategoriesData={subcategoriesData}
        />
      )}
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
