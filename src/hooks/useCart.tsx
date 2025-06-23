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

  // Helper function to rebalance cart items after quantity changes
  const rebalanceCartItems = async (updatedItems: CartItem[]) => {
    const subcategoryGroups: { [key: string]: CartItem[] } = {};
    
    // Group items by subcategory
    updatedItems.forEach(item => {
      if (!subcategoryGroups[item.subcategoryId]) {
        subcategoryGroups[item.subcategoryId] = [];
      }
      subcategoryGroups[item.subcategoryId].push(item);
    });

    let rebalancedItems: CartItem[] = [];

    for (const subcategoryId of Object.keys(subcategoryGroups)) {
      const items = subcategoryGroups[subcategoryId];
      
      // Skip if combo is active for this subcategory
      if (activeCombo) {
        const comboSubcategory = activeCombo.combo_subcategories.find(cs => cs.subcategory_id === subcategoryId);
        if (comboSubcategory) {
          rebalancedItems.push(...items);
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
        rebalancedItems.push(...items);
        continue;
      }

      // Group items by product+color+size combination
      const productGroups: { [key: string]: CartItem[] } = {};
      items.forEach(item => {
        const key = `${item.productId}-${item.colorVariantId || 'no-color'}-${item.sizeVariantId || 'no-size'}`;
        if (!productGroups[key]) {
          productGroups[key] = [];
        }
        productGroups[key].push(item);
      });

      // Process each product group
      for (const productKey of Object.keys(productGroups)) {
        const productItems = productGroups[productKey];
        const totalQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0);

        // Find applicable discount tier
        const applicableTier = discountTiers.find(tier => 
          totalQuantity >= tier.min_quantity && 
          (!tier.max_quantity || totalQuantity <= tier.max_quantity)
        );

        const basePrice = subcategoriesData[subcategoryId].selling_price;
        const sampleItem = productItems[0];

        if (applicableTier) {
          // All quantity should be at discount price
          const discountedPrice = basePrice - applicableTier.discount_amount;
          const discountItemId = `${sampleItem.productId}-${sampleItem.colorVariantId || 'no-color'}-${sampleItem.sizeVariantId || 'no-size'}-discount`;
          
          rebalancedItems.push({
            ...sampleItem,
            id: discountItemId,
            quantity: totalQuantity,
            price: discountedPrice
          });
        } else {
          // All quantity should be at normal price
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

      // Get current total quantity for this subcategory
      const currentSubcategoryQuantity = cartItems
        .filter(item => item.subcategoryId === product.subcategory_id)
        .reduce((total, item) => total + item.quantity, 0);

      // Check if combo is active (highest priority)
      if (activeCombo) {
        const comboSubcategory = activeCombo.combo_subcategories.find(cs => cs.subcategory_id === product.subcategory_id);
        if (comboSubcategory) {
          // Add as combo item
          const comboItemId = `${params.productId}-${params.colorVariantId || 'no-color'}-${params.sizeVariantId || 'no-size'}-combo`;
          
          const existingItemIndex = cartItems.findIndex(item => item.id === comboItemId);
          
          if (existingItemIndex >= 0) {
            const updatedItems = [...cartItems];
            updatedItems[existingItemIndex].quantity += params.quantity;
            setCartItems(updatedItems);
          } else {
            const newItem: CartItem = {
              id: comboItemId,
              productId: params.productId,
              productName: product.name,
              colorVariantId: params.colorVariantId,
              sizeVariantId: params.sizeVariantId,
              colorName,
              sizeName,
              quantity: params.quantity,
              price: comboSubcategory.price,
              subcategoryId: product.subcategory_id,
              image_url: product.image_url
            };
            setCartItems(prev => [...prev, newItem]);
          }
          return;
        }
      }

      // Check for discount tiers
      const { data: discountTiers } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', product.subcategory_id)
        .order('min_quantity', { ascending: true });

      if (discountTiers && discountTiers.length > 0) {
        const applicableTier = discountTiers.find(tier => 
          currentSubcategoryQuantity >= tier.min_quantity && 
          (!tier.max_quantity || currentSubcategoryQuantity <= tier.max_quantity)
        );

        if (applicableTier) {
          // MOQ already met, add new items at discount price
          const discountedPrice = subcategoriesData[product.subcategory_id].selling_price - applicableTier.discount_amount;
          const discountItemId = `${params.productId}-${params.colorVariantId || 'no-color'}-${params.sizeVariantId || 'no-size'}-discount`;
          
          const existingDiscountIndex = cartItems.findIndex(item => item.id === discountItemId);
          
          if (existingDiscountIndex >= 0) {
            const updatedItems = [...cartItems];
            updatedItems[existingDiscountIndex].quantity += params.quantity;
            setCartItems(updatedItems);
          } else {
            const discountItem: CartItem = {
              id: discountItemId,
              productId: params.productId,
              productName: product.name,
              colorVariantId: params.colorVariantId,
              sizeVariantId: params.sizeVariantId,
              colorName,
              sizeName,
              quantity: params.quantity,
              price: discountedPrice,
              subcategoryId: product.subcategory_id,
              image_url: product.image_url
            };
            setCartItems(prev => [...prev, discountItem]);
          }
          return;
        }

        // Check if adding these items would cross MOQ threshold
        const newTotal = currentSubcategoryQuantity + params.quantity;
        const crossesTier = discountTiers.find(tier => 
          currentSubcategoryQuantity < tier.min_quantity && newTotal >= tier.min_quantity
        );

        if (crossesTier) {
          const basePrice = subcategoriesData[product.subcategory_id].selling_price;
          const discountedPrice = basePrice - crossesTier.discount_amount;
          
          // Items at normal price (up to MOQ)
          const normalPriceQuantity = crossesTier.min_quantity - currentSubcategoryQuantity;
          if (normalPriceQuantity > 0) {
            const normalItemId = `${params.productId}-${params.colorVariantId || 'no-color'}-${params.sizeVariantId || 'no-size'}-normal`;
            
            const existingNormalIndex = cartItems.findIndex(item => item.id === normalItemId);
            if (existingNormalIndex >= 0) {
              const updatedItems = [...cartItems];
              updatedItems[existingNormalIndex].quantity += normalPriceQuantity;
              setCartItems(updatedItems);
            } else {
              const normalItem: CartItem = {
                id: normalItemId,
                productId: params.productId,
                productName: product.name,
                colorVariantId: params.colorVariantId,
                sizeVariantId: params.sizeVariantId,
                colorName,
                sizeName,
                quantity: normalPriceQuantity,
                price: basePrice,
                subcategoryId: product.subcategory_id,
                image_url: product.image_url
              };
              setCartItems(prev => [...prev, normalItem]);
            }
          }

          // Items at discounted price (above MOQ)
          const discountQuantity = params.quantity - normalPriceQuantity;
          if (discountQuantity > 0) {
            const discountItemId = `${params.productId}-${params.colorVariantId || 'no-color'}-${params.sizeVariantId || 'no-size'}-discount`;
            
            const existingDiscountIndex = cartItems.findIndex(item => item.id === discountItemId);
            if (existingDiscountIndex >= 0) {
              const updatedItems = [...cartItems];
              updatedItems[existingDiscountIndex].quantity += discountQuantity;
              setCartItems(updatedItems);
            } else {
              const discountItem: CartItem = {
                id: discountItemId,
                productId: params.productId,
                productName: product.name,
                colorVariantId: params.colorVariantId,
                sizeVariantId: params.sizeVariantId,
                colorName,
                sizeName,
                quantity: discountQuantity,
                price: discountedPrice,
                subcategoryId: product.subcategory_id,
                image_url: product.image_url
              };
              setCartItems(prev => [...prev, discountItem]);
            }
          }
          return;
        }
      }

      // Add as normal item
      const normalItemId = `${params.productId}-${params.colorVariantId || 'no-color'}-${params.sizeVariantId || 'no-size'}-normal`;
      
      const existingItemIndex = cartItems.findIndex(item => item.id === normalItemId);
      
      if (existingItemIndex >= 0) {
        const updatedItems = [...cartItems];
        updatedItems[existingItemIndex].quantity += params.quantity;
        setCartItems(updatedItems);
      } else {
        const newItem: CartItem = {
          id: normalItemId,
          productId: params.productId,
          productName: product.name,
          colorVariantId: params.colorVariantId,
          sizeVariantId: params.sizeVariantId,
          colorName,
          sizeName,
          quantity: params.quantity,
          price: subcategoriesData[product.subcategory_id].selling_price,
          subcategoryId: product.subcategory_id,
          image_url: product.image_url
        };
        setCartItems(prev => [...prev, newItem]);
      }
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
