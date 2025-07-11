
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { StockDisplay } from './StockDisplay';
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
  
  const { addToCart } = useCart();

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

      // Map the data to include stock_quantity (will be managed via inventory)
      const variantsWithStock = (data || []).map(variant => ({
        ...variant,
        stock_quantity: 0, // Will be calculated from inventory
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

      // Map the data to include stock_quantity (will be managed via inventory)
      const sizeVariantsWithStock = (data || []).map(variant => ({
        ...variant,
        stock_quantity: 0, // Will be calculated from inventory
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

  return (
    <Card className="h-full flex flex-col">
      <div className="relative">
        {currentImage && (
          <img
            src={currentImage}
            alt={product.name}
            className="w-full h-48 object-cover rounded-t-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        {product.is_featured && (
          <Badge className="absolute top-2 left-2">Featured</Badge>
        )}
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
        
        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        )}

        <div className="mb-3">
          <StockDisplay
            productId={product.id}
            colorVariantId={selectedColor}
            sizeVariantId={selectedSize}
            showDetailedInfo={false}
          />
        </div>

        {product.has_color_variants && colorVariants.length > 0 && (
          <div className="mb-3">
            <label className="text-sm font-medium mb-1 block">Color</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger>
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

        {product.color_has_size_variants && sizeVariants.length > 0 && (
          <div className="mb-3">
            <label className="text-sm font-medium mb-1 block">Size</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger>
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

        <div className="mt-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-bold">Rs {displayPrice}</span>
            {product.cost_price < displayPrice && (
              <span className="text-sm text-gray-500 line-through">
                Rs {product.cost_price}
              </span>
            )}
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={loading || productStock === 0}
            className="w-full"
          >
            {loading ? 'Adding...' : productStock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
