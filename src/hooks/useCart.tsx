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
  getSubcategoryTotalQuantity: (subcategoryId: string) => number;
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

  // Get total quantity for a specific subcategory across all products
  const getSubcategoryTotalQuantity = (subcategoryId: string): number => {
    return cartItems
      .filter(item => item.subcategoryId === subcategoryId)
      .reduce((total, item) => total + item.quantity, 0);
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

    // Check for discount tiers based on TOTAL subcategory quantity (not individual product quantity)
    const totalSubcategoryQuantity = getSubcategoryTotalQuantity(subcategoryId);
    const { data: discountTiers } = await supabase
      .from('discount_tiers')
      .select('*')
      .eq('subcategory_id', subcategoryId)
      .order('min_quantity', { ascending: true });

    if (discountTiers) {
      for (const tier of discountTiers) {
        if (totalSubcategoryQuantity >= tier.min_quantity && (!tier.max_quantity || totalSubcategoryQuantity <= tier.max_quantity)) {
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

  // Fixed rebalanceCartItems function to group by subcategory first and apply discounts correctly
  const rebalanceCartItems = async (updatedItems: CartItem[]) => {
    const subcategoryGroups: { [key: string]: CartItem[] } = {};
    
    // Group items by subcategory first
    updatedItems.forEach(item => {
      if (!subcategoryGroups[item.subcategoryId]) {
        subcategoryGroups[item.subcategoryId] = [];
      }
      subcategoryGroups[item.subcategoryId].push(item);
    });

    let rebalancedItems: CartItem[] = [];

    for (const subcategoryId of Object.keys(subcategoryGroups)) {
      const items = subcategoryGroups[subcategoryId];
      
      // Calculate total quantity for this subcategory
      const totalSubcategoryQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      
      // Skip if quantity is 0 or negative
      if (totalSubcategoryQuantity <= 0) continue;

      // Check if combo is active for this subcategory (highest priority)
      if (activeCombo) {
        const comboSubcategory = activeCombo.combo_subcategories.find(cs => cs.subcategory_id === subcategoryId);
        if (comboSubcategory) {
          // Apply combo pricing to all items in this subcategory
          const comboPrice = comboSubcategory.price;
          
          // Group by product+color+size within this subcategory
          const productGroups: { [key: string]: CartItem[] } = {};
          items.forEach(item => {
            const key = `${item.productId}-${item.colorVariantId || 'no-color'}-${item.sizeVariantId || 'no-size'}`;
            if (!productGroups[key]) {
              productGroups[key] = [];
            }
            productGroups[key].push(item);
          });

          // Create combo items for each product group
          for (const productKey of Object.keys(productGroups)) {
            const productItems = productGroups[productKey];
            const totalQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0);
            const sampleItem = productItems[0];

            if (totalQuantity > 0) {
              const comboItemId = `${sampleItem.productId}-${sampleItem.colorVariantId || 'no-color'}-${sampleItem.sizeVariantId || 'no-size'}-combo`;
              rebalancedItems.push({
                ...sampleItem,
                id: comboItemId,
                quantity: totalQuantity,
                price: comboPrice
              });
            }
          }
          continue;
        }
      }

      // Get discount tiers for this subcategory
      const { data: discountTiers } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', subcategoryId)
        .order('min_quantity', { ascending: true });

      if (!discountTiers || discountTiers.length === 0) {
        // No discount tiers, keep all items at normal price
        const productGroups: { [key: string]: CartItem[] } = {};
        items.forEach(item => {
          const key = `${item.productId}-${item.colorVariantId || 'no-color'}-${item.sizeVariantId || 'no-size'}`;
          if (!productGroups[key]) {
            productGroups[key] = [];
          }
          productGroups[key].push(item);
        });

        for (const productKey of Object.keys(productGroups)) {
          const productItems = productGroups[productKey];
          const totalQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0);
          const sampleItem = productItems[0];

          if (totalQuantity > 0) {
            const normalItemId = `${sampleItem.productId}-${sampleItem.colorVariantId || 'no-color'}-${sampleItem.sizeVariantId || 'no-size'}-normal`;
            rebalancedItems.push({
              ...sampleItem,
              id: normalItemId,
              quantity: totalQuantity,
              price: subcategoriesData[subcategoryId].selling_price
            });
          }
        }
        continue;
      }

      // Find applicable discount tier based on TOTAL subcategory quantity
      const applicableTier = discountTiers.find(tier => 
        totalSubcategoryQuantity >= tier.min_quantity && 
        (!tier.max_quantity || totalSubcategoryQuantity <= tier.max_quantity)
      );

      const basePrice = subcategoriesData[subcategoryId].selling_price;

      // Group by product+color+size within this subcategory
      const productGroups: { [key: string]: CartItem[] } = {};
      items.forEach(item => {
        const key = `${item.productId}-${item.colorVariantId || 'no-color'}-${item.sizeVariantId || 'no-size'}`;
        if (!productGroups[key]) {
          productGroups[key] = [];
        }
        productGroups[key].push(item);
      });

      if (applicableTier) {
        const discountedPrice = basePrice - applicableTier.discount_amount;
        const moq = applicableTier.min_quantity;
        
        // Apply discount to ALL products in this subcategory since total quantity meets MOQ
        for (const productKey of Object.keys(productGroups)) {
          const productItems = productGroups[productKey];
          const totalQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0);
          const sampleItem = productItems[0];

          if (totalQuantity > 0) {
            // All items in this subcategory get discount pricing since subcategory MOQ is met
            const discountItemId = `${sampleItem.productId}-${sampleItem.colorVariantId || 'no-color'}-${sampleItem.sizeVariantId || 'no-size'}-discount`;
            rebalancedItems.push({
              ...sampleItem,
              id: discountItemId,
              quantity: totalQuantity,
              price: discountedPrice
            });
          }
        }
      } else {
        // Subcategory MOQ not met, all items at normal price
        for (const productKey of Object.keys(productGroups)) {
          const productItems = productGroups[productKey];
          const totalQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0);
          const sampleItem = productItems[0];

          if (totalQuantity > 0) {
            const normalItemId = `${sampleItem.productId}-${sampleItem.colorVariantId || 'no-color'}-${sampleItem.sizeVariantId || 'no-size'}-normal`;
            rebalancedItems.push({
              ...sampleItem,
              id: normalItemId,
              quantity: totalQuantity,
              price: basePrice
            });
          }
        }
      }
    }

    return rebalancedItems;
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

      // Create a temporary item to calculate what the new total would be
      const tempItem: CartItem = {
        id: 'temp',
        productId: params.productId,
        productName: product.name,
        colorVariantId: params.colorVariantId,
        sizeVariantId: params.sizeVariantId,
        colorName,
        sizeName,
        quantity: params.quantity,
        price: params.price,
        subcategoryId: product.subcategory_id,
        image_url: product.image_url
      };

      // Add the temp item to existing cart to calculate pricing
      const tempCartItems = [...cartItems, tempItem];
      const rebalanced = await rebalanceCartItems(tempCartItems);
      
      // Set the rebalanced items (this will trigger combo check and pricing updates)
      setCartItems(rebalanced);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const removeFromCart = async (itemId: string) => {
    const updatedItems = cartItems.filter(item => item.id !== itemId);
    const rebalanced = await rebalanceCartItems(updatedItems);
    setCartItems(rebalanced);
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const updatedItems = cartItems.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    );
    
    const rebalanced = await rebalanceCartItems(updatedItems);
    setCartItems(rebalanced);
  };

  const clearCart = () => {
    setCartItems([]);
    setActiveCombo(null);
  };

  const getTotalPrice = async () => {
    let total = 0;
    for (const item of cartItems) {
      total += item.price * item.quantity;
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
            
            // Trigger rebalancing to apply combo pricing
            const rebalanced = await rebalanceCartItems(cartItems);
            setCartItems(rebalanced);
          }
          newActiveCombo = combo;
          break;
        }
      }

      // If no combo is eligible but we had one active, rebalance to remove combo pricing
      if (!newActiveCombo && activeCombo) {
        const rebalanced = await rebalanceCartItems(cartItems);
        setCartItems(rebalanced);
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
    activeCombo,
    getSubcategoryTotalQuantity
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
