import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, X, AlertTriangle, Gift, Tag } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface SubcategoryRequirement {
  subcategoryId: string;
  subcategoryName: string;
  minimumQuantity: number;
  currentQuantity: number;
  fulfilled: boolean;
}

export function CartSidebar() {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    getTotalPrice,
    getTotalItems,
    getItemPricing,
    activeCombo
  } = useRobustCart();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [subcategoryRequirements, setSubcategoryRequirements] = useState<SubcategoryRequirement[]>([]);

  useEffect(() => {
    if (cartItems.length > 0) {
      checkSubcategoryRequirements();
    }
  }, [cartItems, activeCombo]);

  const checkSubcategoryRequirements = async () => {
    const subcategoryTotals: { [key: string]: number } = {};

    // Calculate totals per subcategory
    for (const item of cartItems) {
      subcategoryTotals[item.subcategoryId] = (subcategoryTotals[item.subcategoryId] || 0) + item.quantity;
    }

    // Get subcategory requirements
    const subcategoryIds = Object.keys(subcategoryTotals);
    if (subcategoryIds.length > 0) {
      const { data: subcategories } = await supabase
        .from('subcategories')
        .select('id, name, minimum_quantity')
        .in('id', subcategoryIds);

      if (subcategories) {
        const requirements = subcategories.map(sub => ({
          subcategoryId: sub.id,
          subcategoryName: sub.name,
          minimumQuantity: sub.minimum_quantity,
          currentQuantity: subcategoryTotals[sub.id] || 0,
          fulfilled: (subcategoryTotals[sub.id] || 0) >= sub.minimum_quantity
        }));

        setSubcategoryRequirements(requirements);
      }
    }
  };

  const canCheckout = subcategoryRequirements.every(req => req.fulfilled);
  const totalPrice = getTotalPrice();

  // Calculate normal total (no discounts or combos)
  const normalTotal = cartItems.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
  const savings = Math.max(0, normalTotal - totalPrice);
  // Check if any item is in discount mode (but not combo)
  const hasDiscount = cartItems.some(item => getItemPricing(item).mode === 'discount');

  const handleCheckout = () => {
    if (!canCheckout) {
      toast({
        title: "Minimum requirements not met",
        description: "Please add more items to meet minimum quantity requirements",
        variant: "destructive",
      });
      return;
    }

    setIsOpen(false);
    navigate('/checkout');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {getTotalItems() > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
            >
              {getTotalItems()}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart ({getTotalItems()} items)
          </SheetTitle>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-lg font-medium text-gray-900">Your cart is empty</p>
              <p className="text-gray-500">Add some products to get started</p>
            </div>
          </div>
        ) : (
          <>
            {/* Scrollable Content Area */}
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {/* Enhanced Active Combo Banner */}
                {activeCombo && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-5 w-5 text-green-600" />
                      <span className="font-bold text-green-800 text-lg">🎉 Combo Active!</span>
                    </div>
                    <p className="text-green-800 font-medium">{activeCombo.name}</p>
                    <p className="text-sm text-green-700 mt-1">{activeCombo.description}</p>
                    <div className="mt-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      Special combo pricing applied to eligible items
                    </div>
                  </div>
                )}

                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const pricing = getItemPricing(item);
                    const itemTotal = pricing.finalPrice * item.quantity;

                    return (
                      <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.productName}
                            className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {item.productName}
                          </h3>

                          {/* Variant Info */}
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.colorName && (
                              <span className="text-xs text-gray-500">Color: {item.colorName}</span>
                            )}
                            {item.sizeName && (
                              <span className="text-xs text-gray-500">Size: {item.sizeName}</span>
                            )}
                          </div>

                          {/* Enhanced Pricing Information */}
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-red-600">
                                Rs.{itemTotal.toFixed(2)}
                              </span>
                              {pricing.mode === 'combo' && (
                                <Badge variant="secondary" className="text-xs px-2 py-0 bg-green-100 text-green-800 border border-green-200">
                                  <Gift className="w-2 h-2 mr-1" />
                                  Combo
                                </Badge>
                              )}
                              {pricing.mode === 'discount' && (
                                <Badge variant="secondary" className="text-xs px-2 py-0 bg-blue-100 text-blue-800 border border-blue-200">
                                  <Tag className="w-2 h-2 mr-1" />
                                  MOQ Discount
                                </Badge>
                              )}
                              {pricing.mode === 'normal' && (
                                <Badge variant="outline" className="text-xs px-2 py-0 bg-gray-50 text-gray-700">
                                  Normal
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-gray-600">
                              {pricing.description}
                            </p>

                            {/* Show breakdown for discount pricing */}
                            {pricing.breakdown && pricing.breakdown.length > 1 && (
                              <div className="text-xs text-gray-500 mt-1 bg-blue-50 p-2 rounded">
                                <div className="font-medium">MOQ Discount breakdown:</div>
                                {pricing.breakdown.map((line, index) => (
                                  <div key={index} className="ml-2">• {line}</div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subcategory Requirements */}
                {subcategoryRequirements.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Minimum Requirements</h4>
                    <div className="space-y-2">
                      {subcategoryRequirements.map((req) => (
                        <div key={req.subcategoryId} className="flex items-center justify-between text-xs">
                          <span className={req.fulfilled ? 'text-green-600' : 'text-red-600'}>
                            {req.subcategoryName}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={req.fulfilled ? 'text-green-600' : 'text-red-600'}>
                              {req.currentQuantity}/{req.minimumQuantity}
                            </span>
                            {req.fulfilled ? (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Fixed Bottom Section */}
            <div className="flex-shrink-0 border-t pt-4 mt-4 space-y-4">
              {/* Enhanced Total Section */}
              <div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>Rs.{totalPrice.toFixed(2)}</span>
                </div>
                {activeCombo && savings > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                    <p className="text-sm text-green-800 font-medium flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      Combo pricing active! You have saved Rs.{savings.toFixed(2)}!
                    </p>
                  </div>
                )}
                {!activeCombo && hasDiscount && savings > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                    <p className="text-sm text-blue-800 font-medium flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      MOQ discount active! You have saved Rs.{savings.toFixed(2)}!
                    </p>
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={!canCheckout}
                onClick={handleCheckout}
              >
                {canCheckout ? 'Proceed to Checkout' : 'Minimum Requirements Not Met'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
