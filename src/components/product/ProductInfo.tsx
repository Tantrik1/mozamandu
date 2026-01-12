import { useState, useEffect, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Zap, 
  Check,
  Truck,
  RotateCcw,
  Shield,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StarRating } from './StarRating';
import { supabase } from '@/integrations/supabase/client';

interface ColorVariant {
  id: string;
  color_name: string;
  has_sizes: boolean;
  image_url: string | null;
  hex_code?: string | null;
}

interface SizeVariant {
  id: string;
  size_name: string;
}

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount?: number;
  discount_percentage?: number; // For backward compatibility
}

interface CartItem {
  productId: string;
  quantity: number;
  subcategoryId: string;
  basePrice: number;
  totalPrice: number;
}

interface ProductInfoProps {
  productName: string;
  subcategoryName?: string;
  subcategoryId?: string;
  basePrice: number;
  stock: number;
  quantity: number;
  cartQuantity: number;
  colorVariants: ColorVariant[];
  sizeVariants: SizeVariant[];
  selectedColor: string;
  selectedSize: string;
  discountTiers: DiscountTier[];
  hasColorVariants: boolean;
  hasSizeVariants: boolean;
  averageRating?: number;
  reviewCount?: number;
  cartItems: CartItem[];
  onQuantityChange: (qty: number) => void;
  onColorChange: (colorId: string) => void;
  onSizeChange: (sizeId: string) => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  isLoading?: boolean;
}

