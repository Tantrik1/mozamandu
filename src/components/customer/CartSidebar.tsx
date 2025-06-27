
import { useState } from 'react';
import { X, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useRobustCart } from '@/hooks/useRobustCart';
import { useCartPricing } from '@/hooks/useCartPricing';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const navigate = useNavigate();
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    getTotalItems,
    activeCombo,
    discountTiers 
  } = useRobustCart();
  
  const { getTotalPrice, getItemPricing } = useCartPricing({
    cartItems,
    activeCombo,
    discountTiers
  });

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Cart ({getTotalItems()})</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const pricing = getItemPricing(item);
                return (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex items-start space-x-3">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {item.productName}
                        </h3>
                        
                        {item.colorName && (
                          <p className="text-xs text-gray-600">Color: {item.colorName}</p>
                        )}
                        
                        {item.sizeName && (
                          <p className="text-xs text-gray-600">Size: {item.sizeName}</p>
                        )}
                        
                        <p className="text-sm font-medium text-red-600 mt-1">
                          Rs. {pricing.finalPrice.toFixed(2)} each
                        </p>
                        
                        {pricing.mode !== 'normal' && (
                          <p className="text-xs text-green-600">
                            {pricing.mode === 'combo' ? 'Combo Price' : 'Discount Applied'}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="font-medium px-3">{item.quantity}</span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <span className="font-semibold">
                        Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>Rs. {getTotalPrice().toFixed(2)}</span>
            </div>
            
            <Button 
              onClick={handleCheckout}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
