import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, X, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useSubcategoryTieredPricing } from '@/hooks/useSubcategoryTieredPricing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PricingBreakdown } from '@/components/cart/PricingBreakdown';

interface SubcategoryRequirement {
  subcategoryId: string;
  subcategoryName: string;
  minimumQuantity: number;
  currentQuantity: number;
  fulfilled: boolean;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  disableModifications?: boolean;
}

export function CartDrawer({ isOpen, onClose, disableModifications = false }: CartDrawerProps) {
  const navigate = useNavigate();
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    getTotalItems,
    clearCart
  } = useRobustCart();
  
  const [subcategoryRequirements, setSubcategoryRequirements] = useState<SubcategoryRequirement[]>([]);
  const [discountTiers, setDiscountTiers] = useState<{ [key: string]: any[] }>({});

  const {
    getTotalPrice: getTieredTotalPrice,
    getItemPricing: getTieredItemPricing
  } = useSubcategoryTieredPricing({
    cartItems,
    discountTiers
  });

  useEffect(() => {
    fetchDiscountTiers();
  }, []);

  useEffect(() => {
    if (cartItems.length > 0) {
      checkSubcategoryRequirements();
    } else {
      setSubcategoryRequirements([]);
    }
  }, [cartItems]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const fetchDiscountTiers = async () => {
    try {
      const { data } = await supabase
        .from('discount_tiers')
        .select('*')
        .order('subcategory_id, min_quantity');
      
      if (data) {
        const tiersBySubcategory: { [key: string]: any[] } = {};
        data.forEach((tier: any) => {
          if (!tiersBySubcategory[tier.subcategory_id]) {
            tiersBySubcategory[tier.subcategory_id] = [];
          }
          // Support both discount_amount and discount_percentage columns
          tiersBySubcategory[tier.subcategory_id].push({
            ...tier,
            discount_amount: tier.discount_amount ?? tier.discount_percentage ?? 0
          });
        });
        setDiscountTiers(tiersBySubcategory);
      }
    } catch (error) {
      console.error('Error fetching discount tiers:', error);
    }
  };

  const checkSubcategoryRequirements = async () => {
    const subcategoryTotals: { [key: string]: number } = {};
    
    for (const item of cartItems) {
      subcategoryTotals[item.subcategoryId] = (subcategoryTotals[item.subcategoryId] || 0) + item.quantity;
    }

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

  const totalPrice = getTieredTotalPrice();
  const totalItems = getTotalItems();
  
  // MOQ bypass if total >= 1000
  const moqBypass = totalPrice >= 1000;
  const canCheckout = moqBypass || subcategoryRequirements.every(req => req.fulfilled);

  const handleCheckout = () => {
    if (!canCheckout) {
      toast({
        title: "Minimum requirements not met",
        description: "Please add more items to meet minimum quantity requirements or reach Rs. 1000 total",
        variant: "destructive",
      });
      return;
    }

    onClose();
    navigate('/checkout');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-background border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="font-semibold">Shopping Cart</h2>
            <Badge variant="secondary" className="ml-1">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Looks like you haven't added any items yet
            </p>
            <Button onClick={() => { onClose(); navigate('/shop'); }}>
              Start Shopping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {cartItems.map((item) => {
                  const pricingResult = getTieredItemPricing(item.id);
                  const pricing = pricingResult || {
                    unitsAtBase: item.quantity,
                    basePriceTotal: item.basePrice * item.quantity,
                    discountedUnits: [],
                    totalPrice: item.basePrice * item.quantity,
                    savings: 0,
                  };

                  return (
                    <div 
                      key={item.id} 
                      className="flex gap-3 p-3 rounded-xl bg-card border"
                    >
                      {/* Image */}
                      {item.imageUrl && (
                        <img 
                          src={item.imageUrl} 
                          alt={item.productName}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.productName}</h4>
                        
                        {/* Variants */}
                        {(item.colorName || item.sizeName) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.colorName && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                {item.colorName}
                              </span>
                            )}
                            {item.sizeName && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                {item.sizeName}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Price Breakdown */}
                        <div className="mt-2">
                          <PricingBreakdown
                            basePrice={item.basePrice}
                            quantity={item.quantity}
                            unitsAtBase={pricing.unitsAtBase}
                            basePriceTotal={pricing.basePriceTotal}
                            discountedUnits={pricing.discountedUnits}
                            totalPrice={pricing.totalPrice}
                            savings={pricing.savings}
                            nextTierHint={pricingResult?.subcategoryInfo?.nextTierInfo?.unitsNeeded > 0 
                              ? `Add ${pricingResult.subcategoryInfo.nextTierInfo.unitsNeeded} more for Rs.${pricingResult.subcategoryInfo.nextTierInfo.priceAtNextTier}/item`
                              : undefined}
                            compact
                          />
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border rounded-lg">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || disableModifications}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={disableModifications}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeFromCart(item.id)}
                            disabled={disableModifications}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Requirements */}
              {subcategoryRequirements.length > 0 && subcategoryRequirements.some(r => !r.fulfilled) && !moqBypass && (
                <div className="px-4 pb-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-600">Minimum Order Requirements</span>
                    </div>
                    <div className="space-y-1.5">
                      {subcategoryRequirements.map((req) => (
                        <div 
                          key={req.subcategoryId} 
                          className={cn(
                            "flex items-center justify-between text-xs",
                            req.fulfilled ? "text-green-600" : "text-amber-600"
                          )}
                        >
                          <span>{req.subcategoryName}</span>
                          <span className="font-medium">
                            {req.currentQuantity} / {req.minimumQuantity} items
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Or reach Rs. 1000 total to bypass MOQ
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="border-t p-4 space-y-4 bg-card">
              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-xl font-bold">Rs.{totalPrice.toFixed(0)}</span>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={!canCheckout || disableModifications}
                  onClick={handleCheckout}
                >
                  {disableModifications 
                    ? 'Return Home to Modify' 
                    : canCheckout 
                      ? 'Proceed to Checkout' 
                      : 'Meet Minimum Requirements'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => { onClose(); navigate('/shop'); }}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}