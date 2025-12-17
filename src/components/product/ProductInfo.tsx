import { useState, memo } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StarRating } from './StarRating';

interface ColorVariant {
  id: string;
  color_name: string;
  has_sizes: boolean;
  image_url: string | null;
}

interface SizeVariant {
  id: string;
  size_name: string;
}

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface ProductInfoProps {
  productName: string;
  subcategoryName?: string;
  subcategoryId?: string;
  basePrice: number;
  discountedPrice: number;
  discountPercent: number;
  savings: number;
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
  discountedPrice,
  discountPercent,
  savings,
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
  onQuantityChange,
  onColorChange,
  onSizeChange,
  onAddToCart,
  onBuyNow,
  isLoading
}: ProductInfoProps) {
  const totalPrice = discountedPrice * quantity;
  const selectedColorName = colorVariants.find(c => c.id === selectedColor)?.color_name;
  const selectedSizeName = sizeVariants.find(s => s.id === selectedSize)?.size_name;

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
            Rs. {discountedPrice.toLocaleString()}
          </span>
          {discountPercent > 0 && (
            <>
              <span className="text-lg text-muted-foreground line-through">
                Rs. {basePrice.toLocaleString()}
              </span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                Save Rs. {savings.toLocaleString()}
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
            {discountTiers.slice(0, 3).map((tier) => (
              <div 
                key={tier.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {tier.min_quantity}+ items
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Rs. {tier.discount_amount} off/item
                </span>
              </div>
            ))}
          </div>
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
                  "relative w-12 h-12 lg:w-14 lg:h-14 rounded-lg overflow-hidden border-2 transition-all",
                  selectedColor === color.id 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/50"
                )}
                aria-label={`Select ${color.color_name}`}
              >
                {color.image_url ? (
                  <img src={color.image_url} alt={color.color_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {color.color_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                {selectedColor === color.id && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
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
            <span className="text-xl font-bold text-foreground">Rs. {totalPrice.toLocaleString()}</span>
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
            disabled={isLoading || stock === 0}
            className="h-12 lg:h-14 text-sm lg:text-base font-semibold rounded-xl"
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
          { icon: Truck, label: "Free Delivery" },
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
