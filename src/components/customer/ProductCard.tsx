
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, ShoppingCart, Star, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useRobustCart } from '@/hooks/useRobustCart';

interface Product {
  id: string;
  name: string;
  description: string;
  cost_price: number;
  selling_price: number;
  is_featured: boolean;
  image_url: string;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
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
  isCompact?: boolean;
}

export function ProductCard({ product, subcategoryPrice, isCompact = false }: ProductCardProps) {
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(product.image_url);
  const { addToCart, cartItems, activeCombo, getItemPricing } = useRobustCart();

  // Get the base price for display
  const basePrice = product.selling_price || subcategoryPrice;

  // Create a mock cart item to get pricing information
  const mockCartItem = {
    id: 'mock',
    productId: product.id,
    productName: product.name,
    colorVariantId: selectedColor || null,
    sizeVariantId: selectedSize || null,
    colorName: '',
    sizeName: '',
    quantity: 1,
    basePrice: basePrice,
    subcategoryId: product.subcategory_id,
    image_url: product.image_url
  };

  // Get current pricing information
  const currentPricing = getItemPricing(mockCartItem);

  useEffect(() => {
    if (product.has_color_variants) {
      fetchColorVariants();
    }
  }, [product.id, product.has_color_variants]);

  useEffect(() => {
    if (selectedColor && product.color_has_size_variants) {
      fetchSizeVariants();
    }
  }, [selectedColor, product.color_has_size_variants]);

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

  const getAvailableStock = () => {
    if (product.color_has_size_variants && selectedSize) {
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

    if (product.color_has_size_variants && !selectedSize) {
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
<<<<<<< HEAD
<<<<<<< HEAD
    <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-md">
      {/* Image Section */}
      <div className="relative overflow-hidden bg-gray-50 rounded-t-2xl">
=======
    <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer h-full flex flex-col overflow-hidden bg-white rounded-xl border border-gray-100">
      {/* Image Section */}
      <div className="relative overflow-hidden bg-gray-50 rounded-t-xl">
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col overflow-hidden bg-white rounded-lg border border-gray-200">
      {/* Image Section */}
      <div className="relative overflow-hidden bg-gray-50">
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
        {currentImage ? (
          <img
            src={currentImage}
            alt={product.name}
<<<<<<< HEAD
<<<<<<< HEAD
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 rounded-t-2xl"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center rounded-t-2xl">
            <span className="text-4xl">🧦</span>
          </div>
        )}
        {/* Price Badge - Top Right */}
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-red-600 text-white px-4 py-1 rounded-full shadow-lg text-base font-bold border-2 border-white">
            Rs. {currentPricing.finalPrice.toFixed(2)}
          </span>
        </div>
        {/* Stock Info - Bottom Right */}
        <div className="absolute bottom-3 right-3 z-10">
          <span className="bg-white/90 text-gray-700 text-xs px-3 py-1 rounded-full border border-gray-200 shadow-sm font-medium">
            Stock: {availableStock}
          </span>
        </div>
        {/* Pricing Mode Badge - Bottom Left */}
        {currentPricing.mode !== 'normal' && (
          <div className="absolute bottom-3 left-3 z-10">
            {currentPricing.mode === 'combo' && (
              <Badge className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow">Combo Price</Badge>
            )}
            {currentPricing.mode === 'discount' && (
              <Badge className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow flex items-center">
                <Tag className="w-3 h-3 mr-1" /> MOQ Discount
=======
            className={`w-full ${isCompact ? 'h-32 sm:h-32' : 'h-40 sm:h-48'} object-cover group-hover:scale-110 transition-transform duration-300`}
=======
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <span className="text-4xl">🧦</span>
          </div>
        )}
        
        {/* Price Badge - Top Right */}
        <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full shadow-lg">
          <span className="text-sm font-bold">Rs. {currentPricing.finalPrice.toFixed(2)}</span>
        </div>

        {/* Featured Badge */}
        {product.is_featured && (
          <Badge className="absolute top-3 left-3 bg-yellow-500 text-black text-xs font-medium px-2 py-1">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        )}

        {/* Pricing Mode Badge */}
        {currentPricing.mode !== 'normal' && (
          <div className="absolute bottom-3 left-3">
            {currentPricing.mode === 'combo' && (
              <Badge className="bg-green-500 text-white text-xs px-2 py-1">
                Combo Price
              </Badge>
            )}
            {currentPricing.mode === 'discount' && (
<<<<<<< HEAD
              <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0.5">
                <Tag className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                <span className="hidden sm:inline">MOQ Discount</span>
                <span className="sm:hidden">Discount</span>
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
              <Badge className="bg-blue-500 text-white text-xs px-2 py-1">
                <Tag className="w-3 h-3 mr-1" />
                MOQ Discount
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
              </Badge>
            )}
          </div>
        )}
<<<<<<< HEAD
      </div>
      <CardContent className="p-5 flex-1 flex flex-col space-y-4">
        {/* Product Info */}
        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
          <p className="text-sm text-gray-500 mb-2">Choose any color</p>
=======

        {/* Stock Info */}
        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
          <span className="text-xs text-gray-600">Stock: {availableStock}</span>
        </div>
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col space-y-3">
        {/* Product Info */}
        <div>
          <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-1">
            {product.name}
          </h3>
<<<<<<< HEAD
          {product.description && (
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
              {product.description}
            </p>
          )}
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
          <p className="text-sm text-gray-600 mb-2">Choose any color</p>
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
        </div>
        {/* Color Selection */}
        {product.has_color_variants && colorVariants.length > 0 && (
<<<<<<< HEAD
          <div className="mb-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Color:</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="h-9 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500">
=======
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Color:</label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
<<<<<<< HEAD
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
              <SelectTrigger className="h-9 text-sm">
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {colorVariants.map((color) => (
                  <SelectItem key={color.id} value={color.id} className="text-sm">
                    {color.color_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Size Selection */}
<<<<<<< HEAD
<<<<<<< HEAD
        {product.color_has_size_variants && sizeVariants.length > 0 && (
          <div className="mb-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Size:</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-9 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500">
=======
        {product.has_size_variants && sizeVariants.length > 0 && (
=======
        {product.color_has_size_variants && sizeVariants.length > 0 && (
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Size:</label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
<<<<<<< HEAD
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
              <SelectTrigger className="h-9 text-sm">
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {sizeVariants.map((size) => (
                  <SelectItem key={size.id} value={size.id} className="text-sm">
                    {size.size_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Quantity Selection */}
<<<<<<< HEAD
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
=======
        <div className="flex items-center justify-between">
<<<<<<< HEAD
          <div className="flex items-center space-x-1 sm:space-x-2">
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
          <div className="flex items-center space-x-2">
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
<<<<<<< HEAD
<<<<<<< HEAD
              className="h-8 w-8 p-0 border border-gray-300"
=======
              className="h-6 w-6 sm:h-8 sm:w-8 p-0"
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
              className="h-8 w-8 p-0"
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
            >
              <Minus className="h-3 w-3" />
            </Button>
<<<<<<< HEAD
<<<<<<< HEAD
            <span className="px-3 py-1 border border-gray-200 rounded text-base min-w-[2rem] text-center font-semibold bg-gray-50">
              {quantity}
            </span>
=======
            <span className="px-2 py-1 border rounded text-xs sm:text-sm min-w-[1.5rem] sm:min-w-[2rem] text-center font-medium">{quantity}</span>
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
            <span className="px-3 py-1 border rounded text-sm min-w-[2rem] text-center font-medium">{quantity}</span>
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
              disabled={quantity >= availableStock}
<<<<<<< HEAD
<<<<<<< HEAD
              className="h-8 w-8 p-0 border border-gray-300"
=======
              className="h-6 w-6 sm:h-8 sm:w-8 p-0"
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
              className="h-8 w-8 p-0"
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={loading || availableStock === 0}
<<<<<<< HEAD
<<<<<<< HEAD
          className="w-full bg-red-600 hover:bg-red-700 text-white h-11 mt-auto font-semibold text-base rounded-lg flex items-center justify-center gap-2 shadow-lg"
=======
          className="w-full bg-red-600 hover:bg-red-700 text-white h-8 sm:h-10 mt-auto font-medium text-xs sm:text-sm"
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
          className="w-full bg-red-600 hover:bg-red-700 text-white h-10 mt-auto font-medium"
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
        >
          {loading ? (
            "Adding..."
          ) : availableStock === 0 ? (
            "Out of Stock"
          ) : (
            <>
<<<<<<< HEAD
<<<<<<< HEAD
              <ShoppingCart className="h-5 w-5" />
              Add to Cart
=======
              <ShoppingCart className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Add to Cart</span>
              <span className="sm:hidden">Add</span>
>>>>>>> 9f249609f514ae49130200ac3399bfab1c96309c
=======
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
>>>>>>> 729aa14c3c162efa0086d92af62c004c43dec552
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
