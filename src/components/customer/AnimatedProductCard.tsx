import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { Star, ShoppingCart, Plus, Minus, TrendingUp, Zap } from 'lucide-react';
import { getProductStockSummary, getExactVariantData } from '@/utils/stockCalculation';

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

interface AnimatedProductCardProps {
  product: Product;
  subcategorySellingPrice: number;
  discountTiers?: DiscountTier[];
}

export function AnimatedProductCard({ product, subcategorySellingPrice, discountTiers = [] }: AnimatedProductCardProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [productStock, setProductStock] = useState<number>(0);
  const [currentVariantData, setCurrentVariantData] = useState<{
    id: string;
    sku: string;
    stock: number;
    availableStock: number;
    isOutOfStock: boolean;
    isLowStock: boolean;
  } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  
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

  // Fetch exact variant data when color or size changes
  useEffect(() => {
    fetchCurrentVariantData();
  }, [selectedColor, selectedSize, product.id]);

  const fetchCurrentVariantData = async () => {
    try {
      const variantData = await getExactVariantData(
        product.id,
        selectedColor || undefined,
        selectedSize || undefined
      );
      setCurrentVariantData(variantData);
      
      // Update the product stock to reflect the exact variant stock
      if (variantData) {
        setProductStock(variantData.availableStock);
      } else {
        // Fallback to total product stock if no specific variant found
        const totalStock = await getProductStockSummary(product.id);
        setProductStock(totalStock);
      }
    } catch (error) {
      console.error('Error fetching current variant data:', error);
      setCurrentVariantData(null);
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

  const getCurrentPricing = (basePrice: number, qty: number) => {
    if (discountTiers.length === 0) {
      return {
        currentPrice: basePrice,
        isDiscounted: false,
        discountActive: false,
        moqNeeded: 0,
        discountedPrice: basePrice,
        savings: 0
      };
    }
    
    const sortedTiers = [...discountTiers].sort((a, b) => a.min_quantity - b.min_quantity);
    const firstTier = sortedTiers[0];
    
    if (!firstTier) {
      return {
        currentPrice: basePrice,
        isDiscounted: false,
        discountActive: false,
        moqNeeded: 0,
        discountedPrice: basePrice,
        savings: 0
      };
    }
    
    const discountedPrice = Math.max(0, basePrice - firstTier.discount_amount);
    const isDiscounted = qty >= firstTier.min_quantity;
    
    return {
      currentPrice: isDiscounted ? discountedPrice : basePrice,
      isDiscounted,
      discountActive: isDiscounted,
      moqNeeded: Math.max(0, firstTier.min_quantity - qty),
      discountedPrice,
      savings: isDiscounted ? firstTier.discount_amount * qty : 0,
      tierInfo: firstTier
    };
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

  const displayPrice = product.selling_price || subcategorySellingPrice;
  const pricingInfo = getCurrentPricing(displayPrice, quantity);
  const selectedColorVariant = colorVariants.find(cv => cv.id === selectedColor);
  const currentImage = selectedColorVariant?.image_url || product.image_url;
  const hasDiscount = product.cost_price < displayPrice;
  const hasVolumeDiscount = pricingInfo.isDiscounted;

  return (
    <Card 
      className="group h-full flex flex-col overflow-hidden bg-gradient-to-br from-white to-gray-50/30 shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100/50 rounded-2xl transform hover:-translate-y-2 hover:scale-[1.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image with Enhanced Effects */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 aspect-square">
        {currentImage ? (
          <img
            src={currentImage}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-700 ${
              isHovered ? 'scale-110 rotate-2' : 'scale-100 rotate-0'
            }`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <span className="text-gray-400 text-sm font-medium">No Image</span>
          </div>
        )}
        
        {/* Animated Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent transition-opacity duration-500 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`} />
        
        {/* Enhanced Badges with Animations */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.is_featured && (
            <Badge className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transform transition-all duration-300 ${
              isHovered ? 'scale-110 rotate-2' : 'scale-100'
            }`}>
              <Star className="w-3 h-3 fill-current animate-pulse" />
              Featured
            </Badge>
          )}
          {hasDiscount && (
            <Badge className={`bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-full transform transition-all duration-300 ${
              isHovered ? 'scale-110 -rotate-2' : 'scale-100'
            }`}>
              <Zap className="w-3 h-3 mr-1" />
              Sale
            </Badge>
          )}
          {hasVolumeDiscount && (
            <Badge className={`bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-3 py-1.5 rounded-full transform transition-all duration-300 ${
              isHovered ? 'scale-110 rotate-1' : 'scale-100'
            }`}>
              <TrendingUp className="w-3 h-3 mr-1" />
              Volume
            </Badge>
          )}
        </div>

        {/* Enhanced Stock Status */}
        <div className="absolute top-3 right-3">
          {productStock === 0 ? (
            <Badge variant="secondary" className="bg-red-100/90 backdrop-blur-sm text-red-700 text-xs border border-red-200/50">
              Out of Stock
            </Badge>
          ) : productStock <= 5 ? (
            <Badge variant="secondary" className="bg-orange-100/90 backdrop-blur-sm text-orange-700 text-xs border border-orange-200/50">
              Low Stock ({productStock})
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-100/90 backdrop-blur-sm text-green-700 text-xs border border-green-200/50">
              In Stock ({productStock})
            </Badge>
          )}
        </div>

        {/* Floating Action Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
          isHovered && productStock > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <Button
            onClick={handleAddToCart}
            disabled={loading}
            className="bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white border border-gray-200/50 shadow-lg transform scale-110 animate-pulse"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>
      
      <CardContent className="p-5 flex-1 flex flex-col space-y-4 bg-gradient-to-b from-white to-gray-50/50">
        {/* Product Name with Animation */}
        <h3 className={`font-semibold text-gray-900 text-sm leading-tight transition-all duration-300 ${
          isHovered ? 'text-blue-600' : ''
        }`}>
          {product.name}
        </h3>
        
        {/* Description */}
        {product.description && (
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Current Variant Info */}
        {currentVariantData && (
          <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-medium">SKU: {currentVariantData.sku}</span>
              <span className={`font-semibold ${
                currentVariantData.isOutOfStock ? 'text-red-600' : 
                currentVariantData.isLowStock ? 'text-orange-600' : 'text-green-600'
              }`}>
                {currentVariantData.isOutOfStock ? 'Out of Stock' : 
                 currentVariantData.isLowStock ? `Low Stock (${currentVariantData.availableStock})` : 
                 `In Stock (${currentVariantData.availableStock})`}
              </span>
            </div>
          </div>
        )}

        {/* Color Selection with Enhanced UI */}
        {product.has_color_variants && colorVariants.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Color</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="h-9 text-xs border-gray-200 focus:border-blue-400 transition-colors">
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

        {/* Size Selection with Enhanced UI */}
        {product.color_has_size_variants && sizeVariants.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Size</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-9 text-xs border-gray-200 focus:border-blue-400 transition-colors">
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

        {/* Enhanced Quantity Controls */}
        {productStock > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Quantity</label>
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-semibold text-sm w-8 text-center bg-white px-2 py-1 rounded border">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= productStock}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Pricing Display */}
        <div className="mt-auto space-y-3">
          <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            {/* Current Price Display */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-900">
                    Rs. {pricingInfo.currentPrice.toFixed(2)}
                  </span>
                  {hasVolumeDiscount && (
                    <span className="text-sm text-gray-500 line-through">
                      Rs. {displayPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                {quantity > 1 && (
                  <span className="text-xs text-gray-600 font-medium">
                    Total: Rs. {(pricingInfo.currentPrice * quantity).toFixed(2)}
                  </span>
                )}
              </div>
              {pricingInfo.savings > 0 && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-2 py-1">
                  Save Rs. {pricingInfo.savings.toFixed(2)}
                </Badge>
              )}
            </div>

            {/* Volume Discount Info */}
            {discountTiers.length > 0 && (
              <div className={`text-xs p-3 rounded-lg border transition-all duration-300 ${
                pricingInfo.discountActive 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                {pricingInfo.discountActive ? (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <div>
                      <span className="font-semibold">Volume discount active!</span>
                      <br />
                      MOQ {pricingInfo.tierInfo?.min_quantity}+ = Rs. {pricingInfo.discountedPrice.toFixed(2)} each
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-semibold">Volume pricing available!</span>
                      <br />
                      {pricingInfo.moqNeeded > 0 ? (
                        <>Add {pricingInfo.moqNeeded} more for Rs. {pricingInfo.discountedPrice.toFixed(2)} each</>
                      ) : (
                        <>MOQ {pricingInfo.tierInfo?.min_quantity}+ = Rs. {pricingInfo.discountedPrice.toFixed(2)} each</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={loading || productStock === 0}
            className={`w-full h-11 text-sm font-semibold transition-all duration-300 transform ${
              productStock === 0 
                ? 'bg-gray-300 text-gray-500' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:scale-105 hover:shadow-lg'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding...
              </div>
            ) : productStock === 0 ? (
              'Out of Stock'
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Add {quantity > 1 ? `${quantity} ` : ''}to Cart
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}