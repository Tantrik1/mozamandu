
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { Star, ShoppingCart } from 'lucide-react';
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
  subcategories?: {
    name: string;
    selling_price: number;
  } | null;
}

interface ProductCardProps {
  product: Product;
  subcategorySellingPrice: number;
}

export function ProductCard({ product, subcategorySellingPrice }: ProductCardProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
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

  const handleAddToCart = async () => {
    if (productStock === 0) return;
    
    setLoading(true);
    try {
      await addToCart({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        colorVariantId: selectedColor || undefined,
        sizeVariantId: selectedSize || undefined,
        unitPrice: product.selling_price || subcategorySellingPrice,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayPrice = product.selling_price || subcategorySellingPrice;
  const selectedColorVariant = colorVariants.find(cv => cv.id === selectedColor);
  const currentImage = selectedColorVariant?.image_url || product.image_url;
  const hasDiscount = product.cost_price < displayPrice;

  return (
    <Card className="group h-full flex flex-col overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 rounded-xl">
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
        </div>

        {/* Stock Status */}
        <div className="absolute top-3 right-3">
          {productStock === 0 ? (
            <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
              Out of Stock
            </Badge>
          ) : productStock <= 5 ? (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
              Low Stock
            </Badge>
          ) : null}
        </div>
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Product Name */}
        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 leading-tight">
          {product.name}
        </h3>
        
        {/* Description - only show if exists */}
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

        {/* Pricing */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                Rs {displayPrice}
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-500 line-through">
                  Rs {product.cost_price}
                </span>
              )}
            </div>
            {hasDiscount && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                Save Rs {displayPrice - product.cost_price}
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
                Add to Cart
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
