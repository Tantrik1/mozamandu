import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { supabase } from '@/integrations/supabase/client';

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
  sku?: string;
  inventoryId?: string;
  addedOrder: number;
}

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  description?: string;
}

interface TieredOrderSummaryCardProps {
  cartItems: CartItem[];
  deliveryCharge: number;
  promoCode?: PromoCode;
  promoDiscount: number;
  totalSavings: number;
  finalTotal: number;
  isSubmitting: boolean;
  paymentScreenshotUrl?: string;
  onSubmitOrder: () => void;
}

export function TieredOrderSummaryCard({
  cartItems,
  deliveryCharge,
  promoCode,
  promoDiscount,
  totalSavings,
  finalTotal,
  isSubmitting,
  paymentScreenshotUrl,
  onSubmitOrder
}: TieredOrderSummaryCardProps) {
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: any[] }>({});
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [showScreenshot, setShowScreenshot] = useState(false);

  const {
    subcategoryPricing,
    getTotalPrice,
    getTotalSavings
  } = useSubcategoryTieredPricing({
    cartItems,
    discountTiers
  });

  useEffect(() => {
    fetchDiscountTiers();
  }, []);

  const fetchDiscountTiers = async () => {
    try {
      const { data } = await supabase
        .from('discount_tiers')
        .select('*')
        .order('subcategory_id, min_quantity');
      
      if (data) {
        const tiersBySubcategory: { [key: string]: any[] } = {};
        data.forEach(tier => {
          if (!tiersBySubcategory[tier.subcategory_id]) {
            tiersBySubcategory[tier.subcategory_id] = [];
          }
          tiersBySubcategory[tier.subcategory_id].push(tier);
        });
        setDiscountTiers(tiersBySubcategory);
      }
    } catch (error) {
      console.error('Error fetching discount tiers:', error);
    }
  };

  const toggleDetails = (subcategoryId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [subcategoryId]: !prev[subcategoryId]
    }));
  };

  const subtotal = getTotalPrice();
  const totalTieredSavings = getTotalSavings();

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
        
        {/* Tiered Pricing Breakdown by Subcategory */}
        <div className="space-y-4">
          {Object.values(subcategoryPricing).map((subcategory) => (
            <div key={subcategory.subcategoryId} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900">
                    Subcategory Items ({subcategory.totalQuantity} total)
                  </h4>
                  {subcategory.moqReached && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
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
              
              <p className="text-sm text-gray-600 mb-3">
                {subcategory.description}
              </p>

              {showDetails[subcategory.subcategoryId] && (
                <div className="space-y-2">
                  {subcategory.itemBreakdown.map((item, index) => {
                    const cartItem = cartItems.find(ci => ci.id === item.itemId);
                    return (
                      <div key={item.itemId} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">
                              {cartItem?.productName}
                              {cartItem?.colorName && (
                                <span className="text-gray-500"> - {cartItem.colorName}</span>
                              )}
                              {cartItem?.sizeName && (
                                <span className="text-gray-500"> - {cartItem.sizeName}</span>
                              )}
                            </h5>
                            <p className="text-xs text-gray-600">
                              Quantity: {cartItem?.quantity}
                            </p>
                            {item.tierInfo && (
                              <p className="text-xs text-blue-600 mt-1">
                                {item.tierInfo}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
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
                <div className="flex justify-between">
                  <span className="font-medium">Subcategory Total:</span>
                  <span className="font-semibold">
                    Rs. {subcategory.itemBreakdown.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                  </span>
                </div>
                {subcategory.totalSavings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Subcategory Savings:</span>
                    <span>Rs. {subcategory.totalSavings.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Summary Section */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Delivery Charge</span>
            <span>Rs. {deliveryCharge.toFixed(2)}</span>
          </div>

          {promoCode && promoDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Promo Discount ({promoCode.code})</span>
              <span>-Rs. {promoDiscount.toFixed(2)}</span>
            </div>
          )}

          {totalTieredSavings > 0 && (
            <div className="flex justify-between text-green-600">
              <span>MOQ Discount Savings</span>
              <span>-Rs. {totalTieredSavings.toFixed(2)}</span>
            </div>
          )}

          <Separator />
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>Rs. {finalTotal.toFixed(2)}</span>
          </div>

          {(totalTieredSavings + promoDiscount) > 0 && (
            <div className="text-center text-green-600 font-medium">
              You saved Rs. {(totalTieredSavings + promoDiscount).toFixed(2)} total!
            </div>
          )}
        </div>

        {paymentScreenshotUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment Screenshot</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScreenshot(!showScreenshot)}
              >
                {showScreenshot ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {showScreenshot && (
              <img
                src={paymentScreenshotUrl}
                alt="Payment Screenshot"
                className="w-full h-auto rounded border"
              />
            )}
          </div>
        )}

        <Button
          onClick={onSubmitOrder}
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
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
