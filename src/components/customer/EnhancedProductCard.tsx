
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
}

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface EnhancedProductCardProps {
  product: Product;
  subcategorySellingPrice: number;
  discountTiers?: DiscountTier[];
}

export function EnhancedProductCard({ product, subcategorySellingPrice, discountTiers = [] }: EnhancedProductCardProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [productStock, setProductStock] = useState<number>(0);
  
  const { addToCart } = useRobustCart();

  useEffect(() => {
    if (product.has_color_variants) {
      fetchColorVariants();
    }
    fetchProductStock();
  }, [product.id, product.has_color_variants]);

  useEffect(() => {
    if (selectedColor && product.color_has_size_variants) {
      fetchSizeVariants(selectedColor);
    }
  }, [selectedColor, product.color_has_size_variants]);

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
    if (discountTiers.length === 0) return basePrice;
    
    const applicableTier = discountTiers
      .filter(tier => qty >= tier.min_quantity)
      .sort((a, b) => b.min_quantity - a.min_quantity)[0];
    
    return applicableTier ? Math.max(0, basePrice - applicableTier.discount_amount) : basePrice;
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
        setQuantity(1); // Reset quantity after successful add
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayPrice = product.selling_price || subcategorySellingPrice;
  const discountedPrice = calculateDiscountedPrice(displayPrice, quantity);
  const selectedColorVariant = colorVariants.find(cv => cv.id === selectedColor);
  const currentImage = selectedColorVariant?.image_url || product.image_url;
  const hasDiscount = product.cost_price < displayPrice;
  const hasVolumeDiscount = discountedPrice < displayPrice;

  return (
    <Card className="group h-full flex flex-col overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 rounded-xl">
      {/* Product Image */}
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
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
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">No Image</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.is_featured && (
            <Badge className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              Featured
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Sale
            </Badge>
          )}
          {hasVolumeDiscount && (
            <Badge className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              Volume
            </Badge>
          )}
        </div>

        {/* Stock Status */}
        <div className="absolute top-3 right-3">
          {productStock === 0 ? (
            <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
              Out of Stock
            </Badge>
          ) : productStock <= 5 ? (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
              Low Stock ({productStock})
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              In Stock ({productStock})
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 leading-tight">
          {product.name}
        </h3>
        
        {/* Description */}
        {product.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Color Selection */}
        {product.has_color_variants && colorVariants.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Color</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="h-8 text-xs">
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
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Size</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-8 text-xs">
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
            <label className="text-xs font-medium text-gray-700 mb-1 block">Quantity</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-medium text-sm w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">
                  Rs {discountedPrice}
                </span>
                {hasVolumeDiscount && (
                  <span className="text-sm text-gray-500 line-through">
                    Rs {displayPrice}
                  </span>
                )}
              </div>
              {quantity > 1 && (
                <span className="text-xs text-gray-500">
                  Total: Rs {(discountedPrice * quantity).toFixed(2)}
                </span>
              )}
            </div>
            {(hasVolumeDiscount || hasDiscount) && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                {hasVolumeDiscount ? `Save Rs ${((displayPrice - discountedPrice) * quantity).toFixed(2)}` : `Save Rs ${displayPrice - product.cost_price}`}
              </Badge>
            )}
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={loading || productStock === 0}
            className="w-full h-9 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors duration-200"
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
                Add {quantity > 1 ? `${quantity} ` : ''}to Cart
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
