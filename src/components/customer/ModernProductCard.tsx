
import { useState, useEffect, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { Star, ShoppingCart, Plus, Minus, Target, ExternalLink } from 'lucide-react';
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

interface ModernProductCardProps {
  product: Product;
  subcategorySellingPrice: number;
}

export const ModernProductCard = memo(function ModernProductCard({ product, subcategorySellingPrice }: ModernProductCardProps) {
  const navigate = useNavigate();
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [productStock, setProductStock] = useState<number>(0);
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: DiscountTier[] }>({});
  const [realtimeSubcategoryPrice, setRealtimeSubcategoryPrice] = useState<number>(subcategorySellingPrice);
  
  const { addToCart, cartItems, updateQuantity, removeFromCart } = useRobustCart();

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation when clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, select, [role="combobox"]')) {
      return;
    }
    navigate(`/product/${product.id}`);
  };
  
  const getCartQuantity = () => {
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
    return cartItem?.quantity || 0;
  };
  
  const currentCartQuantity = getCartQuantity();
  
  const mockCartItem = {
    id: 'mock',
    productId: product.id,
    productName: product.name,
    quantity: Math.max(currentCartQuantity, 1),
    basePrice: product.selling_price || realtimeSubcategoryPrice,
    subcategoryId: product.subcategory_id,
    colorVariantId: selectedColor || null,
    sizeVariantId: selectedSize || null,
    addedOrder: 999,
  };
  
  const { getItemPricing } = useSubcategoryTieredPricing({
    cartItems: [mockCartItem],
    discountTiers
  });

  useEffect(() => {}, [cartItems, selectedColor, selectedSize]);

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
      const variantsWithStock = (data || []).map(variant => ({ ...variant, stock_quantity: 0 }));
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
      const sizeVariantsWithStock = (data || []).map(variant => ({ ...variant, stock_quantity: 0 }));
      setSizeVariants(sizeVariantsWithStock);
      if (sizeVariantsWithStock.length > 0) {
        setSelectedSize(sizeVariantsWithStock[0].id);
      }
    } catch (error) {
      console.error('Error fetching size variants:', error);
    }
  };

  const getMarginalPrice = () => {
    const totalSubcategoryQuantity = cartItems
      .filter(item => item.subcategoryId === product.subcategory_id)
      .reduce((total, item) => total + item.quantity, 0);
    
    const tiers = discountTiers[product.subcategory_id] || [];
    const sortedTiers = tiers.sort((a, b) => a.min_quantity - b.min_quantity);
    
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
  const savings = currentCartQuantity > 0 ? (basePrice - marginalUnitPrice) * currentCartQuantity : 0;
  const hasDiscount = savings > 0;
  
  const currentPricing = getItemPricing(mockCartItem.id);
  const hasVolumeDiscount = currentPricing?.appliedTier === 'discount';

  const handleQuantityIncrease = async () => {
    if (currentCartQuantity >= productStock) return;
    setLoading(true);
    try {
      if (currentCartQuantity === 0) {
        await addToCart({
          productId: product.id,
          productName: product.name,
          quantity: 1,
          colorVariantId: selectedColor || undefined,
          sizeVariantId: selectedSize || undefined,
          unitPrice: product.selling_price || realtimeSubcategoryPrice,
        });
      } else {
        const cartItem = cartItems.find(item => {
          const productMatch = item.productId === product.id;
          const colorMatch = item.colorVariantId === (selectedColor || null);
          const sizeMatch = item.sizeVariantId === (selectedSize || null);
          if (!product.has_color_variants) return productMatch && !item.colorVariantId && !item.sizeVariantId;
          if (product.has_color_variants && !product.color_has_size_variants) return productMatch && colorMatch && !item.sizeVariantId;
          if (product.has_color_variants && product.color_has_size_variants) return productMatch && colorMatch && sizeMatch;
          return productMatch;
        });
        if (cartItem) await updateQuantity(cartItem.id, currentCartQuantity + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityDecrease = async () => {
    if (currentCartQuantity <= 0) return;
    setLoading(true);
    try {
      const cartItem = cartItems.find(item => {
        const productMatch = item.productId === product.id;
        const colorMatch = item.colorVariantId === (selectedColor || null);
        const sizeMatch = item.sizeVariantId === (selectedSize || null);
        if (!product.has_color_variants) return productMatch && !item.colorVariantId && !item.sizeVariantId;
        if (product.has_color_variants && !product.color_has_size_variants) return productMatch && colorMatch && !item.sizeVariantId;
        if (product.has_color_variants && product.color_has_size_variants) return productMatch && colorMatch && sizeMatch;
        return productMatch;
      });
      if (cartItem) {
        if (currentCartQuantity === 1) await removeFromCart(cartItem.id);
        else await updateQuantity(cartItem.id, currentCartQuantity - 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedColorVariant = colorVariants.find(cv => cv.id === selectedColor);
  const currentImage = selectedColorVariant?.image_url || product.image_url;

  if (productStock === 0) return null;

  return (
    <Card 
      onClick={handleCardClick}
      className="group h-full flex flex-col overflow-hidden bg-gradient-to-br from-card via-card to-card/80 shadow-lg hover:shadow-xl transition-all duration-500 border border-border/50 hover:border-primary/20 rounded-xl backdrop-blur-sm cursor-pointer"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-muted/30 to-muted/60 rounded-t-xl aspect-square">
        {/* View Details Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
          <span className="bg-white/90 backdrop-blur-sm text-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <ExternalLink className="w-4 h-4" />
            View Details
          </span>
        </div>
        {currentImage ? (
          <OptimizedImage src={currentImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" width={300} height={192} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
            <span className="text-muted-foreground text-sm font-medium">No Image</span>
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.is_featured && (
            <Badge variant="default" className="text-xs px-3 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg animate-pulse">
              <Star className="w-3 h-3 fill-current mr-1" />Featured
            </Badge>
          )}
          {hasVolumeDiscount && (
            <Badge variant="secondary" className="text-xs px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
              <Target className="w-3 h-3 mr-1" />Volume
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3">
          {productStock <= 5 ? (
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300 shadow-lg">Low Stock ({productStock})</Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300 shadow-lg">In Stock ({productStock})</Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col bg-gradient-to-b from-card to-card/90">
        <h3 className="font-bold text-foreground text-sm mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300">{product.name}</h3>
        {product.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">{product.description}</p>}

        {product.has_color_variants && colorVariants.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-foreground mb-2 block">Color</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="h-8 text-xs border-2 border-border/60 hover:border-primary/50 focus:border-primary transition-colors duration-300 bg-gradient-to-r from-muted/30 to-muted/60">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-sm border-2">
                {colorVariants.map((color) => (<SelectItem key={color.id} value={color.id} className="text-xs hover:bg-primary/10 transition-colors duration-200">{color.color_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}

        {product.color_has_size_variants && sizeVariants.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-foreground mb-2 block">Size</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-8 text-xs border-2 border-border/60 hover:border-primary/50 focus:border-primary transition-colors duration-300 bg-gradient-to-r from-muted/30 to-muted/60">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-sm border-2">
                {sizeVariants.map((size) => (<SelectItem key={size.id} value={size.id} className="text-xs hover:bg-primary/10 transition-colors duration-200">{size.size_name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mt-auto space-y-3 pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Rs. {marginalUnitPrice.toFixed(0)}</span>
                {hasDiscount && <span className="text-xs text-muted-foreground line-through">Rs. {basePrice.toFixed(0)}</span>}
              </div>
              {hasDiscount && <p className="text-xs text-green-600 font-medium">Save Rs. {(basePrice - marginalUnitPrice).toFixed(0)}/unit</p>}
            </div>
          </div>

          {currentCartQuantity === 0 ? (
            <Button onClick={handleQuantityIncrease} disabled={loading || productStock === 0} className="w-full h-10 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300" size="sm">
              <ShoppingCart className="w-4 h-4 mr-2" />Add to Cart
            </Button>
          ) : (
            <div className="flex items-center justify-between bg-gradient-to-r from-muted/50 to-muted/80 rounded-xl p-2 shadow-inner">
              <Button variant="outline" size="sm" onClick={handleQuantityDecrease} disabled={loading} className="h-9 w-9 p-0 rounded-lg border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300">
                <Minus className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <span className="text-lg font-bold text-foreground">{currentCartQuantity}</span>
                <p className="text-xs text-muted-foreground">in cart</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleQuantityIncrease} disabled={loading || currentCartQuantity >= productStock} className="h-9 w-9 p-0 rounded-lg border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
