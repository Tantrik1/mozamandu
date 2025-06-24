
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, X, AlertTriangle, Gift } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
    getItemPrice, 
    activeCombo 
  } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [subcategoryRequirements, setSubcategoryRequirements] = useState<SubcategoryRequirement[]>([]);
  const [cartTotal, setCartTotal] = useState(0);

  useEffect(() => {
    if (cartItems.length > 0) {
      checkSubcategoryRequirements();
      updateCartTotal();
    } else {
      setCartTotal(0);
    }
  }, [cartItems, activeCombo]);

  const updateCartTotal = async () => {
    try {
      const total = await getTotalPrice();
      setCartTotal(total);
    } catch (error) {
      console.error('Error calculating total:', error);
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
      
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart ({getTotalItems()} items)
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-lg font-medium text-gray-900">Your cart is empty</p>
              <p className="text-gray-500">Add some products to get started</p>
            </div>
          ) : (
            <>
              {/* Active Combo Banner */}
              {activeCombo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Combo Active!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">{activeCombo.name}</p>
                  <p className="text-xs text-green-600">{activeCombo.description}</p>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cartItems.map((item) => (
                  <CartItemCard 
                    key={item.id} 
                    item={item} 
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                    getItemPrice={getItemPrice}
                  />
                ))}
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

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                {activeCombo && (
                  <p className="text-sm text-green-600 mt-1">🎉 Combo pricing applied!</p>
                )}
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full bg-red-600 hover:bg-red-700" 
                disabled={!canCheckout}
                onClick={() => {
                  if (!canCheckout) {
                    toast({
                      title: "Minimum requirements not met",
                      description: "Please add more items to meet minimum quantity requirements",
                      variant: "destructive",
                    });
                  }
                }}
              >
                {canCheckout ? 'Proceed to Checkout' : 'Minimum Requirements Not Met'}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CartItemCard({ 
  item, 
  onUpdateQuantity, 
  onRemove, 
  getItemPrice 
}: { 
  item: any;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  getItemPrice: (subcategoryId: string, quantity: number) => Promise<any>;
}) {
  const [itemPrice, setItemPrice] = useState(item.price);
  const [priceLabel, setPriceLabel] = useState('');

  useEffect(() => {
    updateItemPrice();
  }, [item.quantity, item.subcategoryId]);

  const updateItemPrice = async () => {
    try {
      const pricing = await getItemPrice(item.subcategoryId, item.quantity);
      setItemPrice(pricing.finalPrice);
      
      if (pricing.inCombo) {
        setPriceLabel('Combo');
      } else if (pricing.appliedDiscount) {
        setPriceLabel('Discount');
      } else {
        setPriceLabel('');
      }
    } catch (error) {
      console.error('Error updating item price:', error);
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      {item.image_url && (
        <img 
          src={item.image_url} 
          alt={item.productName}
          className="w-12 h-12 object-cover rounded-md"
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {item.productName}
        </h3>
        {item.colorName && (
          <p className="text-xs text-gray-500">Color: {item.colorName}</p>
        )}
        {item.sizeName && (
          <p className="text-xs text-gray-500">Size: {item.sizeName}</p>
        )}
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-red-600">${itemPrice.toFixed(2)}</p>
          {priceLabel && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              {priceLabel}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          disabled={item.quantity <= 1}
          className="h-7 w-7 p-0"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="h-7 w-7 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
