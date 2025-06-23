import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

      // Check if combo is active
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
            toast({
              title: "🎉 Combo Applied!",
              description: `${combo.name}: ${combo.description}`,
              duration: 5000,
            });
          }
          newActiveCombo = combo;
          break;
        }
      }

      // Check if combo was removed
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
    getItemPrice,
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
