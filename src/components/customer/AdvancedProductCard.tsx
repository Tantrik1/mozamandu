
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ShoppingCart, Minus, Plus, Heart, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useCartPricing } from '@/hooks/useCartPricing';
import { useComboManager } from '@/hooks/useComboManager';
import { supabase } from '@/integrations/supabase/client';
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

interface AdvancedProductCardProps {
  product: Product;
}

export function AdvancedProductCard({ product }: AdvancedProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [stock, setStock] = useState<number>(100); // Default stock
  const [loading, setLoading] = useState(false);
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
      productInventoryId: product.has_color_variants ? 
        (selectedVariant?.has_sizes ? `${product.id}-${selectedColor}-${selectedSize}` : `${product.id}-${selectedColor}`) 
        : null,
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

        {/* Price Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-red-500">
                Rs. {pricing.finalPrice.toFixed(0)}
              </span>
              {pricing.mode !== 'normal' && (
                <span className="text-sm text-gray-500 line-through">
                  Rs. {basePrice.toFixed(0)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pricing.mode !== 'normal' && (
                <Badge variant={pricing.mode === 'combo' ? 'default' : 'secondary'} className="text-xs">
                  {pricing.mode === 'combo' ? 'Combo' : 'Bulk'}
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
                    <div className="flex justify-between">
                      <span className="font-medium">Mode:</span>
                      <span className="capitalize">{pricing.mode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Price per item:</span>
                      <span>Rs. {pricing.finalPrice.toFixed(0)}</span>
                    </div>
                    {pricing.mode !== 'normal' && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium">Original price:</span>
                          <span>Rs. {basePrice.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span className="font-medium">You save:</span>
                          <span>Rs. {(basePrice - pricing.finalPrice).toFixed(0)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Color Selection */}
        {product.has_color_variants && product.color_variants && product.color_variants.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="w-full">
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
            <label className="text-sm font-medium text-gray-700">Size</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="w-full">
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

        {/* Quantity Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Quantity</label>
          <div className="flex items-center justify-between">
            <div className="flex items-center border rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="px-4 py-1 text-sm font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= stock}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <span className="text-xs text-gray-500">{stock} available</span>
          </div>
        </div>

        {/* Minimum Quantity Warning */}
        {showMinimumWarning() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              Minimum {product.subcategories?.minimum_quantity} items required for this category
            </p>
          </div>
        )}

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={stock === 0 || loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>

        {/* Total Price Preview */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total for {quantity} item(s):</span>
            <span className="font-semibold text-lg text-red-500">
              Rs. {(pricing.finalPrice * quantity).toFixed(0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
