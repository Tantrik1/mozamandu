
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
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>Review your order before placing it</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cartItems.map((item) => {
          const pricing = getItemPricing(item);
          const totalSavings = pricing.finalPrice < item.basePrice ? (item.basePrice - pricing.finalPrice) * item.quantity : 0;
          
          return (
            <div key={item.id} className="border-b pb-4 last:border-b-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="font-medium">{item.productName}</h4>
                  {item.colorName && <p className="text-sm text-gray-600">Color: {item.colorName}</p>}
                  {item.sizeName && <p className="text-sm text-gray-600">Size: {item.sizeName}</p>}
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-lg">Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Rs. {pricing.finalPrice.toFixed(2)} × {item.quantity}</p>
                </div>
              </div>

              {/* Pricing mode indicator */}
              <div className="mb-2">
                {pricing.mode === 'combo' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    <Gift className="w-3 h-3 mr-1" />
                    Combo Applied
                  </Badge>
                )}
                {pricing.mode === 'discount' && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    MOQ Discount
                  </Badge>
                )}
                {pricing.mode === 'normal' && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                    Regular Price
                  </Badge>
                )}
              </div>

              {/* Detailed breakdown */}
              {pricing.breakdown && pricing.breakdown.length > 0 && (
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <p className="font-medium mb-1">Price Breakdown:</p>
                  {pricing.breakdown.map((line, index) => (
                    <p key={index}>• {line}</p>
                  ))}
                </div>
              )}

              {/* Savings indicator */}
              {totalSavings > 0 && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded mt-2">
                  <p className="font-medium">You saved: Rs. {totalSavings.toFixed(2)}</p>
                  <p>Original price: Rs. {(item.basePrice * item.quantity).toFixed(2)}</p>
                </div>
              )}

              {/* Pricing description */}
              <p className="text-xs text-gray-500 mt-1">{pricing.description}</p>
            </div>
          );
        })}
        
        <div className="pt-4 space-y-2">
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
