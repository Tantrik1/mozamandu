
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProductColors, useProductSizes, ProductColor, ProductSize } from '@/hooks/useProductVariants';

interface ProductVariantSelectorProps {
  productId: string;
  productName: string;
  onVariantSelect?: (variant: {
    variantId: string;
    sku: string;
    colorName?: string;
    sizeName?: string;
    price: number;
    availableStock: number;
  }) => void;
}

export function ProductVariantSelector({ 
  productId, 
  productName, 
  onVariantSelect 
}: ProductVariantSelectorProps) {
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);

  const { colors, loading: colorsLoading } = useProductColors(productId);
  const { sizes, loading: sizesLoading } = useProductSizes(
    productId, 
    selectedColor?.color_name
  );

  const handleColorSelect = (color: ProductColor) => {
    setSelectedColor(color);
    setSelectedSize(null); // Reset size selection when color changes
  };

  const handleSizeSelect = (size: ProductSize) => {
    setSelectedSize(size);
    
    if (onVariantSelect) {
      onVariantSelect({
        variantId: size.variant_id,
        sku: size.sku,
        colorName: selectedColor?.color_name,
        sizeName: size.size_name,
        price: 0, // Price would come from product or variant
        availableStock: size.available_stock
      });
    }
  };

  if (colorsLoading) {
    return <div className="p-4">Loading colors...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{productName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Available Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {colors.map((color) => (
                <Button
                  key={color.color_id}
                  variant={selectedColor?.color_id === color.color_id ? "default" : "outline"}
                  className="h-auto p-3 flex flex-col items-center space-y-2"
                  onClick={() => handleColorSelect(color)}
                >
                  {color.hex_code && (
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: color.hex_code }}
                    />
                  )}
                  <div className="text-center">
                    <div className="font-medium text-sm">{color.color_name}</div>
                    <Badge variant="secondary" className="text-xs">
                      Stock: {color.total_stock}
                    </Badge>
                  </div>
                  {color.image_url && (
                    <img 
                      src={color.image_url} 
                      alt={color.color_name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          {selectedColor && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Available Sizes for {selectedColor.color_name}
              </h3>
              {sizesLoading ? (
                <div>Loading sizes...</div>
              ) : sizes.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {sizes.map((size) => (
                    <Button
                      key={size.size_id}
                      variant={selectedSize?.size_id === size.size_id ? "default" : "outline"}
                      className="h-auto p-3 flex flex-col items-center space-y-1"
                      onClick={() => handleSizeSelect(size)}
                      disabled={size.available_stock === 0}
                    >
                      <div className="font-bold text-lg">
                        {size.size_code || size.size_name}
                      </div>
                      <Badge 
                        variant={size.available_stock > 0 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {size.available_stock > 0 ? `${size.available_stock} left` : 'Out of Stock'}
                      </Badge>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 text-gray-500">
                  No sizes available for this color
                </div>
              )}
            </div>
          )}

          {/* Selected Variant Info */}
          {selectedColor && selectedSize && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <h4 className="font-semibold text-green-800 mb-2">Selected Variant:</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">SKU:</span> {selectedSize.sku}</p>
                  <p><span className="font-medium">Color:</span> {selectedColor.color_name}</p>
                  <p><span className="font-medium">Size:</span> {selectedSize.size_name}</p>
                  <p><span className="font-medium">Available Stock:</span> {selectedSize.available_stock}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
