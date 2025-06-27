
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, Gift } from 'lucide-react';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  colorVariantId?: string | null;
  sizeVariantId?: string | null;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  basePrice: number;
  subcategoryId: string;
  image_url?: string;
}

interface PricingInfo {
  finalPrice: number;
  description: string;
  mode: 'normal' | 'discount' | 'combo';
  isCombo?: boolean;
  breakdown?: string[];
}

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  minimum_order_amount: number;
}

interface OrderSummaryCardProps {
  cartItems: CartItem[];
  getItemPricing: (item: CartItem) => PricingInfo;
  subtotal: number;
  deliveryPrice: number;
  appliedPromo: PromoCode | null;
  promoDiscount: number;
  finalTotal: number;
  minimumPayment: number;
  paymentType: 'full' | 'partial';
  paidAmount: string;
  submitting: boolean;
  uploadingScreenshot: boolean;
  onSubmitOrder: () => void;
}

export function OrderSummaryCard({
  cartItems,
  getItemPricing,
  subtotal,
  deliveryPrice,
  appliedPromo,
  promoDiscount,
  finalTotal,
  minimumPayment,
  paymentType,
  paidAmount,
  submitting,
  uploadingScreenshot,
  onSubmitOrder
}: OrderSummaryCardProps) {
  // Group items by product and pricing for detailed breakdown
  const getItemBreakdown = () => {
    const breakdown: { [key: string]: { items: CartItem[], pricing: PricingInfo, totalQuantity: number, totalPrice: number }[] } = {};
    
    cartItems.forEach(item => {
      const pricing = getItemPricing(item);
      const key = `${item.productId}-${item.colorVariantId || 'no-color'}-${item.sizeVariantId || 'no-size'}`;
      const priceKey = `${pricing.finalPrice}-${pricing.mode}`;
      
      if (!breakdown[key]) {
        breakdown[key] = [];
      }
      
      const existingGroup = breakdown[key].find(group => 
        group.pricing.finalPrice === pricing.finalPrice && group.pricing.mode === pricing.mode
      );
      
      if (existingGroup) {
        existingGroup.items.push(item);
        existingGroup.totalQuantity += item.quantity;
        existingGroup.totalPrice += pricing.finalPrice * item.quantity;
      } else {
        breakdown[key].push({
          items: [item],
          pricing,
          totalQuantity: item.quantity,
          totalPrice: pricing.finalPrice * item.quantity
        });
      }
    });
    
    return breakdown;
  };

  const itemBreakdown = getItemBreakdown();

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>Review your order before placing it</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Detailed Item Breakdown */}
        {Object.entries(itemBreakdown).map(([itemKey, priceGroups]) => {
          const firstItem = priceGroups[0].items[0];
          
          return (
            <div key={itemKey} className="border-b pb-4 last:border-b-0">
              <div className="mb-3">
                <h4 className="font-medium text-lg">{firstItem.productName}</h4>
                {firstItem.colorName && <p className="text-sm text-gray-600">Color: {firstItem.colorName}</p>}
                {firstItem.sizeName && <p className="text-sm text-gray-600">Size: {firstItem.sizeName}</p>}
              </div>

              {/* Multiple Price Groups for Same Product */}
              {priceGroups.map((group, groupIndex) => {
                const totalSavings = group.pricing.finalPrice < firstItem.basePrice ? 
                  (firstItem.basePrice - group.pricing.finalPrice) * group.totalQuantity : 0;
                
                return (
                  <div key={groupIndex} className="mb-4 p-3 bg-gray-50 rounded-lg">
                    {/* Pricing Mode Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      {group.pricing.mode === 'combo' && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                          <Gift className="w-3 h-3 mr-1" />
                          Combo Applied
                        </Badge>
                      )}
                      {group.pricing.mode === 'discount' && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          MOQ Discount
                        </Badge>
                      )}
                      {group.pricing.mode === 'normal' && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                          Regular Price
                        </Badge>
                      )}
                    </div>

                    {/* Price Details */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Quantity: {group.totalQuantity}</p>
                        <p className="text-sm font-medium">Rs. {group.pricing.finalPrice.toFixed(2)} × {group.totalQuantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">Rs. {group.totalPrice.toFixed(2)}</p>
                        {group.pricing.finalPrice !== firstItem.basePrice && (
                          <p className="text-sm text-gray-500 line-through">
                            Was: Rs. {(firstItem.basePrice * group.totalQuantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    {group.pricing.breakdown && group.pricing.breakdown.length > 0 && (
                      <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                        <p className="font-medium mb-1">Price Breakdown:</p>
                        {group.pricing.breakdown.map((line, index) => (
                          <p key={index}>• {line}</p>
                        ))}
                      </div>
                    )}

                    {/* Savings */}
                    {totalSavings > 0 && (
                      <div className="text-xs text-green-600 bg-green-50 p-2 rounded mt-2 border border-green-200">
                        <p className="font-medium">You saved: Rs. {totalSavings.toFixed(2)}</p>
                        <p>Regular price would be: Rs. {(firstItem.basePrice * group.totalQuantity).toFixed(2)}</p>
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-xs text-gray-500 mt-2 italic">{group.pricing.description}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
        
        {/* Total Summary */}
        <div className="pt-4 space-y-2 bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Charge:</span>
            <span>Rs. {deliveryPrice.toFixed(2)}</span>
          </div>
          {appliedPromo && (
            <div className="flex justify-between text-green-600">
              <span>Promo Discount ({appliedPromo.discount_percentage}%):</span>
              <span>-Rs. {promoDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span>Rs. {finalTotal.toFixed(2)}</span>
          </div>
          <p className="text-sm text-gray-600">
            Minimum payment: Rs. {minimumPayment.toFixed(2)} (20%)
          </p>
        </div>

        <Button 
          onClick={onSubmitOrder} 
          disabled={submitting || uploadingScreenshot}
          className="w-full mt-6"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Placing Order...
            </>
          ) : (
            `Place Order - Rs. ${paymentType === 'full' ? finalTotal.toFixed(2) : (paidAmount ? parseFloat(paidAmount).toFixed(2) : minimumPayment.toFixed(2))}`
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center mt-2">
          By placing this order, you agree to our terms and conditions
        </p>
      </CardContent>
    </Card>
  );
}
