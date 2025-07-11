
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ShoppingCart } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
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

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [stock] = useState(100); // Default stock value

  const { addToCart } = useRobustCart();

  const basePrice = product.subcategories?.selling_price || product.selling_price || product.cost_price;
  const selectedVariant = product.color_variants?.find(v => v.id === selectedColor);
  const availableSizes = selectedVariant?.size_variants || [];

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
      image_url: selectedVariant?.image_url || product.image_url
    };

    addToCart(cartItem);
    
    toast({
      title: "Added to cart",
      description: `${quantity} × ${product.name} added to cart`
    });

    setQuantity(1);
  };

  const currentImage = selectedVariant?.image_url || product.image_url || 'https://via.placeholder.com/350x200';

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

        {/* Pricing Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-primary">
              Rs. {basePrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Stock Status */}
        <div className="flex items-center justify-between">
          <Badge variant="default">
            {stock} In Stock
          </Badge>
        </div>

        {/* Add to Cart Button */}
        <Button 
          className="w-full" 
          disabled={stock === 0 || (product.has_color_variants && !selectedColor) || (selectedVariant?.has_sizes && !selectedSize)}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart - Rs. {(basePrice * quantity).toFixed(2)}
        </Button>
      </CardContent>
    </Card>
  );
}
