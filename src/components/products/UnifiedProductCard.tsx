
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ShoppingCart, Minus, Plus, Heart, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useCartPricing } from '@/hooks/useCartPricing';
import { useComboManager } from '@/hooks/useComboManager';
import { toast } from '@/hooks/use-toast';

interface ProductVariant {
  id: string;
  color_name: string;
  image_url?: string;
  has_sizes: boolean;
  size_variants: {
    id: string;
    size_name: string;
    size_code?: string;
  }[];
}

interface Product {
  id: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price?: number;
  image_url?: string;
  status: string;
  subcategory_id: string;
  is_featured?: boolean;
  has_color_variants?: boolean;
  color_has_size_variants?: boolean;
  subcategories: {
    name: string;
    selling_price: number;
    minimum_quantity: number;
  };
  color_variants?: ProductVariant[];
}

interface UnifiedProductCardProps {
  product: Product;
  variant?: 'default' | 'advanced' | 'enhanced';
}

export function UnifiedProductCard({ product, variant = 'default' }: UnifiedProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [stock, setStock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showPricingDetails, setShowPricingDetails] = useState(false);
  const [discountTiers, setDiscountTiers] = useState<any[]>([]);

  const { cartItems, addToCart } = useRobustCart();
  const { activeCombo } = useComboManager({ cartItems });
  const { getItemPricing, subcategoryQuantities } = useCartPricing({
    cartItems,
    activeCombo,
    discountTiers: { [product.subcategory_id]: discountTiers }
  });

  const basePrice = product.subcategories?.selling_price || product.selling_price || product.cost_price;
  const selectedVariant = product.color_variants?.find(v => v.id === selectedColor);
  const availableSizes = selectedVariant?.size_variants || [];

  useEffect(() => {
    fetchDiscountTiers();
    if (product.has_color_variants && product.color_variants?.length) {
      setSelectedColor(product.color_variants[0].id);
    }
  }, [product.id]);

  useEffect(() => {
    if (selectedVariant?.has_sizes && availableSizes.length > 0) {
      setSelectedSize(availableSizes[0].id);
    }
  }, [selectedColor]);

  useEffect(() => {
    fetchStock();
  }, [selectedColor, selectedSize, product.id]);

  const fetchDiscountTiers = async () => {
    try {
      const { data } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', product.subcategory_id)
        .order('min_quantity');
      
      setDiscountTiers(data || []);
    } catch (error) {
      console.error('Error fetching discount tiers:', error);
    }
  };

  const fetchStock = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('product_inventory')
        .select('available_stock, is_active')
        .eq('product_id', product.id)
        .eq('is_active', true);

      if (product.has_color_variants && selectedColor) {
        query = query.eq('color_variant_id', selectedColor);
      } else if (product.has_color_variants) {
        setStock(0);
        return;
      } else {
        query = query.is('color_variant_id', null);
      }

      if (selectedVariant?.has_sizes && selectedSize) {
        query = query.eq('size_variant_id', selectedSize);
      } else if (selectedVariant?.has_sizes) {
        setStock(0);
        return;
      } else {
        query = query.is('size_variant_id', null);
      }

      const { data: inventoryData, error } = await query;

      if (error) {
        console.error('Error fetching inventory:', error);
        setStock(0);
        return;
      }

      const totalStock = inventoryData?.reduce((sum, item) => sum + (item.available_stock || 0), 0) || 0;
      setStock(totalStock);
    } catch (error) {
      console.error('Error fetching stock:', error);
      setStock(0);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPricing = () => {
    const currentQuantityInCart = subcategoryQuantities[product.subcategory_id] || 0;
    const totalQuantityWithNew = currentQuantityInCart + quantity;

    const mockCartItem = {
      id: 'mock',
      productId: product.id,
      productName: product.name,
      productInventoryId: null,
      colorName: selectedVariant?.color_name,
      sizeName: availableSizes.find(s => s.id === selectedSize)?.size_name,
      quantity: totalQuantityWithNew,
      basePrice,
      subcategoryId: product.subcategory_id,
      image_url: product.image_url
    };

    return getItemPricing(mockCartItem);
  };

  const pricing = getCurrentPricing();
  const currentImage = selectedVariant?.image_url || product.image_url || 'https://via.placeholder.com/400x400';

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= stock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (product.has_color_variants && !selectedColor) {
      toast({
        title: "Please select a color",
        variant: "destructive"
      });
      return;
    }

    if (selectedVariant?.has_sizes && !selectedSize) {
      toast({
        title: "Please select a size",
        variant: "destructive"
      });
      return;
    }

    if (quantity > stock) {
      toast({
        title: "Insufficient stock",
        description: `Only ${stock} items available`,
        variant: "destructive"
      });
      return;
    }

    const cartItem = {
      productId: product.id,
      productName: product.name,
      productInventoryId: null,
      colorName: selectedVariant?.color_name,
      sizeName: availableSizes.find(s => s.id === selectedSize)?.size_name,
      quantity,
      basePrice,
      subcategoryId: product.subcategory_id,
      image_url: currentImage
    };

    addToCart(cartItem);
    
    toast({
      title: "Added to cart",
      description: `${quantity} × ${product.name} added to cart`
    });

    setQuantity(1);
  };

  const showMinimumWarning = () => {
    const currentQuantityInCart = subcategoryQuantities[product.subcategory_id] || 0;
    const totalQuantityWithNew = currentQuantityInCart + quantity;
    const minimumRequired = product.subcategories?.minimum_quantity || 1;
    
    return !activeCombo && totalQuantityWithNew < minimumRequired;
  };

  return (
    <Card className="group relative overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 rounded-2xl">
      {/* Heart Icon */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className={`rounded-full p-2 ${isLiked ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 bg-white/80 backdrop-blur-sm`}
          onClick={() => setIsLiked(!isLiked)}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Featured Badge */}
      {product.is_featured && (
        <Badge className="absolute top-4 left-4 bg-red-500 text-white z-10 rounded-full px-3 py-1">
          <Star className="h-3 w-3 mr-1" />
          Featured
        </Badge>
      )}

      {/* Product Image */}
      <div className="relative h-64 overflow-hidden bg-gray-50 rounded-t-2xl">
        <img
          src={currentImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Product Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
          )}
        </div>

        {/* Enhanced Price Display with Detailed Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-red-500">
                  Rs. {pricing.finalPrice.toFixed(2)}
                </span>
                {pricing.mode !== 'normal' && (
                  <span className="text-sm text-gray-500 line-through">
                    Rs. {basePrice.toFixed(2)}
                  </span>
                )}
              </div>
              {pricing.mode !== 'normal' && (
                <div className="text-xs text-green-600">
                  {pricing.mode === 'combo' ? 'Combo Discount' : 'MOQ Discount'}: 
                  Tiered: {quantity} × Rs. {pricing.finalPrice.toFixed(2)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pricing.mode !== 'normal' && (
                <Badge variant={pricing.mode === 'combo' ? 'default' : 'secondary'} className="text-xs">
                  {pricing.mode === 'combo' ? 'Combo' : 'MOQ Discount'}
                </Badge>
              )}
              <Dialog open={showPricingDetails} onOpenChange={setShowPricingDetails}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Pricing Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium">{pricing.description}</p>
                    </div>
                    
                    {/* Detailed MOQ/Combo Breakdown */}
                    {pricing.mode !== 'normal' && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          {pricing.mode === 'combo' ? 'Combo' : 'MOQ'} Discount breakdown:
                        </h4>
                        <div className="space-y-1 text-xs text-blue-700">
                          <div>• {quantity} × Rs. {pricing.finalPrice.toFixed(2)}</div>
                          {quantity > 1 && (
                            <div>• Total: Rs. {(pricing.finalPrice * quantity).toFixed(2)}</div>
                          )}
                          {pricing.finalPrice < basePrice && (
                            <div>• You save: Rs. {((basePrice - pricing.finalPrice) * quantity).toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {pricing.breakdown && pricing.breakdown.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Details:</h4>
                        <div className="space-y-1">
                          {pricing.breakdown.slice(0, 5).map((line, index) => (
                            <p key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Base Price:</span>
                        <span>Rs. {basePrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Final Price:</span>
                        <span className="text-green-600">Rs. {pricing.finalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total for {quantity}:</span>
                        <span className="font-bold">Rs. {(pricing.finalPrice * quantity).toFixed(2)}</span>
                      </div>
                      {pricing.finalPrice < basePrice && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>You Save:</span>
                          <span>Rs. {(basePrice - pricing.finalPrice).toFixed(2)} per item</span>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {showMinimumWarning() && (
            <p className="text-xs text-orange-600">
              Minimum {product.subcategories?.minimum_quantity} required for this subcategory
            </p>
          )}
        </div>

        {/* Color Selection */}
        {product.has_color_variants && product.color_variants && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Color:</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="h-10 rounded-lg border-gray-200">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {product.color_variants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.color_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Size Selection */}
        {selectedVariant?.has_sizes && availableSizes.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Size:</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-10 rounded-lg border-gray-200">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.map((size) => (
                  <SelectItem key={size.id} value={size.id}>
                    {size.size_name} {size.size_code && `(${size.size_code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              className="h-8 w-8 p-0 rounded-full border-gray-300"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="font-semibold text-lg min-w-[2rem] text-center">{quantity}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= stock}
              className="h-8 w-8 p-0 rounded-full border-gray-300"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <Badge variant={stock > 0 ? 'default' : 'destructive'}>
                {stock > 0 ? `${stock} in stock` : 'Out of Stock'}
              </Badge>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button 
          className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors duration-200" 
          disabled={loading || stock === 0 || (product.has_color_variants && !selectedColor) || (selectedVariant?.has_sizes && !selectedSize)}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart - Rs. {(pricing.finalPrice * quantity).toFixed(2)}
        </Button>
      </CardContent>
    </Card>
  );
}
