
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

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
}

interface SubcategoryPricingInfo {
  subcategoryId: string;
  totalQuantity: number;
  moqReached: boolean;
  moqRequired: number;
  itemBreakdown: {
    itemId: string;
    unitPrice: number;
    totalPrice: number;
    appliedTier: 'normal' | 'discount';
    tierInfo?: string;
    savings: number;
  }[];
  totalSavings: number;
  description: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
}

interface AdvancedOrderSummaryProps {
  cartItems: CartItem[];
  subcategoryPricing: { [key: string]: SubcategoryPricingInfo };
  deliveryCharge: number;
  promoCode?: PromoCode;
  promoDiscount: number;
  totalSavings: number;
  finalTotal: number;
  isSubmitting: boolean;
  onSubmitOrder: () => void;
}

export function AdvancedOrderSummary({
  cartItems,
  subcategoryPricing,
  deliveryCharge,
  promoCode,
  promoDiscount,
  totalSavings,
  finalTotal,
  isSubmitting,
  onSubmitOrder
}: AdvancedOrderSummaryProps) {
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [showAllItems, setShowAllItems] = useState(false);

  const toggleDetails = (subcategoryId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [subcategoryId]: !prev[subcategoryId]
    }));
  };

  // Generate SKU for display
  const generateDisplaySku = (item: CartItem) => {
    let sku = item.productName.substring(0, 3).toUpperCase();
    if (item.colorName) sku += `-${item.colorName.substring(0, 2).toUpperCase()}`;
    if (item.sizeName) sku += `-${item.sizeName}`;
    return sku;
  };

  // Calculate subtotal from tiered pricing
  const subtotal = Object.values(subcategoryPricing).reduce((total, subcategory) => {
    return total + subcategory.itemBreakdown.reduce((subtotal, item) => {
      return subtotal + item.totalPrice;
    }, 0);
  }, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center justify-between">
          <span>Order Summary</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllItems(!showAllItems)}
            className="lg:hidden"
          >
            {showAllItems ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Items breakdown - always visible on desktop, toggleable on mobile */}
        <div className={`space-y-4 ${!showAllItems ? 'hidden lg:block' : ''}`}>
          {Object.values(subcategoryPricing).map((subcategory) => (
            <div key={subcategory.subcategoryId} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    Subcategory ({subcategory.totalQuantity} items)
                  </h4>
                  {subcategory.moqReached && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      MOQ Reached
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleDetails(subcategory.subcategoryId)}
                >
                  {showDetails[subcategory.subcategoryId] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-gray-600 mb-3">
                {subcategory.description}
              </p>

              {showDetails[subcategory.subcategoryId] && (
                <div className="space-y-2">
                  {subcategory.itemBreakdown.map((item) => {
                    const cartItem = cartItems.find(ci => ci.id === item.itemId);
                    const displaySku = cartItem ? generateDisplaySku(cartItem) : '';
                    
                    return (
                      <div key={item.itemId} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium text-gray-900 text-sm">
                                {cartItem?.productName}
                              </h5>
                              <Badge variant="outline" className="text-xs">
                                {displaySku}
                              </Badge>
                            </div>
                            {cartItem?.colorName && (
                              <span className="text-gray-500 text-xs">Color: {cartItem.colorName}</span>
                            )}
                            {cartItem?.sizeName && (
                              <span className="text-gray-500 text-xs ml-2">Size: {cartItem.sizeName}</span>
                            )}
                            <p className="text-xs text-gray-600">
                              Qty: {cartItem?.quantity} × Rs. {item.unitPrice.toFixed(2)}
                            </p>
                            {item.tierInfo && (
                              <p className="text-xs text-blue-600 mt-1">
                                {item.tierInfo}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">
                              Rs. {item.totalPrice.toFixed(2)}
                            </p>
                            {item.savings > 0 && (
                              <p className="text-green-600 text-xs">
                                Save Rs. {item.savings.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Subcategory Total:</span>
                  <span className="font-semibold">
                    Rs. {subcategory.itemBreakdown.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                  </span>
                </div>
                {subcategory.totalSavings > 0 && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Savings:</span>
                    <span>-Rs. {subcategory.totalSavings.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Summary totals */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Delivery Charge</span>
            <span>Rs. {deliveryCharge.toFixed(2)}</span>
          </div>

          {promoCode && promoDiscount > 0 && (
            <div className="flex justify-between text-green-600 text-sm">
              <span>Promo Discount ({promoCode.code})</span>
              <span>-Rs. {promoDiscount.toFixed(2)}</span>
            </div>
          )}

          {totalSavings > 0 && (
            <div className="flex justify-between text-green-600 text-sm">
              <span>MOQ Discount Savings</span>
              <span>-Rs. {totalSavings.toFixed(2)}</span>
            </div>
          )}

          <Separator />
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>Rs. {finalTotal.toFixed(2)}</span>
          </div>

          {(totalSavings + promoDiscount) > 0 && (
            <div className="text-center text-green-600 font-medium text-sm">
              You saved Rs. {(totalSavings + promoDiscount).toFixed(2)} total!
            </div>
          )}
        </div>

        {/* Desktop place order button */}
        <Button
          onClick={onSubmitOrder}
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 hidden lg:flex"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Order...
            </>
          ) : (
            'Place Order'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