export const ProductInfo = memo(function ProductInfo({
  productName,
  subcategoryName,
  subcategoryId,
  basePrice,
  stock,
  quantity,
  cartQuantity,
  colorVariants,
  sizeVariants,
  selectedColor,
  selectedSize,
  discountTiers,
  hasColorVariants,
  hasSizeVariants,
  averageRating = 0,
  reviewCount = 0,
  cartItems,
  onQuantityChange,
  onColorChange,
  onSizeChange,
  onAddToCart,
  onBuyNow,
  isLoading
}: ProductInfoProps) {
  const [subcategoryRequirements, setSubcategoryRequirements] = useState<{
    minimumQuantity: number;
    currentQuantity: number;
    fulfilled: boolean;
  } | null>(null);

  const selectedColorName = colorVariants.find(c => c.id === selectedColor)?.color_name;
  const selectedSizeName = sizeVariants.find(s => s.id === selectedSize)?.size_name;

  // Calculate pricing exactly like cart - FIFO based on subcategory quantity
  const pricingCalculation = useMemo(() => {
    // Get total quantity in cart for this subcategory
    const cartSubcategoryQuantity = cartItems
      .filter(item => item.subcategoryId === subcategoryId)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    // Total quantity including current selection
    const totalSubcategoryQuantity = cartSubcategoryQuantity + quantity;
    
    // Find applicable tier
    const sortedTiers = [...discountTiers].sort((a, b) => b.min_quantity - a.min_quantity);
    const moqTier = sortedTiers.find(tier => tier.min_quantity > 1) || sortedTiers[0];
    
    // Get discount amount - support both discount_amount and discount_percentage columns
    const getDiscountAmount = (tier: any): number => {
      return tier?.discount_amount ?? tier?.discount_percentage ?? 0;
    };
    
    const discountAmt = moqTier ? getDiscountAmount(moqTier) : 0;
    
    if (!moqTier || discountAmt === 0) {
      return {
        unitPrice: basePrice,
        totalPrice: basePrice * quantity,
        savings: 0,
        discountPercent: 0,
        moqReached: false,
        moqRequired: moqTier?.min_quantity || 0,
        itemsUntilDiscount: moqTier ? Math.max(0, moqTier.min_quantity - totalSubcategoryQuantity) : 0,
        discountAmount: 0,
        discountedPrice: basePrice
      };
    }
    
    const moqReached = totalSubcategoryQuantity >= moqTier.min_quantity;
    const discountedPrice = Math.max(0, basePrice - discountAmt);
    
    // Calculate FIFO pricing for current items
    let totalCost = 0;
    let normalPriceQty = 0;
    let discountPriceQty = 0;
    
    if (moqReached) {
      // Items before MOQ threshold at normal price
      normalPriceQty = Math.max(0, Math.min(quantity, moqTier.min_quantity - cartSubcategoryQuantity));
      // Items after MOQ threshold at discounted price
      discountPriceQty = quantity - normalPriceQty;
      
      totalCost = (normalPriceQty * basePrice) + (discountPriceQty * discountedPrice);
    } else {
      // MOQ not reached, all at normal price
      normalPriceQty = quantity;
      totalCost = quantity * basePrice;
    }
    
    const avgUnitPrice = totalCost / quantity;
    const savings = discountPriceQty * discountAmt;
    const discountPercent = discountAmt > 0 
      ? Math.round((discountAmt / basePrice) * 100) 
      : 0;
    
    return {
      unitPrice: avgUnitPrice,
      totalPrice: totalCost,
      savings,
      discountPercent,
      moqReached,
      moqRequired: moqTier.min_quantity,
      itemsUntilDiscount: moqReached ? 0 : moqTier.min_quantity - totalSubcategoryQuantity,
      discountAmount: discountAmt,
      discountedPrice
    };
  }, [cartItems, subcategoryId, quantity, discountTiers, basePrice]);

  // Calculate cart total including current selection for MOQ bypass check
  const cartTotalWithSelection = useMemo(() => {
    const cartTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    return cartTotal + pricingCalculation.totalPrice;
  }, [cartItems, pricingCalculation.totalPrice]);

  // Check MOQ requirements
  useEffect(() => {
    const checkRequirements = async () => {
      if (!subcategoryId) return;
      
      const { data } = await supabase
        .from('subcategories')
        .select('minimum_quantity')
        .eq('id', subcategoryId)
        .single();
      
      if (data) {
        const cartQuantityForSubcategory = cartItems
          .filter(item => item.subcategoryId === subcategoryId)
          .reduce((sum, item) => sum + item.quantity, 0);
        
        const totalQuantity = cartQuantityForSubcategory + quantity;
        
        setSubcategoryRequirements({
          minimumQuantity: data.minimum_quantity,
          currentQuantity: totalQuantity,
          fulfilled: totalQuantity >= data.minimum_quantity
        });
      }
    };
    
    checkRequirements();
  }, [subcategoryId, cartItems, quantity]);

  // MOQ bypass if total >= 1000
  const moqBypass = cartTotalWithSelection >= 1000;
  const canCheckout = moqBypass || (subcategoryRequirements?.fulfilled ?? false);

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Breadcrumb */}
      {subcategoryName && subcategoryId && (
        <Link 
          to={`/shop?subcategory=${subcategoryId}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
        >
          {subcategoryName}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}

      {/* Product Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight">
          {productName}
        </h1>
        
        {/* Rating */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={averageRating} size="sm" />
            <span className="text-sm text-muted-foreground">
              ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </span>
          </div>
        )}
      </div>

      {/* Price Section */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl lg:text-4xl font-bold text-foreground">
            Rs. {pricingCalculation.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          {pricingCalculation.savings > 0 && (
            <>
              <span className="text-lg text-muted-foreground line-through">
                Rs. {basePrice.toLocaleString()}
              </span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                Save Rs. {pricingCalculation.savings.toLocaleString()}
              </Badge>
            </>
          )}
        </div>

        {/* Stock Status */}
        <div className="flex items-center gap-2">
          {stock > 0 ? (
            stock <= 5 ? (
              <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                Only {stock} left in stock
              </span>
            ) : (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                In Stock
              </span>
            )
          ) : (
            <span className="text-sm text-destructive font-medium">Out of Stock</span>
          )}
        </div>
      </div>

      {/* Volume Discount Tiers */}
      {discountTiers.length > 0 && (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Buy More, Save More
          </p>
          <div className="grid gap-2">
            {discountTiers.slice(0, 3).map((tier) => {
              const cartSubcategoryQty = cartItems
                .filter(item => item.subcategoryId === subcategoryId)
                .reduce((sum, item) => sum + item.quantity, 0);
              const totalQty = cartSubcategoryQty + quantity;
              const isActive = totalQty >= tier.min_quantity;
              // Support both discount_amount and discount_percentage columns
              const tierDiscountAmount = tier.discount_amount ?? (tier as any).discount_percentage ?? 0;
              
              return (
                <div 
                  key={tier.id}
                  className={cn(
                    "flex items-center justify-between text-sm px-3 py-2 rounded-lg transition-colors",
                    isActive ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" : "bg-background/50"
                  )}
                >
                  <span className={cn(
                    "text-muted-foreground",
                    isActive && "text-emerald-700 dark:text-emerald-400"
                  )}>
                    {tier.min_quantity}+ items
                  </span>
                  <span className={cn(
                    "font-medium",
                    isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )}>
                    Rs. {tierDiscountAmount} off/item
                    {isActive && <Check className="w-3.5 h-3.5 inline ml-1" />}
                  </span>
                </div>
              );
            })}
          </div>
          {pricingCalculation.itemsUntilDiscount > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Add {pricingCalculation.itemsUntilDiscount} more to unlock volume discount
            </p>
          )}
        </div>
      )}

      {/* Color Selection */}
      {hasColorVariants && colorVariants.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Color: <span className="text-muted-foreground font-normal">{selectedColorName}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {colorVariants.map(color => (
              <button
                key={color.id}
                onClick={() => onColorChange(color.id)}
                className={cn(
                  "relative w-9 h-9 lg:w-10 lg:h-10 rounded-full border-2 transition-all",
                  selectedColor === color.id
                    ? "border-primary ring-2 ring-primary/30 ring-offset-2"
                    : "border-border hover:border-primary/50"
                )}
                style={{ backgroundColor: color.hex_code || '#ccc' }}
                aria-label={`Select ${color.color_name}`}
                title={color.color_name}
              >
                {selectedColor === color.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size Selection */}
      {hasSizeVariants && sizeVariants.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Size: <span className="text-muted-foreground font-normal">{selectedSizeName}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizeVariants.map(size => (
              <button
                key={size.id}
                onClick={() => onSizeChange(size.id)}
                className={cn(
                  "min-w-[48px] h-10 px-4 rounded-lg font-medium text-sm transition-all",
                  selectedSize === size.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                )}
              >
                {size.size_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity & Actions */}
      <div className="space-y-4 pt-2">
        {/* Quantity Selector */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">Quantity</span>
          <div className="flex items-center bg-muted rounded-lg border border-border">
            <button 
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 flex items-center justify-center hover:bg-background rounded-l-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-semibold tabular-nums">{quantity}</span>
            <button 
              onClick={() => onQuantityChange(Math.min(stock, quantity + 1))}
              disabled={quantity >= stock}
              className="w-10 h-10 flex items-center justify-center hover:bg-background rounded-r-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Total Price */}
        {quantity > 1 && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
            <span className="text-sm text-muted-foreground">Total for {quantity} items</span>
            <span className="text-xl font-bold text-foreground">Rs. {pricingCalculation.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        )}

        {/* MOQ Warning */}
        {!canCheckout && subcategoryRequirements && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Need {subcategoryRequirements.minimumQuantity - subcategoryRequirements.currentQuantity} more items or Rs. {(1000 - cartTotalWithSelection).toLocaleString()} more to checkout
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            size="lg"
            onClick={onAddToCart}
            disabled={isLoading || stock === 0}
            variant="outline"
            className="h-12 lg:h-14 text-sm lg:text-base font-semibold rounded-xl border-2"
          >
            <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            Add to Cart
          </Button>
          <Button 
            size="lg"
            onClick={onBuyNow}
            disabled={isLoading || stock === 0 || !canCheckout}
            className={cn(
              "h-12 lg:h-14 text-sm lg:text-base font-semibold rounded-xl",
              !canCheckout && "opacity-50 cursor-not-allowed"
            )}
          >
            <Zap className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            Buy Now
          </Button>
        </div>

        {/* Cart indicator */}
        {cartQuantity > 0 && (
          <p className="text-sm text-center text-muted-foreground bg-muted/30 rounded-lg py-2.5">
            <ShoppingCart className="w-4 h-4 inline mr-1.5" />
            {cartQuantity} already in cart
          </p>
        )}
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
        {[
          { icon: Truck, label: "Delivery All Over Nepal" },
          { icon: RotateCcw, label: "Easy Returns" },
          { icon: Shield, label: "Quality Assured" },
        ].map(({ icon: Icon, label }, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5 py-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground text-center">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
