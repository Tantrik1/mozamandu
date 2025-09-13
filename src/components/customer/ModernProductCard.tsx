
import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { useComboManager } from '@/hooks/useComboManager';
import { Star, ShoppingCart, Plus, Minus, Zap, Target } from 'lucide-react';
import { getProductStockSummary } from '@/utils/stockCalculation';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface ColorVariant {
  id: string;
  color_name: string;
  stock_quantity: number;
  has_sizes: boolean;
  image_url?: string;
}

interface SizeVariant {
  id: string;
  size_name: string;
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number | null;
  image_url: string | null;
  is_featured: boolean;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  stock_quantity: number;
  subcategory_id: string;
}

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface SubcategoryInfo {
  selling_price: number;
}

interface ModernProductCardProps {
  product: Product;
  subcategorySellingPrice: number;
}

export const ModernProductCard = memo(function ModernProductCard({ product, subcategorySellingPrice }: ModernProductCardProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [productStock, setProductStock] = useState<number>(0);
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: DiscountTier[] }>({});
  const [realtimeSubcategoryPrice, setRealtimeSubcategoryPrice] = useState<number>(subcategorySellingPrice);
  
  const { addToCart, cartItems, updateQuantity, removeFromCart } = useRobustCart();
  
  // Get current cart quantity for this product variant
  const getCartQuantity = () => {
    const cartItem = cartItems.find(item => {
      const productMatch = item.productId === product.id;
      const colorMatch = item.colorVariantId === (selectedColor || null);
      const sizeMatch = item.sizeVariantId === (selectedSize || null);
      
      // For products without variants, just match product ID
      if (!product.has_color_variants) {
        return productMatch && !item.colorVariantId && !item.sizeVariantId;
      }
      
      // For products with color variants but no size variants
      if (product.has_color_variants && !product.color_has_size_variants) {
        return productMatch && colorMatch && !item.sizeVariantId;
      }
      
      // For products with both color and size variants
      if (product.has_color_variants && product.color_has_size_variants) {
        return productMatch && colorMatch && sizeMatch;
      }
      
      return productMatch;
    });
    
    return cartItem?.quantity || 0;
  };
  
  const currentCartQuantity = getCartQuantity();
  
  // Create mock cart item for pricing calculation using current cart quantity
  const mockCartItem = {
    id: 'mock',
    productId: product.id,
    productName: product.name,
    quantity: Math.max(currentCartQuantity, 1), // Use actual cart quantity, minimum 1 for price preview
    basePrice: product.selling_price || realtimeSubcategoryPrice,
    subcategoryId: product.subcategory_id,
    colorVariantId: selectedColor || null,
    sizeVariantId: selectedSize || null,
    colorName: selectedColor ? colorVariants.find(c => c.id === selectedColor)?.color_name : undefined,
    sizeName: selectedSize ? sizeVariants.find(s => s.id === selectedSize)?.size_name : undefined,
    addedOrder: 999,
    image_url: product.image_url,
    sku: `${product.name.slice(0, 3).toUpperCase()}-PREVIEW`,
    inventoryId: `preview-${product.id}`
  };
  
  // Use combo manager to check for active combos
  const { activeCombo, isComboActive } = useComboManager({ cartItems });
  
  // Use tiered pricing for real-time price calculation - recalculate when cart changes
  const { getItemPricing } = useSubcategoryTieredPricing({
    cartItems: [mockCartItem], // Use mock item to get current pricing
    activeCombo,
    discountTiers
  });

  // Recalculate cart quantity when cart items change or selections change
  useEffect(() => {
    // This will trigger a re-render when cartItems change
  }, [cartItems, selectedColor, selectedSize]);

  useEffect(() => {
    if (product.has_color_variants) {
      fetchColorVariants();
    }
    fetchProductStock();
    fetchDiscountTiers();
    fetchRealtimeSubcategoryPrice();
  }, [product.id, product.has_color_variants, product.subcategory_id]);

  useEffect(() => {
    if (selectedColor && product.color_has_size_variants) {
      fetchSizeVariants(selectedColor);
    }
  }, [selectedColor, product.color_has_size_variants]);

  const fetchRealtimeSubcategoryPrice = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('selling_price')
        .eq('id', product.subcategory_id)
        .single();

      if (error) throw error;
      if (data) {
        setRealtimeSubcategoryPrice(data.selling_price);
      }
    } catch (error) {
      console.error('Error fetching realtime subcategory price:', error);
      setRealtimeSubcategoryPrice(subcategorySellingPrice);
    }
  };

  const fetchDiscountTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', product.subcategory_id)
        .order('min_quantity');

      if (error) throw error;
      setDiscountTiers({ [product.subcategory_id]: data || [] });
    } catch (error) {
      console.error('Error fetching discount tiers:', error);
      setDiscountTiers({});
    }
  };

  const fetchProductStock = async () => {
    try {
      const stock = await getProductStockSummary(product.id);
      setProductStock(stock);
    } catch (error) {
      console.error('Error fetching product stock:', error);
      setProductStock(0);
    }
  };

  const fetchColorVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('color_variants')
        .select('id, color_name, has_sizes, image_url')
        .eq('product_id', product.id);

      if (error) throw error;

      const variantsWithStock = (data || []).map(variant => ({
        ...variant,
        stock_quantity: 0,
      }));

      setColorVariants(variantsWithStock);
      if (variantsWithStock.length > 0) {
        setSelectedColor(variantsWithStock[0].id);
      }
    } catch (error) {
      console.error('Error fetching color variants:', error);
    }
  };

  const fetchSizeVariants = async (colorVariantId: string) => {
    try {
      const { data, error } = await supabase
        .from('size_variants')
        .select('id, size_name')
        .eq('color_variant_id', colorVariantId);

      if (error) throw error;

      const sizeVariantsWithStock = (data || []).map(variant => ({
        ...variant,
        stock_quantity: 0,
      }));

      setSizeVariants(sizeVariantsWithStock);
      if (sizeVariantsWithStock.length > 0) {
        setSelectedSize(sizeVariantsWithStock[0].id);
      }
    } catch (error) {
      console.error('Error fetching size variants:', error);
    }
  };

  // Get marginal price based on total subcategory quantity in cart
  const getMarginalPrice = () => {
    // Calculate total quantity for this subcategory across all products in cart
    const totalSubcategoryQuantity = cartItems
      .filter(item => item.subcategoryId === product.subcategory_id)
      .reduce((total, item) => total + item.quantity, 0);
    
    // Find the discount tier that applies to the total subcategory quantity
    const tiers = discountTiers[product.subcategory_id] || [];
    const sortedTiers = tiers.sort((a, b) => a.min_quantity - b.min_quantity);
    
    // Check if combo is active
    const comboSubcategory = activeCombo?.combo_subcategories.find(
      cs => cs.subcategory_id === product.subcategory_id
    );
    
    if (comboSubcategory && isComboActive(product.subcategory_id)) {
      return comboSubcategory.price;
    }
    
    // Only apply discount if quantity exceeds MOQ (MOQ + 1)
    let applicableTier = null;
    for (const tier of sortedTiers) {
      if (totalSubcategoryQuantity > tier.min_quantity && 
          (tier.max_quantity === null || totalSubcategoryQuantity <= tier.max_quantity)) {
        applicableTier = tier;
      }
    }
    
    if (applicableTier) {
      return basePrice - applicableTier.discount_amount;
    }
    
    return basePrice;
  };

  const basePrice = product.selling_price || realtimeSubcategoryPrice;
  const marginalUnitPrice = getMarginalPrice();
  const marginalTotalPrice = marginalUnitPrice * currentCartQuantity;

  // Calculate savings for display
  const savings = currentCartQuantity > 0 ? (basePrice - marginalUnitPrice) * currentCartQuantity : 0;
  const hasDiscount = savings > 0;
  
  // Get real-time pricing using the advanced pricing hooks for tier detection
  const currentPricing = getItemPricing(mockCartItem.id);
  const isComboModeActive = isComboActive(product.subcategory_id);
  const hasVolumeDiscount = currentPricing?.appliedTier === 'discount';
  const hasComboPrice = currentPricing?.appliedTier === 'combo';

  const handleQuantityIncrease = async () => {
    if (currentCartQuantity >= productStock) return;
    setLoading(true);
    try {
      if (currentCartQuantity === 0) {
        // Add new item to cart
        await addToCart({
          productId: product.id,
          productName: product.name,
          quantity: 1,
          colorVariantId: selectedColor || undefined,
          sizeVariantId: selectedSize || undefined,
          unitPrice: product.selling_price || realtimeSubcategoryPrice,
        });
      } else {
        // Find the exact cart item and update its quantity
        const cartItem = cartItems.find(item => {
          const productMatch = item.productId === product.id;
          const colorMatch = item.colorVariantId === (selectedColor || null);
          const sizeMatch = item.sizeVariantId === (selectedSize || null);
          
          if (!product.has_color_variants) {
            return productMatch && !item.colorVariantId && !item.sizeVariantId;
          }
          if (product.has_color_variants && !product.color_has_size_variants) {
            return productMatch && colorMatch && !item.sizeVariantId;
          }
          if (product.has_color_variants && product.color_has_size_variants) {
            return productMatch && colorMatch && sizeMatch;
          }
          return productMatch;
        });
        
        if (cartItem) {
          await updateQuantity(cartItem.id, currentCartQuantity + 1);
        }
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityDecrease = async () => {
    if (currentCartQuantity <= 0) return;
    
    setLoading(true);
    try {
      // Find the exact cart item
      const cartItem = cartItems.find(item => {
        const productMatch = item.productId === product.id;
        const colorMatch = item.colorVariantId === (selectedColor || null);
        const sizeMatch = item.sizeVariantId === (selectedSize || null);
        
        if (!product.has_color_variants) {
          return productMatch && !item.colorVariantId && !item.sizeVariantId;
        }
        if (product.has_color_variants && !product.color_has_size_variants) {
          return productMatch && colorMatch && !item.sizeVariantId;
        }
        if (product.has_color_variants && product.color_has_size_variants) {
          return productMatch && colorMatch && sizeMatch;
        }
        return productMatch;
      });
      
      if (cartItem) {
        if (currentCartQuantity === 1) {
          await removeFromCart(cartItem.id);
        } else {
          await updateQuantity(cartItem.id, currentCartQuantity - 1);
        }
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedColorVariant = colorVariants.find(cv => cv.id === selectedColor);
  const currentImage = selectedColorVariant?.image_url || product.image_url;

  // Don't render if product is out of stock
  if (productStock === 0) {
    return null;
  }

  return (
    <Card className="group h-full flex flex-col overflow-hidden bg-gradient-to-br from-card via-card to-card/80 shadow-lg hover:shadow-xl transition-all duration-500 border border-border/50 hover:border-primary/20 rounded-xl backdrop-blur-sm">
      {/* Product Image - Enhanced 16:9 Aspect Ratio */}
      <div className="relative overflow-hidden bg-gradient-to-br from-muted/30 to-muted/60 rounded-t-xl h-48" style={{ aspectRatio: '16/9' }}>
        {currentImage ? (
          <OptimizedImage
            src={currentImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 filter group-hover:brightness-110"
            loading="lazy"
            width={300}
            height={192}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
            <span className="text-muted-foreground text-sm font-medium">No Image</span>
          </div>
        )}
        
        {/* Enhanced Badges with animations */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.is_featured && (
            <Badge variant="default" className="text-xs px-3 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg animate-pulse">
              <Star className="w-3 h-3 fill-current mr-1" />
              Featured
            </Badge>
          )}
          {hasComboPrice && (
            <Badge variant="secondary" className="text-xs px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
              <Zap className="w-3 h-3 mr-1" />
              Combo
            </Badge>
          )}
          {hasVolumeDiscount && (
            <Badge variant="secondary" className="text-xs px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
              <Target className="w-3 h-3 mr-1" />
              Volume
            </Badge>
          )}
        </div>

        {/* Enhanced Stock Status */}
        <div className="absolute top-3 right-3">
          {productStock === 0 ? (
            <Badge variant="destructive" className="text-xs shadow-lg animate-bounce">
              Out of Stock
            </Badge>
          ) : productStock <= 5 ? (
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300 shadow-lg">
              Low Stock ({productStock})
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300 shadow-lg">
              In Stock ({productStock})
            </Badge>
          )}
        </div>

        {/* Futuristic overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col bg-gradient-to-b from-card to-card/90">
        {/* Enhanced Product Name */}
        <h3 className="font-bold text-foreground text-sm mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300">
          {product.name}
        </h3>
        
        {/* Enhanced Description */}
        {product.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Enhanced Color Selection */}
        {product.has_color_variants && colorVariants.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-foreground mb-2 block">Color</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="h-8 text-xs border-2 border-border/60 hover:border-primary/50 focus:border-primary transition-colors duration-300 bg-gradient-to-r from-muted/30 to-muted/60">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-sm border-2">
                {colorVariants.map((color) => (
                  <SelectItem key={color.id} value={color.id} className="text-xs hover:bg-primary/10 transition-colors duration-200">
                    {color.color_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Enhanced Size Selection */}
        {product.color_has_size_variants && sizeVariants.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-foreground mb-2 block">Size</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-8 text-xs border-2 border-border/60 hover:border-primary/50 focus:border-primary transition-colors duration-300 bg-gradient-to-r from-muted/30 to-muted/60">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-sm border-2">
                {sizeVariants.map((size) => (
                  <SelectItem key={size.id} value={size.id} className="text-xs hover:bg-primary/10 transition-colors duration-200">
                    {size.size_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Enhanced Real-time Quantity Controls */}
        {productStock > 0 && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-foreground mb-2 block">Quantity</label>
            <div className="flex items-center gap-3 bg-gradient-to-r from-muted/30 to-muted/60 rounded-lg p-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-2 border-border/60 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300"
                onClick={handleQuantityDecrease}
                disabled={currentCartQuantity <= 0 || loading}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-bold text-sm w-8 text-center bg-background rounded px-2 py-1">{currentCartQuantity}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-2 border-border/60 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300"
                onClick={handleQuantityIncrease}
                disabled={currentCartQuantity >= productStock || loading}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Real-time Pricing - Shows mode and price per item */}
        <div className="mt-auto">
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Rs. {marginalUnitPrice.toFixed(0)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">
                      Rs. {basePrice.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Product Actions - No add to cart button needed */}
          {productStock === 0 && (
            <div className="w-full h-10 flex items-center justify-center bg-gradient-to-r from-muted to-muted/80 rounded-lg">
              <span className="text-sm text-muted-foreground font-medium">Out of Stock</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
