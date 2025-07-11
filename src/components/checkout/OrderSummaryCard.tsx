
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Tag, Gift, Package } from 'lucide-react';
import { PaymentScreenshotViewer } from '@/components/admin/PaymentScreenshotViewer';

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
  sku?: string; // Added SKU field
  inventoryId?: string; // Added inventory ID field
}

interface PricingInfo {
  finalPrice: number;
  description: string;
  mode: 'normal' | 'discount' | 'combo';
  isCombo?: boolean;
  breakdown?: string[];
  savings?: number;
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
  paymentScreenshotUrl?: string;
  orderNumber?: string;
  customerName?: string;
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
  onSubmitOrder,
  paymentScreenshotUrl,
  orderNumber,
  customerName
}: OrderSummaryCardProps) {
  // Group items for better organization and pricing display
  const getItemGroups = () => {
    const groups: { [key: string]: { items: CartItem[], pricing: PricingInfo, totalQuantity: number, totalPrice: number }[] } = {};
    
    cartItems.forEach(item => {
      const pricing = getItemPricing(item);
      const groupKey = `${item.productId}-${item.colorVariantId || 'no-color'}-${item.sizeVariantId || 'no-size'}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      const existingGroup = groups[groupKey].find(group => 
        group.pricing.finalPrice === pricing.finalPrice && 
        group.pricing.mode === pricing.mode
      );
      
      if (existingGroup) {
        existingGroup.items.push(item);
        existingGroup.totalQuantity += item.quantity;
        existingGroup.totalPrice += pricing.finalPrice * item.quantity;
      } else {
        groups[groupKey].push({
          items: [item],
          pricing,
          totalQuantity: item.quantity,
          totalPrice: pricing.finalPrice * item.quantity
        });
      }
    });
    
    return groups;
  };

  const itemGroups = getItemGroups();
  const totalSavings = cartItems.reduce((total, item) => {
    const pricing = getItemPricing(item);
    return total + ((pricing.savings || 0) * item.quantity);
  }, 0);

  return (
    <Card className="sticky top-4 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5 text-blue-600" />
          Order Summary
        </CardTitle>
        <CardDescription>
          Review your {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} before placing the order
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Items Breakdown */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(itemGroups).map(([groupKey, priceGroups]) => {
            const firstItem = priceGroups[0].items[0];
            
            return (
              <div key={groupKey} className="border-b border-gray-100 pb-4 last:border-b-0">
                {/* Product Header */}
                <div className="flex items-start gap-3 mb-3">
                  {firstItem.image_url && (
                    <img
                      src={firstItem.image_url}
                      alt={firstItem.productName}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                      {firstItem.productName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {firstItem.colorName && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {firstItem.colorName}
                        </Badge>
                      )}
                      {firstItem.sizeName && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          {firstItem.sizeName}
                        </Badge>
                      )}
                      {firstItem.sku && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 font-mono">
                          {firstItem.sku}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price Groups for Same Product */}
                {priceGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="ml-15 mb-3 p-3 bg-gray-50 rounded-lg">
                    {/* Pricing Mode Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {group.pricing.mode === 'combo' && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <Gift className="w-3 h-3 mr-1" />
                            Combo Deal
                          </Badge>
                        )}
                        {group.pricing.mode === 'discount' && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            Volume Discount
                          </Badge>
                        )}
                        {group.pricing.mode === 'normal' && (
                          <Badge variant="outline" className="text-xs">
                            Regular Price
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-600">
                        Qty: {group.totalQuantity}
                      </span>
                    </div>

                    {/* Price Details */}
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Rs. {group.pricing.finalPrice.toFixed(2)} × {group.totalQuantity}
                        </p>
                        {group.pricing.savings && group.pricing.savings > 0 && (
                          <p className="text-xs text-green-600">
                            Save Rs. {(group.pricing.savings * group.totalQuantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">
                          Rs. {group.totalPrice.toFixed(2)}
                        </p>
                        {group.pricing.savings && group.pricing.savings > 0 && (
                          <p className="text-xs text-gray-500 line-through">
                            Was: Rs. {((group.pricing.finalPrice + group.pricing.savings) * group.totalQuantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    {group.pricing.breakdown && group.pricing.breakdown.length > 0 && (
                      <div className="text-xs text-gray-600 bg-white p-2 rounded border mt-2">
                        <p className="font-medium mb-1">Price Details:</p>
                        {group.pricing.breakdown.map((line, index) => (
                          <p key={index} className="leading-relaxed">• {line}</p>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-xs text-gray-500 mt-2 italic">
                      {group.pricing.description}
                    </p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        
        {/* Order Totals */}
        <div className="border-t border-gray-200 pt-4">
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items):</span>
              <span className="font-medium">Rs. {subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Charge:</span>
              <span className="font-medium">Rs. {deliveryPrice.toFixed(2)}</span>
            </div>
            
            {appliedPromo && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Promo Discount ({appliedPromo.discount_percentage}%):</span>
                <span className="font-medium">-Rs. {promoDiscount.toFixed(2)}</span>
              </div>
            )}
            
            {totalSavings > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Volume/Combo Savings:</span>
                <span className="font-medium">-Rs. {totalSavings.toFixed(2)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-blue-600">Rs. {finalTotal.toFixed(2)}</span>
            </div>
            
            <p className="text-xs text-gray-600 text-center">
              Minimum payment: Rs. {minimumPayment.toFixed(2)} (20% of total)
            </p>
          </div>
        </div>

        {/* Payment Screenshot */}
        {paymentScreenshotUrl && orderNumber && customerName && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-semibold mb-3 text-sm">Payment Screenshot</h4>
            <div className="flex justify-center">
              <PaymentScreenshotViewer
                imageUrl={paymentScreenshotUrl}
                orderNumber={orderNumber}
                customerName={customerName}
              />
            </div>
          </div>
        )}

        {/* Place Order Button */}
        <Button 
          onClick={onSubmitOrder} 
          disabled={submitting || uploadingScreenshot}
          className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 transition-colors duration-200"
          size="lg"
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Placing Order...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Place Order - Rs. {paymentType === 'full' ? finalTotal.toFixed(2) : (paidAmount ? parseFloat(paidAmount).toFixed(2) : minimumPayment.toFixed(2))}
            </div>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center mt-2">
          By placing this order, you agree to our terms and conditions
        </p>
      </CardContent>
    </Card>
  );
}
