
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

interface PriceCalculation {
  basePrice: number;
  discountedPrice?: number;
  comboPrice?: number;
  finalPrice: number;
  appliedDiscount?: DiscountTier;
  inCombo?: boolean;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (params: AddToCartParams) => Promise<void>;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => Promise<number>;
  getTotalItems: () => number;
  getItemPrice: (subcategoryId: string, quantity: number) => Promise<PriceCalculation>;
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
    saveCartToStorage();
    checkComboEligibility();
    recalculateCartPricing();
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

  const getItemPrice = async (subcategoryId: string, quantity: number): Promise<PriceCalculation> => {
    const subcategoryData = subcategoriesData[subcategoryId];
    if (!subcategoryData) {
      return { basePrice: 0, finalPrice: 0 };
    }

    const basePrice = subcategoryData.selling_price;
    let result: PriceCalculation = { basePrice, finalPrice: basePrice };

    // Check for combo pricing first (highest priority)
    if (activeCombo) {
      const comboSubcategory = activeCombo.combo_subcategories.find(cs => cs.subcategory_id === subcategoryId);
      if (comboSubcategory) {
        result.comboPrice = comboSubcategory.price;
        result.finalPrice = comboSubcategory.price;
        result.inCombo = true;
        return result;
      }
    }

    // Check for discount tiers (only if not in combo)
    const { data: discountTiers } = await supabase
      .from('discount_tiers')
      .select('*')
      .eq('subcategory_id', subcategoryId)
      .order('min_quantity', { ascending: true });

    if (discountTiers) {
      for (const tier of discountTiers) {
        if (quantity >= tier.min_quantity && (!tier.max_quantity || quantity <= tier.max_quantity)) {
          const discountedPrice = basePrice - tier.discount_amount;
          result.discountedPrice = discountedPrice;
          result.appliedDiscount = tier;
          result.finalPrice = discountedPrice;
          break;
        }
      }
    }

    return result;
  };

  const calculatePricingDescription = async (item: CartItem, subcategoryTotal: number) => {
    const subcategoryData = subcategoriesData[item.subcategoryId];
    if (!subcategoryData) return '';

    // Check if combo is active for this subcategory
    if (activeCombo) {
      const comboSubcategory = activeCombo.combo_subcategories.find(cs => cs.subcategory_id === item.subcategoryId);
      if (comboSubcategory) {
        return `Combo Price: Rs. ${comboSubcategory.price.toFixed(2)}`;
      }
    }

    // Get discount tiers for this subcategory
    const { data: discountTiers } = await supabase
      .from('discount_tiers')
      .select('*')
      .eq('subcategory_id', item.subcategoryId)
      .order('min_quantity', { ascending: true });

    if (!discountTiers || discountTiers.length === 0) {
      return `Regular Price: Rs. ${subcategoryData.selling_price.toFixed(2)}`;
    }

    // Find applicable tier based on subcategory total
    const applicableTier = discountTiers.find(tier => 
      subcategoryTotal >= tier.min_quantity && 
      (!tier.max_quantity || subcategoryTotal <= tier.max_quantity)
    );

    if (applicableTier) {
      const discountedPrice = subcategoryData.selling_price - applicableTier.discount_amount;
      const moq = applicableTier.min_quantity;
      
      if (subcategoryTotal === moq) {
        return `First ${moq} items: Rs. ${discountedPrice.toFixed(2)}`;
      } else {
        const regularCount = moq;
        const discountCount = subcategoryTotal - moq;
        return `First ${regularCount} items: Rs. ${subcategoryData.selling_price.toFixed(2)}, Next ${discountCount} items: Rs. ${discountedPrice.toFixed(2)}`;
      }
    }

    return `Regular Price: Rs. ${subcategoryData.selling_price.toFixed(2)}`;
  };

