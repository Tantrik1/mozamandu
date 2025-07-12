
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, X, AlertTriangle, Gift, Tag } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
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
    getTotalItems, 
    activeCombo 
  } = useRobustCart();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [subcategoryRequirements, setSubcategoryRequirements] = useState<SubcategoryRequirement[]>([]);
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: any[] }>({});

  // Use tiered pricing hook
  const {
    getTotalPrice: getTieredTotalPrice,
    getItemPricing: getTieredItemPricing
  } = useSubcategoryTieredPricing({
    cartItems,
    activeCombo,
    discountTiers
  });

  useEffect(() => {
    fetchDiscountTiers();
  }, []);

  useEffect(() => {
    if (cartItems.length > 0) {
      checkSubcategoryRequirements();
    }
  }, [cartItems, activeCombo]);

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
  const totalPrice = getTieredTotalPrice();

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
                    const pricingResult = getTieredItemPricing(item.id);
                    const pricing = pricingResult || {
                      unitPrice: item.basePrice,
                      totalPrice: item.basePrice * item.quantity,
                      appliedTier: 'normal' as const,
                      savings: 0,
                      tierInfo: undefined,
                      subcategoryInfo: null
                    };
                    const itemTotal = pricing.totalPrice;

                    return (
                      <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
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
                              {pricing.appliedTier === 'discount' && (
                                <Badge variant="secondary" className="text-xs px-2 py-0 bg-blue-100 text-blue-800 border border-blue-200">
                                  <Tag className="w-2 h-2 mr-1" />
                                  MOQ Discount
                                </Badge>
                              )}
                              {pricing.appliedTier === 'normal' && (
                                <Badge variant="outline" className="text-xs px-2 py-0 bg-gray-50 text-gray-700">
                                  Normal
                                </Badge>
                              )}
                              {pricing.savings > 0 && (
                                <span className="text-xs text-green-600">
                                  Save Rs.{pricing.savings.toFixed(2)}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-xs text-gray-600">
                              Rs.{pricing.unitPrice.toFixed(2)} avg per item
                            </p>
                            
                            {/* Show tier info */}
                            {pricingResult?.tierInfo && (
                              <div className="text-xs text-gray-500 mt-1 bg-blue-50 p-2 rounded">
                                <div className="font-medium">Pricing details:</div>
                                <div className="ml-2">{pricingResult.tierInfo}</div>
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
                {activeCombo && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                    <p className="text-sm text-green-800 font-medium flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      Combo pricing active! You're saving money.
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
