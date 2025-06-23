
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
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
  const { addToCart } = useCart();

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

  const fetchColorVariants = async () => {
    const { data, error } = await supabase
      .from('color_variants')
      .select('id, color_name, stock_quantity, has_sizes')
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

  const getCurrentPrice = () => {
    return product.selling_price || subcategoryPrice;
  };

  const getAvailableStock = () => {
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
        quantity,
        price: getCurrentPrice()
      });

      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart`,
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
    <Card className="hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <CardHeader className="p-0">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-red-500 to-red-700 rounded-t-lg flex items-center justify-center">
            <span className="text-6xl">🧦</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="text-lg font-semibold">{product.name}</CardTitle>
          {product.is_featured && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Featured
            </Badge>
          )}
        </div>
        
        {product.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex-1 space-y-3">
          {/* Color Selection */}
          {product.has_color_variants && colorVariants.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Color:</label>
              <Select value={selectedColor} onValueChange={setSelectedColor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {colorVariants.map((color) => (
                    <SelectItem key={color.id} value={color.id}>
                      {color.color_name} ({color.stock_quantity} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Size Selection */}
          {product.has_size_variants && sizeVariants.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Size:</label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {sizeVariants.map((size) => (
                    <SelectItem key={size.id} value={size.id}>
                      {size.size_name} ({size.stock_quantity} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity:</label>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="px-3 py-1 border rounded text-center min-w-[3rem]">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                disabled={quantity >= availableStock}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-red-600">
              ${getCurrentPrice()}
            </span>
            <span className="text-sm text-gray-500">
              {availableStock} in stock
            </span>
          </div>

          <Button 
            onClick={handleAddToCart}
            disabled={loading || availableStock === 0}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              "Adding..."
            ) : availableStock === 0 ? (
              "Out of Stock"
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