  const calculateItemSubtotal = async (item: CartItem, subcategoryTotal: number) => {
    const subcategoryData = subcategoriesData[item.subcategoryId];
    if (!subcategoryData) return 0;

    // Check if combo is active for this subcategory
    if (activeCombo) {
      const comboSubcategory = activeCombo.combo_subcategories.find(cs => cs.subcategory_id === item.subcategoryId);
      if (comboSubcategory) {
        return comboSubcategory.price * item.quantity;
      }
    }

    // Get discount tiers for this subcategory
    const { data: discountTiers } = await supabase
      .from('discount_tiers')
      .select('*')
      .eq('subcategory_id', item.subcategoryId)
      .order('min_quantity', { ascending: true });

    if (!discountTiers || discountTiers.length === 0) {
      return subcategoryData.selling_price * item.quantity;
    }

    // Find applicable tier based on subcategory total
    const applicableTier = discountTiers.find(tier => 
      subcategoryTotal >= tier.min_quantity && 
      (!tier.max_quantity || subcategoryTotal <= tier.max_quantity)
    );

    if (applicableTier) {
      const basePrice = subcategoryData.selling_price;
      const discountedPrice = basePrice - applicableTier.discount_amount;
      const moq = applicableTier.min_quantity;
      
      if (subcategoryTotal === moq) {
        // All items at discount price
        return discountedPrice * item.quantity;
      } else {
        // Calculate mixed pricing for this specific item's portion
        const itemStartIndex = subcategoryTotal - item.quantity;
        const itemEndIndex = subcategoryTotal;
        
        let itemTotal = 0;
        for (let i = itemStartIndex; i < itemEndIndex; i++) {
          if (i < moq) {
            itemTotal += basePrice;
          } else {
            itemTotal += discountedPrice;
          }
        }
        return itemTotal;
      }
    }

    return subcategoryData.selling_price * item.quantity;
  };

  const recalculateCartPricing = async () => {
    if (cartItems.length === 0) return;

    // Calculate subcategory totals
    const subcategoryTotals: { [key: string]: number } = {};
    cartItems.forEach(item => {
      subcategoryTotals[item.subcategoryId] = (subcategoryTotals[item.subcategoryId] || 0) + item.quantity;
    });

    // Update each item's pricing description and subtotal
    const updatedItems = await Promise.all(
      cartItems.map(async (item) => {
        const subcategoryTotal = subcategoryTotals[item.subcategoryId];
        const pricingDescription = await calculatePricingDescription(item, subcategoryTotal);
        const subtotal = await calculateItemSubtotal(item, subcategoryTotal);
        
        return {
          ...item,
          pricingDescription,
          subtotal
        };
      })
    );

    setCartItems(updatedItems);
  };

  const addToCart = async (params: AddToCartParams) => {
    try {
      // Fetch product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, image_url, subcategory_id')
        .eq('id', params.productId)
        .single();

      if (productError) throw productError;

      let colorName = '';
      let sizeName = '';

      // Fetch color variant name if provided
      if (params.colorVariantId) {
        const { data: colorVariant } = await supabase
          .from('color_variants')
          .select('color_name')
          .eq('id', params.colorVariantId)
          .single();
        
        colorName = colorVariant?.color_name || '';
      }

      // Fetch size variant name if provided
      if (params.sizeVariantId) {
        const { data: sizeVariant } = await supabase
          .from('size_variants')
          .select('size_name')
          .eq('id', params.sizeVariantId)
          .single();
        
        sizeName = sizeVariant?.size_name || '';
      }

      // Create unique item ID based on product, color, and size
      const itemId = `${params.productId}-${params.colorVariantId || 'no-color'}-${params.sizeVariantId || 'no-size'}`;
      
      const existingItemIndex = cartItems.findIndex(item => item.id === itemId);
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const updatedItems = [...cartItems];
        updatedItems[existingItemIndex].quantity += params.quantity;
        setCartItems(updatedItems);
      } else {
        // Add new item
        const newItem: CartItem = {
          id: itemId,
          productId: params.productId,
          productName: product.name,
          colorVariantId: params.colorVariantId,
          sizeVariantId: params.sizeVariantId,
          colorName,
          sizeName,
          quantity: params.quantity,
          price: subcategoriesData[product.subcategory_id]?.selling_price || params.price,
          subcategoryId: product.subcategory_id,
          image_url: product.image_url,
          pricingDescription: '',
          subtotal: 0
        };
        setCartItems(prev => [...prev, newItem]);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(cartItems.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setCartItems([]);
    setActiveCombo(null);
  };

  const getTotalPrice = async () => {
    let total = 0;
    for (const item of cartItems) {
      total += item.subtotal || 0;
    }
    return total;
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const checkComboEligibility = async () => {
    try {
      // Get all active combos
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

      // Get subcategory counts from current cart
      const subcategoryCounts: { [key: string]: number } = {};
      
      for (const cartItem of cartItems) {
        const subcategoryId = cartItem.subcategoryId;
        subcategoryCounts[subcategoryId] = (subcategoryCounts[subcategoryId] || 0) + cartItem.quantity;
      }

      // Check each combo for eligibility
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

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getItemPrice,
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
