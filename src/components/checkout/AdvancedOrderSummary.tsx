
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, Star, Package, TrendingDown } from 'lucide-react';

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

interface SubcategoryPricingInfo {
  subcategoryId: string;
  totalQuantity: number;
  moqReached: boolean;
  moqRequired: number;
  comboActive: boolean;
  comboPrice?: number;
  itemBreakdown: {
    itemId: string;
    unitPrice: number;
    totalPrice: number;
    appliedTier: 'normal' | 'discount' | 'combo';
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

interface ComboInfo {
  combo: {
    id: string;
    name: string;
    description: string;
  };
  affectedSubcategories: SubcategoryPricingInfo[];
  totalComboSavings: number;
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
  comboInfo?: ComboInfo | null;
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
  onSubmitOrder,
  comboInfo
}: AdvancedOrderSummaryProps) {
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [showAllItems, setShowAllItems] = useState(true);

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

  // Calculate subtotal directly using the tiered pricing from subcategoryPricing
  const calculatedSubtotal = Object.values(subcategoryPricing).reduce((total, subcategory) => {
    return total + subcategory.itemBreakdown.reduce((subtotal, item) => {
      return subtotal + item.totalPrice;
    }, 0);
  }, 0);

  // Use the calculated subtotal to match cart pricing exactly
  const subtotal = calculatedSubtotal;

  // Check pricing modes
  const hasActualCombo = comboInfo && Object.values(subcategoryPricing).some(sub => sub.comboActive);
  const hasMOQDiscounts = Object.values(subcategoryPricing).some(sub => 
    sub.moqReached && !sub.comboActive && sub.totalSavings > 0
  );

  // Get item pricing details from subcategory pricing
  const getItemPricingDetails = (item: CartItem) => {
    const pricingInfo = Object.values(subcategoryPricing)
      .find(sub => sub.itemBreakdown.some(breakdown => breakdown.itemId === item.id))
      ?.itemBreakdown.find(breakdown => breakdown.itemId === item.id);
    
    return pricingInfo;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Order Summary</span>
            {hasActualCombo && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                <Star className="h-3 w-3 mr-1" />
                Combo Active
              </Badge>
            )}
            {hasMOQDiscounts && !hasActualCombo && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                <TrendingDown className="h-3 w-3 mr-1" />
                MOQ Discount
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllItems(!showAllItems)}
            className="lg:hidden"
          >
            {showAllItems ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </CardTitle>

        {/* Combo/MOQ Banner */}
        {hasActualCombo && comboInfo && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
            <div className="flex items-center space-x-2 mb-1">
              <Star className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-purple-800">{comboInfo.combo.name}</span>
            </div>
            <p className="text-sm text-purple-700">{comboInfo.combo.description}</p>
            <p className="text-xs text-purple-600 mt-1">
              Total combo savings: Rs. {comboInfo.totalComboSavings.toFixed(2)}
            </p>
          </div>
        )}
        {hasMOQDiscounts && !hasActualCombo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-800">MOQ Discount Applied</span>
            </div>
            <p className="text-sm text-green-700">
              You've reached the minimum order quantity for discounted pricing!
            </p>
            <p className="text-xs text-green-600 mt-1">
              Total MOQ savings: Rs. {totalSavings.toFixed(2)}
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Cart Items Display */}
        <div className={`space-y-4 ${!showAllItems ? 'hidden lg:block' : ''}`}>
          <h3 className="font-medium text-gray-900 text-sm mb-3">
            Items in Your Order ({cartItems.length})
          </h3>
          
          {cartItems.map((item) => {
            const pricingInfo = getItemPricingDetails(item);
            const displaySku = generateDisplaySku(item);
            const currentPrice = pricingInfo?.unitPrice || item.unitPrice;
            const totalItemPrice = pricingInfo?.totalPrice || (item.unitPrice * item.quantity);
            const savings = pricingInfo?.savings || 0;
            
            return (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {/* Product Image */}
                  {item.imageUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={item.imageUrl} 
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    {/* Product Name and SKU */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm mb-1">{item.productName}</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{displaySku}</Badge>
                          {pricingInfo?.appliedTier === 'combo' && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Combo Price
                            </Badge>
                          )}
                          {pricingInfo?.appliedTier === 'discount' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              MOQ Discount
                            </Badge>
                          )}
                        </div>
                        
                        {/* Variant Details */}
                        <div className="text-xs text-gray-600 space-y-1">
                          {item.colorName && <div>Color: {item.colorName}</div>}
                          {item.sizeName && <div>Size: {item.sizeName}</div>}
                        </div>
                        
                        {/* Pricing Details with proper MOQ breakdown */}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">Qty: {item.quantity}</span>
                            {pricingInfo?.tierInfo && (
                              <span className="text-xs text-blue-600 ml-2">
                                {pricingInfo.tierInfo}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-900">Total: Rs. {totalItemPrice.toFixed(2)}</span>
                            {savings > 0 && (
                              <span className="text-xs text-green-600 ml-2">
                                (Save Rs. {savings.toFixed(2)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Price and Savings */}
                      <div className="text-right ml-4">
                        <p className="font-semibold text-sm text-gray-900">
                          Rs. {totalItemPrice.toFixed(2)}
                        </p>
                        {savings > 0 && (
                          <p className={`text-xs ${
                            pricingInfo?.appliedTier === 'combo' ? 'text-purple-600' : 'text-green-600'
                          }`}>
                            Save Rs. {savings.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Summary totals using correct subtotal from tiered pricing calculation */}
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
            <div className={`flex justify-between text-sm ${
              hasActualCombo ? 'text-purple-600' : 'text-green-600'
            }`}>
              <span>{hasActualCombo ? 'Combo Savings' : 'MOQ Discount Savings'}</span>
              <span>-Rs. {totalSavings.toFixed(2)}</span>
            </div>
          )}

          <Separator />
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>Rs. {finalTotal.toFixed(2)}</span>
          </div>

          {(totalSavings + promoDiscount) > 0 && (
            <div className={`text-center font-medium text-sm ${
              hasActualCombo ? 'text-purple-600' : 'text-green-600'
            }`}>
              You saved Rs. {(totalSavings + promoDiscount).toFixed(2)} total!
              {hasActualCombo ? ' (includes combo savings)' : ' (includes MOQ discounts)'}
            </div>
          )}
        </div>

        {/* Desktop place order button */}
        <div className="space-y-4">
          <Button
            onClick={onSubmitOrder}
            disabled={isSubmitting || cartItems.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 text-lg hidden lg:flex"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing Order...
              </>
            ) : (
              <>
                <Package className="mr-2 h-5 w-5" />
                Place Order - Rs. {finalTotal.toFixed(2)}
              </>
            )}
          </Button>
          
          {cartItems.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              Your cart is empty. Add items to place an order.
            </p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
