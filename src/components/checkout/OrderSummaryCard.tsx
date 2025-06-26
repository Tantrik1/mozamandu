
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
          return (
            <div key={item.id} className="flex justify-between items-center py-2 border-b">
              <div>
                <h4 className="font-medium">{item.productName}</h4>
                {item.colorName && <p className="text-sm text-gray-600">Color: {item.colorName}</p>}
                {item.sizeName && <p className="text-sm text-gray-600">Size: {item.sizeName}</p>}
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                {pricing.mode !== 'normal' && (
                  <p className="text-xs text-green-600">{pricing.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-medium">Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}</p>
                {pricing.finalPrice < item.basePrice && (
                  <p className="text-xs text-gray-500 line-through">Rs. {(item.basePrice * item.quantity).toFixed(2)}</p>
                )}
              </div>
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
