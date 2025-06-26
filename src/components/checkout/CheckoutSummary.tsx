
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useRobustCart } from '@/hooks/useRobustCart';

export function CheckoutSummary() {
  const { cartItems, getItemPricing, getTotalPrice } = useRobustCart();

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {cartItems.map((item) => {
            const pricing = getItemPricing(item);
            return (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.productName}</h4>
                    {item.colorName && (
                      <p className="text-sm text-gray-600">Color: {item.colorName}</p>
                    )}
                    {item.sizeName && (
                      <p className="text-sm text-gray-600">Size: {item.sizeName}</p>
                    )}
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {pricing.description}
                </div>
                {item !== cartItems[cartItems.length - 1] && <Separator />}
              </div>
            );
          })}
          
          <Separator />
          
          <div className="flex justify-between font-bold">
            <span>Subtotal</span>
            <span>Rs. {getTotalPrice().toFixed(2)}</span>
          </div>
          
          <p className="text-sm text-gray-600">
            * Delivery charges and final total will be calculated in the next step
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
