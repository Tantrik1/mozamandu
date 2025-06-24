
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, ShoppingCart, Star, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';

interface Product {
  id: string;
  name: string;
  description: string;
  cost_price: number;
  selling_price: number;
  is_featured: boolean;
  image_url: string;
  has_color_variants: boolean;
  has_size_variants: boolean;
  stock_quantity: number;
  category_id: string;
  subcategory_id: string;
}

interface ColorVariant {
  id: string;
  color_name: string;
  stock_quantity: number;
  has_sizes: boolean;
  image_url: string;
}

interface SizeVariant {
  id: string;
  size_name: string;
  stock_quantity: number;
}

interface ProductCardProps {
  product: Product;
  subcategoryPrice: number;
}

export function ProductCard({ product, subcategoryPrice }: ProductCardProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(product.image_url);
  const { addToCart, cartItems, activeCombo } = useCart();

  // Get the base price for display
  const basePrice = product.selling_price || subcategoryPrice;

  useEffect(() => {
    if (product.has_color_variants) {
      fetchColorVariants();
    }
  }, [product.id, product.has_color_variants]);

  useEffect(() => {
    if (selectedColor && product.has_size_variants) {
      fetchSizeVariants();
    }
  }, [selectedColor, product.has_size_variants]);

  // Reset quantity when color changes or load existing cart quantity
  useEffect(() => {
    const existingItem = cartItems.find(item => 
      item.productId === product.id &&
      item.colorVariantId === selectedColor &&
      item.sizeVariantId === selectedSize
    );
    
    setQuantity(existingItem ? existingItem.quantity : 1);
  }, [selectedColor, selectedSize, cartItems]);

  // Update image when color changes
  useEffect(() => {
    if (selectedColor && colorVariants.length > 0) {
      const selectedColorVariant = colorVariants.find(c => c.id === selectedColor);
      if (selectedColorVariant && selectedColorVariant.image_url) {
        setCurrentImage(selectedColorVariant.image_url);
      } else {
        setCurrentImage(product.image_url);
      }
    } else {
      setCurrentImage(product.image_url);
    }
  }, [selectedColor, colorVariants, product.image_url]);

  const fetchColorVariants = async () => {
    const { data, error } = await supabase
      .from('color_variants')
      .select('id, color_name, stock_quantity, has_sizes, image_url')
      .eq('product_id', product.id);

    if (error) {
      console.error('Error fetching color variants:', error);
    } else {
      setColorVariants(data || []);
      if (data && data.length > 0) {
        setSelectedColor(data[0].id);
      }
    }
  };

  const fetchSizeVariants = async () => {
    if (!selectedColor) return;

    const { data, error } = await supabase
      .from('size_variants')
      .select('id, size_name, stock_quantity')
      .eq('color_variant_id', selectedColor);

    if (error) {
      console.error('Error fetching size variants:', error);
    } else {
      setSizeVariants(data || []);
      if (data && data.length > 0) {
        setSelectedSize(data[0].id);
      }
    }
  };

  const getAvailableStock = () =>t
    if (product.has_size_variants && selectedSize) {
      const sizeVariant = sizeVariants.find(s => s.id === selectedSize);
      return sizeVariant?.stock_quantity || 0;
    } else if (product.has_color_variants && selectedColor) {
      const colorVariant = colorVariants.find(c => c.id === selectedColor);
      return colorVariant?.stock_quantity || 0;
    }
    return product.stock_quantity || 0;
  };

  const handleAddToCart = async () => {
    if (product.has_color_variants && !selectedColor) {
      toast({
        title: "Selection Required",
        description: "Please select a color",
        variant: "destructive",
      });
      return;
    }

    if (product.has_size_variants && !selectedSize) {
      toast({
        title: "Selection Required", 
        description: "Please select a size",
        variant: "destructive",
      });
      return;
    }

    const availableStock = getAvailableStock();
    if (quantity > availableStock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${availableStock} items available`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await addToCart({
        productId: product.id,
        colorVariantId: selectedColor || null,
        sizeVariantId: selectedSize || null,
        quantity
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const availableStock = getAvailableStock();

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer h-full flex flex-col overflow-hidden">
      {/* Image Section */}
      <div className="relative overflow-hidden">
        {currentImage ? (
          <img 
            src={currentImage} 
            alt={product.name}
            className="w-full h-36 sm:h-40 object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-36 sm:h-40 bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <span className="text-3xl">🧦</span>
          </div>
        )}
        
        {/* Featured Badge */}
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-yellow-500 text-black text-xs">
            <Star className="w-2 h-2 mr-1" />
            Featured
          </Badge>
        )}

        {/* Price Badge */}
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1">
          <span className="text-sm font-bold text-red-600">
            ${basePrice.toFixed(2)}
          </span>
          {activeCombo && (
            <div className="flex items-center gap-1 mt-1">
              <Tag className="w-2 h-2 text-green-600" />
              <span className="text-xs text-green-600 font-medium">Combo Available</span>
            </div>
          )}
        </div>
      </div>
      
      <CardContent className="p-2 flex-1 flex flex-col">
        {/* Product Info */}
        <div className="mb-2">
          <h3 className="font-semibold text-xs text-gray-900 truncate mb-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Color Selection */}
        {product.has_color_variants && colorVariants.length > 0 && (
          <div className="mb-2">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Color:</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {colorVariants.map((color) => (
                  <SelectItem key={color.id} value={color.id}>
                    {color.color_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Size Selection */}
        {product.has_size_variants && sizeVariants.length > 0 && (
          <div className="mb-2">
            <label className="text-xs font-medium text-gray-700 mb-1 block">Size:</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {sizeVariants.map((size) => (
                  <SelectItem key={size.id} value={size.id}>
                    {size.size_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quantity Selection */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="h-6 w-6 p-0"
            >
              <Minus className="h-2 w-2" />
            </Button>
            <span className="px-2 py-1 border rounded text-xs min-w-[1.5rem] text-center">{quantity}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
              disabled={quantity >= availableStock}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-2 w-2" />
            </Button>
          </div>
          
          <div className="text-right">
            <span className="text-xs text-gray-500">Stock: {availableStock}</span>
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button 
          onClick={handleAddToCart}
          disabled={loading || availableStock === 0}
          className="w-full bg-red-600 hover:bg-red-700 text-xs h-7 mt-auto"
        >
          {loading ? (
            "Adding..."
          ) : availableStock === 0 ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingCart className="mr-1 h-2 w-2" />
              Add to Cart
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
