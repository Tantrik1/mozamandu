
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Package, ShoppingBag } from 'lucide-react';

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

interface ItemPricingDetail {
  itemId: string;
  unitPrice: number;
  totalPrice: number;
  appliedTier: 'normal' | 'discount';
  tierInfo?: string;
  savings: number;
}

interface SubcategoryPricingInfo {
  subcategoryId: string;
  totalQuantity: number;
  moqReached: boolean;
  moqRequired: number;
  itemBreakdown: ItemPricingDetail[];
  totalSavings: number;
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
  getTieredItemPricing: (itemId: string) => any;
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
  // Calculate subtotal using exact same logic as cart
  const subtotal = Object.values(subcategoryPricing).reduce((total, subcategory) => {
    return total + subcategory.itemBreakdown.reduce((subtotal, item) => {
      return subtotal + item.totalPrice;
    }, 0);
  }, 0);

  // Get item pricing details using EXACT same function as cart
  const getItemPricingDetails = (item: CartItem) => {
    return getTieredItemPricing(item.id);
  };

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
        {/* Cart Items Display - Clean and focused */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 text-sm">
            Items ({cartItems.length})
          </h3>
          
          {cartItems.map((item) => {
            const pricingInfo = getItemPricingDetails(item);
            const pricing = pricingInfo || {
              unitPrice: item.basePrice,
              totalPrice: item.basePrice * item.quantity,
              appliedTier: 'normal' as const,
              savings: 0,
              tierInfo: undefined,
              subcategoryInfo: null
            };
            const totalItemPrice = pricing.totalPrice;
            const savings = pricing.savings || 0;
            
            return (
              <div key={item.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
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
                    {/* Product Info */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                          {item.productName}
                        </h4>
                        
                        {/* Compact variant details */}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                          {item.colorName && (
                            <span className="bg-white px-2 py-1 rounded-md border">
                              {item.colorName}
                            </span>
                          )}
                          {item.sizeName && (
                            <span className="bg-white px-2 py-1 rounded-md border">
                              {item.sizeName}
                            </span>
                          )}
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-200">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        
                        {/* Pricing details - Clean format */}
                        {pricing.tierInfo && (
                          <div className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded-md border border-blue-100">
                            <div className="font-medium mb-1">Pricing:</div>
                            <div>{pricing.tierInfo}</div>
                          </div>
                        )}
                        
                        {/* Price per item */}
                        <div className="text-xs text-gray-600">
                          Rs. {pricing.unitPrice.toFixed(2)} avg per item
                        </div>
                      </div>
                      
                      {/* Price and Savings - Right aligned */}
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-lg text-gray-900 mb-1">
                          Rs. {totalItemPrice.toFixed(2)}
                        </div>
                        {savings > 0 && (
                          <div className="text-sm text-green-600 font-medium">
                            Save Rs. {savings.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator className="my-6" />

        {/* Summary totals - Clean and focused */}
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
                Great choice! You're getting the best price.
              </div>
            </div>
          )}
        </div>

        {/* Place order button - Prominent and conversion-focused */}
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
