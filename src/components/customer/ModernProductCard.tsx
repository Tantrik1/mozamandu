import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { Star, ShoppingCart, Plus, Minus } from 'lucide-react';
import { getProductStockSummary } from '@/utils/stockCalculation';

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

export function ModernProductCard({ product, subcategorySellingPrice }: ModernProductCardProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [productStock, setProductStock] = useState<number>(0);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  
  const { addToCart } = useRobustCart();

  useEffect(() => {
    if (product.has_color_variants) {
      fetchColorVariants();
    }
    fetchProductStock();
    fetchDiscountTiers();
  }, [product.id, product.has_color_variants]);

  useEffect(() => {
    if (selectedColor && product.color_has_size_variants) {
      fetchSizeVariants(selectedColor);
    }
  }, [selectedColor, product.color_has_size_variants]);

  const fetchDiscountTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', product.subcategory_id)
        .order('min_quantity');

      if (error) throw error;
      setDiscountTiers(data || []);
    } catch (error) {
      console.error('Error fetching discount tiers:', error);
      setDiscountTiers([]);
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

  const calculateDiscountedPrice = (basePrice: number, qty: number) => {
    if (discountTiers.length === 0) return { currentPrice: basePrice, savings: 0, hasDiscount: false };
    
    const applicableTier = discountTiers
      .filter(tier => qty >= tier.min_quantity)
      .sort((a, b) => b.min_quantity - a.min_quantity)[0];
    
    if (applicableTier) {
      const discountedPrice = Math.max(0, basePrice - applicableTier.discount_amount);
      return {
        currentPrice: discountedPrice,
        savings: (basePrice - discountedPrice) * qty,
        hasDiscount: true,
        tierInfo: `MOQ ${applicableTier.min_quantity}+ = Rs. ${discountedPrice} each`
      };
    }
    
    return { currentPrice: basePrice, savings: 0, hasDiscount: false };
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= productStock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (productStock === 0) return;
    
    setLoading(true);
    try {
      const success = await addToCart({
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        colorVariantId: selectedColor || undefined,
        sizeVariantId: selectedSize || undefined,
        unitPrice: product.selling_price || subcategorySellingPrice,
      });
      
      if (success) {
        setQuantity(1);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const basePrice = product.selling_price || subcategorySellingPrice;
  const pricingInfo = calculateDiscountedPrice(basePrice, quantity);
  const selectedColorVariant = colorVariants.find(cv => cv.id === selectedColor);
  const currentImage = selectedColorVariant?.image_url || product.image_url;

  return (
    <Card className="group h-full flex flex-col overflow-hidden bg-card shadow-sm hover:shadow-md transition-all duration-300 border-border rounded-lg">
      {/* Product Image */}
      <div className="relative overflow-hidden bg-muted/50 aspect-square">
        {currentImage ? (
          <img
            src={currentImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No Image</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_featured && (
            <Badge variant="default" className="text-xs px-2 py-0.5 bg-primary text-primary-foreground">
              <Star className="w-3 h-3 fill-current mr-1" />
              Featured
            </Badge>
          )}
          {pricingInfo.hasDiscount && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-green-100 text-green-700">
              Volume
            </Badge>
          )}
        </div>

        {/* Stock Status */}
        <div className="absolute top-2 right-2">
          {productStock === 0 ? (
            <Badge variant="destructive" className="text-xs">
              Out of Stock
            </Badge>
          ) : productStock <= 5 ? (
            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
              Low Stock
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
              In Stock
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-3 flex-1 flex flex-col">
        {/* Product Name */}
        <h3 className="font-semibold text-foreground text-sm mb-2 line-clamp-2 leading-tight">
          {product.name}
        </h3>
        
        {/* Description */}
        {product.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Color Selection */}
        {product.has_color_variants && colorVariants.length > 0 && (
          <div className="mb-2">
            <label className="text-xs font-medium text-foreground mb-1 block">Color</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {colorVariants.map((color) => (
                  <SelectItem key={color.id} value={color.id} className="text-xs">
                    {color.color_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Size Selection */}
        {product.color_has_size_variants && sizeVariants.length > 0 && (
          <div className="mb-2">
            <label className="text-xs font-medium text-foreground mb-1 block">Size</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {sizeVariants.map((size) => (
                  <SelectItem key={size.id} value={size.id} className="text-xs">
                    {size.size_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quantity Controls */}
        {productStock > 0 && (
          <div className="mb-3">
            <label className="text-xs font-medium text-foreground mb-1 block">Quantity</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-medium text-sm w-6 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= productStock}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="mt-auto">
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    Rs. {pricingInfo.currentPrice.toFixed(0)}
                  </span>
                  {pricingInfo.hasDiscount && (
                    <span className="text-sm text-muted-foreground line-through">
                      Rs. {basePrice.toFixed(0)}
                    </span>
                  )}
                </div>
                {quantity > 1 && (
                  <span className="text-xs text-muted-foreground">
                    Total: Rs. {(pricingInfo.currentPrice * quantity).toFixed(0)}
                  </span>
                )}
              </div>
              {pricingInfo.savings > 0 && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                  Save Rs. {pricingInfo.savings.toFixed(0)}
                </Badge>
              )}
            </div>

            {/* Volume Discount Info */}
            {pricingInfo.hasDiscount && pricingInfo.tierInfo && (
              <div className="text-xs p-2 bg-blue-50 rounded border border-blue-200">
                <div className="text-blue-700">
                  <span className="font-medium">✓ Volume discount active!</span>
                  <br />
                  <span className="text-blue-600">{pricingInfo.tierInfo}</span>
                </div>
              </div>
            )}
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={loading || productStock === 0}
            className="w-full h-8 text-xs font-medium transition-colors duration-200"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                Adding...
              </div>
            ) : productStock === 0 ? (
              'Out of Stock'
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-3 h-3" />
                Add to Cart
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}