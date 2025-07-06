
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRobustCart } from '@/hooks/useRobustCart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRealTimeStock } from '@/utils/inventoryManager';

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
  category_id: string;
  subcategory_id: string;
}

interface ProductInventory {
  id: string;
  product_id: string;
  color_variant_id?: string | null;
  size_variant_id?: string | null;
  color_name?: string | null;
  size_name?: string | null;
  stock_quantity: number;
  reserved_stock: number;
  available_stock: number;
  selling_price?: number | null;
  image_url?: string | null;
}

interface ProductCardProps {
  product: Product;
  subcategoryPrice: number;
  isCompact?: boolean;
}

const colorSwatchPalette: Record<string, string> = {
  Red: 'bg-red-500',
  Blue: 'bg-blue-500',
  Green: 'bg-green-500',
  Black: 'bg-black',
  White: 'bg-white border',
  Yellow: 'bg-yellow-400',
  Pink: 'bg-pink-400',
  Orange: 'bg-orange-400',
  Purple: 'bg-purple-500',
  Gray: 'bg-gray-400',
  // fallback for unknown colors
  Default: 'bg-gray-200',
};

export function ProductCard({ product, subcategoryPrice, isCompact = false }: ProductCardProps) {
  const [inventoryRows, setInventoryRows] = useState<ProductInventory[]>([]);
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(product.image_url);
  const [added, setAdded] = useState(false);
  const { addToCart, cartItems, getItemPricing, activeCombo, discountTiers } = useRobustCart();

  useEffect(() => { fetchInventoryRows(); }, [product.id]);

  useEffect(() => {
    const colors = Array.from(new Set(inventoryRows.map(row => row.color_name).filter(Boolean)));
    setColorOptions(colors as string[]);
    if (colors.length > 0) setSelectedColor(colors[0] as string);
    else setSelectedColor('');
  }, [inventoryRows]);

  useEffect(() => {
    if (selectedColor) {
      const sizes = Array.from(new Set(
        inventoryRows.filter(row => row.color_name === selectedColor).map(row => row.size_name).filter(Boolean)
      ));
      setSizeOptions(sizes as string[]);
      if (sizes.length > 0) setSelectedSize(sizes[0] as string);
      else setSelectedSize('');
    } else {
      setSizeOptions([]);
      setSelectedSize('');
    }
  }, [selectedColor, inventoryRows]);

  useEffect(() => {
    const existingItem = cartItems.find(item =>
      item.productId === product.id &&
      item.productInventoryId === getSelectedInventory()?.id
    );
    setQuantity(existingItem ? existingItem.quantity : 1);
  }, [selectedColor, selectedSize, cartItems, inventoryRows]);

  useEffect(() => {
    if (selectedColor) {
      const rowWithImage = inventoryRows.find(row => row.color_name === selectedColor && row.image_url);
      if (rowWithImage && rowWithImage.image_url) {
        setCurrentImage(rowWithImage.image_url);
      } else {
        setCurrentImage(product.image_url);
      }
    } else {
      setCurrentImage(product.image_url);
    }
  }, [selectedColor, inventoryRows, product.image_url]);

  const fetchInventoryRows = async () => {
    try {
      const { data, error } = await (await import('@/integrations/supabase/client')).supabase
        .from('product_inventory')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching inventory rows:', error);
        setInventoryRows([]);
      } else {
        setInventoryRows(data || []);
        console.log(`Fetched ${data?.length || 0} inventory rows for product ${product.id}`);
      }
    } catch (error) {
      console.error('Error in fetchInventoryRows:', error);
      setInventoryRows([]);
    }
  };

  const getSelectedInventory = (): ProductInventory | undefined => {
    if (product.has_color_variants && product.color_has_size_variants) {
      return inventoryRows.find(row => row.color_name === selectedColor && row.size_name === selectedSize);
    } else if (product.has_color_variants) {
      return inventoryRows.find(row => row.color_name === selectedColor);
    } else if (product.color_has_size_variants) {
      return inventoryRows.find(row => row.size_name === selectedSize);
    } else {
      return inventoryRows[0];
    }
  };

  const selectedInventory = getSelectedInventory();
  const availableStock = selectedInventory?.available_stock || 0;
  const price = selectedInventory?.selling_price ?? product.selling_price ?? subcategoryPrice;

  // Pricing calculation for ProductCard display based on current cart state
  const getProductCardPricing = () => {
    // Calculate current subcategory quantity in cart
    const subcategoryQty = cartItems
      .filter(item => item.subcategoryId === product.subcategory_id)
      .reduce((sum, item) => sum + item.quantity, 0);

    // Combo mode
    if (activeCombo) {
      const comboSubcategory = activeCombo.combo_subcategories.find(
        cs => cs.subcategory_id === product.subcategory_id
      );
      if (comboSubcategory && subcategoryQty >= comboSubcategory.min_units) {
        return {
          finalPrice: comboSubcategory.price,
          originalPrice: price,
          description: `Combo: Rs. ${comboSubcategory.price.toFixed(2)} each`,
          mode: 'combo' as const,
          savings: price - comboSubcategory.price
        };
      }
    }

    // Discount mode
    const tiers = discountTiers[product.subcategory_id];
    if (tiers && tiers.length > 0) {
      // Find the highest tier that applies for current cart quantity
      const applicableTier = [...tiers].reverse().find(tier => subcategoryQty >= tier.min_quantity);
      if (applicableTier && (price - applicableTier.discount_amount) < price) {
        const discountedPrice = Math.max(0, price - applicableTier.discount_amount);
        return {
          finalPrice: discountedPrice,
          originalPrice: price,
          description: `MOQ Discount: Rs. ${discountedPrice.toFixed(2)} each`,
          mode: 'discount' as const,
          savings: price - discountedPrice,
          moqRequired: applicableTier.min_quantity
        };
      }
    }

    // Normal mode
    return {
      finalPrice: price,
      originalPrice: price,
      description: `Rs. ${price.toFixed(2)} each`,
      mode: 'normal' as const,
      savings: 0
    };
  };

  const productPricing = getProductCardPricing();

  const handleAddToCart = async () => {
    if (product.has_color_variants && !selectedColor) {
      toast({ title: "Selection Required", description: "Please select a color", variant: "destructive" });
      return;
    }
    if (product.color_has_size_variants && !selectedSize) {
      toast({ title: "Selection Required", description: "Please select a size", variant: "destructive" });
      return;
    }
    if (!selectedInventory) {
      toast({ title: "Variant Not Available", description: "This variant is not available", variant: "destructive" });
      return;
    }
    if (quantity > availableStock) {
      toast({ title: "Insufficient Stock", description: `Only ${availableStock} items available`, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await addToCart({ 
        id: `${product.id}-${selectedInventory.id}-${Date.now()}`,
        productId: product.id, 
        productInventoryId: selectedInventory.id, 
        quantity,
        price,
        basePrice: price,
        productName: product.name,
        imageUrl: currentImage,
        colorName: selectedColor,
        sizeName: selectedSize,
        sku: selectedInventory.id,
        subcategoryId: product.subcategory_id
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } catch (error) {
      toast({ title: "Error", description: "Failed to add item to cart", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Animation helpers
  const animateCard = 'transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl hover:ring-2 hover:ring-red-400/30';
  const glass = 'bg-white/80 backdrop-blur-md shadow-lg border border-white/30';

  return (
    <div className={`relative rounded-2xl overflow-hidden ${glass} ${animateCard} flex flex-col h-full group`}>
      {/* Product Image */}
      <div className="relative aspect-square w-full flex items-center justify-center overflow-hidden bg-white">
        <img
          src={currentImage}
          alt={product.name}
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105 group-hover:rotate-1"
          style={{ transition: 'all 0.4s cubic-bezier(.4,2,.6,1)' }}
        />
        {selectedInventory && availableStock === 0 && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full shadow animate-pulse flex items-center gap-1">
            <XCircle className="w-4 h-4" /> Out of Stock
          </span>
        )}
        {productPricing.mode === 'discount' && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow animate-bounce">
            Save Rs. {productPricing.savings.toFixed(2)}!
          </span>
        )}
        {productPricing.mode === 'combo' && (
          <span className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-red-700 text-white text-xs px-2 py-1 rounded-full shadow animate-pulse">
            Save Rs. {productPricing.savings.toFixed(2)}!
          </span>
        )}
      </div>
      
      {/* Card Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-extrabold text-lg md:text-xl text-gray-900 mb-0 truncate text-center">{product.name}</h3>
        <div className="text-gray-500 text-xs text-center mb-1 line-clamp-2 min-h-[2.5em]">{product.description}</div>
        
        {/* Pricing */}
        <div className="flex items-center justify-center gap-2 mb-1">
          {(productPricing.mode === 'discount' || productPricing.mode === 'combo') && (
            <span className="text-gray-400 line-through font-semibold text-base">Rs. {productPricing.originalPrice}</span>
          )}
          <span className="font-bold text-xl text-red-600 animate-fade-in">Rs. {productPricing.finalPrice}</span>
        </div>
        
        {/* Color Dropdown */}
        {colorOptions.length > 0 && (
          <div className="mb-1 w-full flex justify-center">
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map(color => (
                  <SelectItem key={color} value={color}>{color}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Size Pills */}
        {sizeOptions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-1">
            {sizeOptions.map(size => {
              const isSelected = selectedSize === size;
              // Check if this size/color combo is in stock
              const inv = inventoryRows.find(row => row.color_name === selectedColor && row.size_name === size);
              const isOut = inv?.available_stock === 0;
              return (
                <button
                  key={size}
                  type="button"
                  disabled={isOut}
                  className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 ${isSelected ? 'bg-red-500 text-white border-red-500 scale-105 shadow' : 'bg-white text-gray-700 border-gray-300'} ${isOut ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              );
            })}
          </div>
        )}
        
        {/* Quantity Selector */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="border-gray-300"
          >
            -
          </Button>
          <input
            type="number"
            min={1}
            max={availableStock}
            value={quantity}
            onChange={e => setQuantity(Math.max(1, Math.min(Number(e.target.value), availableStock)))}
            className="w-12 text-center border rounded-md focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all duration-200"
            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(q => Math.min(q + 1, availableStock))}
            disabled={quantity >= availableStock}
            className="border-gray-300"
          >
            +
          </Button>
        </div>
        
        {/* Stock Info */}
        <div className="text-xs text-gray-500 text-center mb-1">
          {availableStock > 0 ? `${availableStock} in stock` : 'Out of stock'}
        </div>
        
        {/* Add to Cart Button */}
        <Button
          className={`w-full mt-1 py-2 font-bold text-base flex items-center justify-center gap-2 rounded-xl transition-all duration-200 ${availableStock === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg'} ${added ? 'animate-bounce' : ''}`}
          onClick={handleAddToCart}
          disabled={loading || availableStock === 0}
        >
          {added ? <CheckCircle2 className="w-5 h-5 animate-fade-in" /> : <ShoppingCart className="w-5 h-5" />}
          {added ? 'Added!' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  );
}
