
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, Trash2, Info } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useCartPricing } from '@/hooks/useCartPricing';
import { useComboManager } from '@/hooks/useComboManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function CartSidebar() {
  const { cartItems, updateQuantity, removeFromCart, getTotalItems } = useRobustCart();
  const { activeCombo } = useComboManager({ cartItems });
  const [discountTiers, setDiscountTiers] = useState<{[key: string]: any[]}>({});
  const { getItemPricing, getTotalPrice } = useCartPricing({
    cartItems,
    activeCombo,
    discountTiers
  });

  useEffect(() => {
    fetchDiscountTiers();
  }, [cartItems]);

  const fetchDiscountTiers = async () => {
    const subcategoryIds = [...new Set(cartItems.map(item => item.subcategoryId))];
    const allTiers: {[key: string]: any[]} = {};

    for (const subcategoryId of subcategoryIds) {
      try {
        const { data } = await supabase
          .from('discount_tiers')
          .select('*')
          .eq('subcategory_id', subcategoryId)
          .order('min_quantity');
        
        allTiers[subcategoryId] = data || [];
      } catch (error) {
        console.error('Error fetching discount tiers:', error);
      }
    }

    setDiscountTiers(allTiers);
  };

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <ShoppingCart className="h-4 w-4" />
          {totalItems > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({totalItems} items)
          </SheetTitle>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Your cart is empty</p>
            <p className="text-sm text-gray-400">Add some products to get started</p>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* Combo Status */}
            {activeCombo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">Combo Active</Badge>
                </div>
                <p className="text-sm text-green-700 mt-1">{activeCombo.name}</p>
                <p className="text-xs text-green-600">{activeCombo.description}</p>
              </div>
            )}

            {/* Cart Items */}
            <div className="space-y-4">
              {cartItems.map((item) => {
                const pricing = getItemPricing(item);
                
                return (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex gap-3">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.productName}</h4>
                        {item.colorName && (
                          <p className="text-xs text-gray-500">Color: {item.colorName}</p>
                        )}
                        {item.sizeName && (
                          <p className="text-xs text-gray-500">Size: {item.sizeName}</p>
                        )}
                      </div>
                    </div>

                    {/* Pricing Display */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">
                            Rs. {pricing.finalPrice.toFixed(2)} each
                          </span>
                          {pricing.mode !== 'normal' && (
                            <span className="text-xs text-gray-500 line-through">
                              Rs. {item.basePrice.toFixed(2)}
                            </span>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Info className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Pricing Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2">
                                <p className="text-sm">{pricing.description}</p>
                                {pricing.breakdown && (
                                  <div className="space-y-1">
                                    {pricing.breakdown.map((item, index) => (
                                      <p key={index} className="text-xs text-gray-600">{item}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        {pricing.mode !== 'normal' && (
                          <Badge variant={pricing.mode === 'combo' ? 'default' : 'secondary'} className="text-xs">
                            {pricing.mode === 'combo' ? 'Combo' : 'Discount'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>Rs. {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Link to="/checkout">
              <Button className="w-full" size="lg">
                Proceed to Checkout
              </Button>
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
