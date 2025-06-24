
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, X, Gift } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useState, useEffect } from 'react';

export function CartSidebar() {
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    getTotalPrice, 
    getTotalItems, 
    activeCombo 
  } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);

  useEffect(() => {
    if (cartItems.length > 0) {
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
                  />
                ))}
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>Rs. {cartTotal.toFixed(2)}</span>
                </div>
                {activeCombo && (
                  <p className="text-sm text-green-600 mt-1">🎉 Combo pricing applied!</p>
                )}
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={() => {
                  // Checkout logic here
                }}
              >
                Proceed to Checkout
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
  onRemove
}: { 
  item: any;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}) {
  const getPricingBadgeStyle = () => {
    if (item.pricingDescription?.includes('Combo')) {
      return 'border-green-500 text-green-700 bg-green-50';
    } else if (item.pricingDescription?.includes('Next')) {
      return 'border-blue-500 text-blue-700 bg-blue-50';
    } else {
      return 'border-gray-500 text-gray-700 bg-gray-50';
    }
  };

  const getPriceColor = () => {
    if (item.pricingDescription?.includes('Combo')) {
      return 'text-green-600';
    } else if (item.pricingDescription?.includes('Next')) {
      return 'text-blue-600';
    } else {
      return 'text-gray-900';
    }
  };

  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
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
        {item.colorName && (
          <p className="text-xs text-gray-500">Color: {item.colorName}</p>
        )}
        {item.sizeName && (
          <p className="text-xs text-gray-500">Size: {item.sizeName}</p>
        )}
        
        {/* Pricing Description */}
        {item.pricingDescription && (
          <div className="mt-2">
            <Badge 
              variant="outline" 
              className={`text-xs px-2 py-1 ${getPricingBadgeStyle()}`}
            >
              {item.pricingDescription}
            </Badge>
          </div>
        )}
        
        {/* Quantity Controls */}
        <div className="flex items-center justify-between mt-3">
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
            <span className="text-sm font-medium w-6 text-center">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              className="h-7 w-7 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Subtotal and Remove */}
          <div className="flex items-center space-x-2">
            <p className={`text-sm font-bold ${getPriceColor()}`}>
              Rs. {item.subtotal?.toFixed(2) || '0.00'}
            </p>
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
      </div>
    </div>
  );
}
