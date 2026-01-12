import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, ShoppingBag, TrendingDown } from 'lucide-react';
import { PricingBreakdown } from '@/components/cart/PricingBreakdown';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  unitPrice: number;
  basePrice: number;
  imageUrl?: string;
  subcategoryId: string;
  addedOrder: number;
  sku?: string;
  inventoryId?: string;
}

interface TierBreakdown {
  tierName: string;
  minQty: number;
  maxQty: number | null;
  discountAmount: number;
  unitPrice: number;
  unitsInTier: number;
  tierTotal: number;
}

interface ItemPricingDetail {
  itemId: string;
  basePrice: number;
  unitsAtBase: number;
  basePriceTotal: number;
  discountedUnits: Array<{
    tierName: string;
    units: number;
    unitPrice: number;
    discountAmount: number;
    total: number;
  }>;
  totalPrice: number;
  savings: number;
  averageUnitPrice: number;
}

interface SubcategoryPricingInfo {
  subcategoryId: string;
  totalQuantity: number;
  basePrice: number;
  tierBreakdown: TierBreakdown[];
  itemBreakdown: ItemPricingDetail[];
  totalCost: number;
  totalSavings: number;
  nextTierInfo?: {
    unitsNeeded: number;
    discountAmount: number;
    priceAtNextTier: number;
  };
  description: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
}

interface CleanOrderSummaryProps {
  cartItems: CartItem[];
  subcategoryPricing: { [key: string]: SubcategoryPricingInfo };
  deliveryCharge: number;
  promoCode?: PromoCode;
  promoDiscount: number;
  totalSavings: number;
  finalTotal: number;
  isSubmitting: boolean;
  onSubmitOrder: () => void;
  getTieredItemPricing: (itemId: string) => (ItemPricingDetail & { subcategoryInfo: SubcategoryPricingInfo }) | null;
}

export function CleanOrderSummary({
  cartItems,
  subcategoryPricing,
  deliveryCharge,
  promoCode,
  promoDiscount,
  totalSavings,
  finalTotal,
  isSubmitting,
  onSubmitOrder,
  getTieredItemPricing,
}: CleanOrderSummaryProps) {
  // Calculate subtotal using progressive pricing
  const subtotal = Object.values(subcategoryPricing).reduce((total, subcategory) => {
    return total + subcategory.totalCost;
  }, 0);

  return (
    <Card className="w-full shadow-lg border-0 bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            <span>Order Summary</span>
          </div>
          <span className="text-lg font-semibold text-blue-600">
            Rs. {finalTotal.toFixed(2)}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Cart Items Display with Progressive Pricing */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 text-sm">
            Items ({cartItems.length})
          </h3>
          
          {cartItems.map((item) => {
            const pricingInfo = getTieredItemPricing(item.id);
            const pricing = pricingInfo || {
              unitsAtBase: item.quantity,
              basePriceTotal: item.basePrice * item.quantity,
              discountedUnits: [],
              totalPrice: item.basePrice * item.quantity,
              savings: 0,
              averageUnitPrice: item.basePrice,
            };
            
            const hasDiscount = pricing.savings > 0;
            
            return (
              <div key={item.id} className="bg-muted/50 rounded-xl p-4 hover:bg-muted/70 transition-colors border">
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  {item.imageUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                      <img 
                        src={item.imageUrl} 
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    {/* Product header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-foreground text-sm truncate">
                        {item.productName}
                      </h4>
                      {hasDiscount && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 border-green-200 shrink-0">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          Volume
                        </Badge>
                      )}
                    </div>
                    
                    {/* Variant badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.colorName && (
                        <span className="text-xs bg-background px-2 py-0.5 rounded border">
                          {item.colorName}
                        </span>
                      )}
                      {item.sizeName && (
                        <span className="text-xs bg-background px-2 py-0.5 rounded border">
                          {item.sizeName}
                        </span>
                      )}
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                        × {item.quantity}
                      </span>
                    </div>

                    {/* Progressive Pricing breakdown */}
                    <PricingBreakdown
                      basePrice={item.basePrice}
                      quantity={item.quantity}
                      unitsAtBase={pricing.unitsAtBase}
                      basePriceTotal={pricing.basePriceTotal}
                      discountedUnits={pricing.discountedUnits}
                      totalPrice={pricing.totalPrice}
                      savings={pricing.savings}
                      nextTierHint={pricingInfo?.subcategoryInfo?.nextTierInfo?.unitsNeeded > 0 
                        ? `Add ${pricingInfo.subcategoryInfo.nextTierInfo.unitsNeeded} more for Rs.${pricingInfo.subcategoryInfo.nextTierInfo.priceAtNextTier}/item`
                        : undefined}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator className="my-6" />

        {/* Summary totals */}
        <div className="space-y-4 bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between text-base">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">Rs. {subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-base">
            <span className="text-gray-600">Delivery</span>
            <span className="font-semibold">Rs. {deliveryCharge.toFixed(2)}</span>
          </div>

          {promoCode && promoDiscount > 0 && (
            <div className="flex justify-between text-green-600 text-base">
              <span>Promo ({promoCode.code})</span>
              <span className="font-semibold">-Rs. {promoDiscount.toFixed(2)}</span>
            </div>
          )}

          <Separator />
          
          <div className="flex justify-between text-xl font-bold text-gray-900">
            <span>Total</span>
            <span>Rs. {finalTotal.toFixed(2)}</span>
          </div>

          {/* Total savings - Prominent display */}
          {(totalSavings + promoDiscount) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-green-800 font-bold text-lg">
                🎉 You saved Rs. {(totalSavings + promoDiscount).toFixed(2)}!
              </div>
              <div className="text-green-600 text-sm mt-1">
                Great choice! Progressive discounts applied.
              </div>
            </div>
          )}
        </div>

        {/* Place order button */}
        <div className="space-y-4 pt-4">
          <Button
            onClick={onSubmitOrder}
            disabled={isSubmitting || cartItems.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 hidden lg:flex items-center justify-center gap-3"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Processing Your Order...
              </>
            ) : (
              <>
                <Package className="h-6 w-6" />
                Complete Order - Rs. {finalTotal.toFixed(2)}
              </>
            )}
          </Button>
          
          {cartItems.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <ShoppingBag className="h-12 w-12 mx-auto mb-3" />
              </div>
              <p className="text-gray-500 font-medium">
                Your cart is empty
              </p>
              <p className="text-gray-400 text-sm">
                Add items to place an order
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
