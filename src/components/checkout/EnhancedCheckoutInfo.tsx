
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface CartItem {
  id: string;
  productName: string;
  colorName?: string;
  sizeName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CheckoutInfoProps {
  cartItems: CartItem[];
  subtotal: number;
  deliveryCharge: number;
  promocodeDiscount: number;
  paymentPercentage: number;
}

export function EnhancedCheckoutInfo({
  cartItems,
  subtotal,
  deliveryCharge,
  promocodeDiscount,
  paymentPercentage
}: CheckoutInfoProps) {
  const total = subtotal + deliveryCharge - promocodeDiscount;
  const paidAmount = (total * paymentPercentage) / 100;
  const remainingAmount = total - paidAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium">{item.productName}</p>
                {item.colorName && (
                  <p className="text-sm text-gray-600">Color: {item.colorName}</p>
                )}
                {item.sizeName && (
                  <p className="text-sm text-gray-600">Size: {item.sizeName}</p>
                )}
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium">Rs. {item.totalPrice.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>Rs. {deliveryCharge.toFixed(2)}</span>
          </div>
          
          {promocodeDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Promo Discount</span>
              <span>-Rs. {promocodeDiscount.toFixed(2)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>Rs. {total.toFixed(2)}</span>
          </div>
          
          {paymentPercentage < 100 && (
            <>
              <div className="flex justify-between text-blue-600">
                <span>Paying Now ({paymentPercentage}%)</span>
                <span>Rs. {paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Remaining Amount</span>
                <span>Rs. {remainingAmount.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
