
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ShoppingCart, Info } from 'lucide-react';
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

interface EnhancedProductCardProps {
  product: Product;
}

export function EnhancedProductCard({ product }: EnhancedProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [stock, setStock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showPricingDetails, setShowPricingDetails] = useState(false);
  const [discountTiers, setDiscountTiers] = useState<any[]>([]);
  const [stockError, setStockError] = useState<string>('');

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
      setStockError('');
      
      // Build query to get inventory based on selected variants
      let query = supabase
        .from('product_inventory')
        .select('available_stock, is_active')
        .eq('product_id', product.id)
        .eq('is_active', true);

      // Add color variant filter if product has color variants
      if (product.has_color_variants && selectedColor) {
        query = query.eq('color_variant_id', selectedColor);
      } else if (product.has_color_variants) {
        // If product has color variants but none selected, set stock to 0
        setStock(0);
        return;
      } else {
        // If product doesn't have color variants, ensure we get records without color variants
        query = query.is('color_variant_id', null);
      }

      // Add size variant filter if selected variant has sizes
      if (selectedVariant?.has_sizes && selectedSize) {
        query = query.eq('size_variant_id', selectedSize);
      } else if (selectedVariant?.has_sizes) {
        // If variant has sizes but none selected, set stock to 0
        setStock(0);
        return;
      } else {
        // If variant doesn't have sizes, ensure we get records without size variants
        query = query.is('size_variant_id', null);
      }

      const { data: inventoryData, error } = await query;

      if (error) {
        console.error('Error fetching inventory:', error);
        setStockError('Failed to load stock information');
        setStock(0);
        return;
      }

      // Sum up available stock from all matching inventory records
      const totalStock = inventoryData?.reduce((sum, item) => sum + (item.available_stock || 0), 0) || 0;
      setStock(totalStock);
      
      console.log('Stock fetched for product:', {
        productId: product.id,
        productName: product.name,
        colorVariantId: selectedColor,
        sizeVariantId: selectedSize,
        totalStock,
        inventoryRecords: inventoryData?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stock:', error);
      setStockError('Error loading stock');
      setStock(0);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPricing = () => {
    const currentQuantityInCart = subcategoryQuantities[product.subcategory_id] || 0;
    const totalQuantityWithNew = currentQuantityInCart + quantity;

    // Create a mock cart item to get accurate pricing
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
  const currentImage = selectedVariant?.image_url || product.image_url || 'https://via.placeholder.com/350x200';

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
      productInventoryId: null, // Will be resolved by cart system
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

  const getComboEligibilityStatus = () => {
    if (!activeCombo) return null;
    
    const comboSubcategory = activeCombo.combo_subcategories.find(
      cs => cs.subcategory_id === product.subcategory_id
    );
    
    if (!comboSubcategory) {
      return { eligible: false, reason: 'Not part of active combo' };
    }
    
    const currentQuantityInCart = subcategoryQuantities[product.subcategory_id] || 0;
    const totalQuantityWithNew = currentQuantityInCart + quantity;
    
    if (totalQuantityWithNew < comboSubcategory.min_units) {
      return { 
        eligible: false, 
        reason: `Need ${comboSubcategory.min_units - totalQuantityWithNew} more items for combo pricing`,
        needed: comboSubcategory.min_units - totalQuantityWithNew
      };
    }
    
    return { eligible: true, reason: 'Combo pricing active' };
  };

  const isMinimumQuantityMet = () => {
    const currentQuantityInCart = subcategoryQuantities[product.subcategory_id] || 0;
    const totalQuantityWithNew = currentQuantityInCart + quantity;
    const minimumRequired = product.subcategories?.minimum_quantity || 1;
    
    return totalQuantityWithNew >= minimumRequired;
  };

  const showMinimumWarning = () => {
    const currentQuantityInCart = subcategoryQuantities[product.subcategory_id] || 0;
    const totalQuantityWithNew = currentQuantityInCart + quantity;
    const minimumRequired = product.subcategories?.minimum_quantity || 1;
    
    return !activeCombo && totalQuantityWithNew < minimumRequired;
  };

  const comboStatus = getComboEligibilityStatus();

  return (
    <Card className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <img
          src={currentImage}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">
            <Star className="h-4 w-4 mr-1" />
            Featured
          </Badge>
        )}
        {pricing.mode !== 'normal' && (
          <Badge className="absolute top-2 right-2" variant={pricing.mode === 'combo' ? 'default' : 'secondary'}>
            {pricing.mode === 'combo' ? 'Combo Price' : 'Bulk Discount'}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
        </div>

        {/* Color Selection */}
        {product.has_color_variants && product.color_variants && (
          <div>
            <label className="text-sm font-medium mb-2 block">Color:</label>
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
          <div>
            <label className="text-sm font-medium mb-2 block">Size:</label>
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
        <div>
          <label className="text-sm font-medium mb-2 block">Quantity:</label>
          <Select value={quantity.toString()} onValueChange={(value) => setQuantity(parseInt(value))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: Math.min(stock, 10) }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Enhanced Pricing Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">
                Rs. {pricing.finalPrice.toFixed(2)}
              </span>
              {pricing.mode !== 'normal' && (
                <span className="text-sm text-gray-500 line-through">
                  Rs. {basePrice.toFixed(2)}
                </span>
              )}
            </div>
            <Dialog open={showPricingDetails} onOpenChange={setShowPricingDetails}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Pricing Details
                    {pricing.mode !== 'normal' && (
                      <Badge variant={pricing.mode === 'combo' ? 'default' : 'secondary'}>
                        {pricing.mode === 'combo' ? 'COMBO' : 'DISCOUNT'}
                      </Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">{pricing.description}</p>
                  </div>
                  
                  {/* Combo Status */}
                  {activeCombo && comboStatus && (
                    <div className={`p-3 rounded-lg ${comboStatus.eligible ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                      <h4 className="text-sm font-medium text-gray-700">Combo Status:</h4>
                      <p className={`text-sm ${comboStatus.eligible ? 'text-green-700' : 'text-orange-700'}`}>
                        {comboStatus.reason}
                      </p>
                      {!comboStatus.eligible && comboStatus.needed && (
                        <p className="text-xs text-orange-600 mt-1">
                          Add {comboStatus.needed} more items to get combo price of Rs. {activeCombo.combo_subcategories.find(cs => cs.subcategory_id === product.subcategory_id)?.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {pricing.breakdown && pricing.breakdown.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Breakdown:</h4>
                      <div className="space-y-1">
                        {pricing.breakdown.map((line, index) => (
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

          {showMinimumWarning() && (
            <p className="text-xs text-orange-600">
              Minimum {product.subcategories?.minimum_quantity} required for this subcategory
            </p>
          )}
        </div>

        {/* Enhanced Stock Status */}
        <div className="flex items-center justify-between">
          {loading ? (
            <span className="text-gray-500 text-sm">Loading stock...</span>
          ) : stockError ? (
            <div className="flex flex-col">
              <Badge variant="destructive">Stock Error</Badge>
              <span className="text-xs text-red-600 mt-1">{stockError}</span>
            </div>
          ) : (
            <Badge variant={stock > 0 ? 'default' : 'destructive'}>
              {stock > 0 ? `${stock} In Stock` : 'Out of Stock'}
            </Badge>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button 
          className="w-full" 
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
