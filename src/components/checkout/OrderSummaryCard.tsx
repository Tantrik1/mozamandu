
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

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
  onSubmitOrder: () => Promise<void>;
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
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-3">
          {cartItems.map((item) => {
            const pricing = getItemPricing(item);
            return (
              <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-100">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{item.productName}</h4>
                  <div className="flex gap-2 text-xs text-gray-600 mt-1">
                    {item.colorName && <span>Color: {item.colorName}</span>}
                    {item.sizeName && <span>Size: {item.sizeName}</span>}
                    <span>Qty: {item.quantity}</span>
                  </div>
                  {pricing.mode !== 'normal' && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {pricing.description}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}</p>
                  <p className="text-xs text-gray-600">Rs. {pricing.finalPrice.toFixed(2)} each</p>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Pricing Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Delivery Charge</span>
            <span>Rs. {deliveryPrice.toFixed(2)}</span>
          </div>
          {appliedPromo && promoDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Promo Discount ({appliedPromo.code})</span>
              <span>-Rs. {promoDiscount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>Rs. {finalTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Information */}
        {paymentType === 'partial' && (
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Paying Now</span>
              <span className="font-medium">Rs. {parseFloat(paidAmount || '0').toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Remaining Amount</span>
              <span className="font-medium text-orange-600">
                Rs. {(finalTotal - parseFloat(paidAmount || '0')).toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Minimum payment: Rs. {minimumPayment.toFixed(2)} (20% of total)
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={onSubmitOrder}
          disabled={submitting || uploadingScreenshot}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          size="lg"
        >
          {submitting || uploadingScreenshot ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadingScreenshot ? 'Uploading Screenshot...' : 'Placing Order...'}
            </>
          ) : (
            `Place Order - Rs. ${paymentType === 'full' ? finalTotal.toFixed(2) : parseFloat(paidAmount || '0').toFixed(2)}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
