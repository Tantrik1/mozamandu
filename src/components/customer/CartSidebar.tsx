
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRobustCart } from "@/hooks/useRobustCart";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice, getTotalItems, getItemPricing } = useRobustCart();

  const handleIncreaseQuantity = (itemId: string) => {
    const item = cartItems.find(item => item.id === itemId);
    if (item) {
      updateQuantity(itemId, item.quantity + 1);
    }
  };

  const handleDecreaseQuantity = (itemId: string) => {
    const item = cartItems.find(item => item.id === itemId);
    if (item && item.quantity > 1) {
      updateQuantity(itemId, item.quantity - 1);
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    removeFromCart(itemId);
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout-selection');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader className="space-y-2.5">
          <SheetTitle>Your Cart</SheetTitle>
          <SheetDescription>
            Review items in your cart.
          </SheetDescription>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center">
            <p className="text-gray-500">Your cart is empty.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4">
            <ul className="divide-y divide-gray-200">
              {cartItems.map((item) => {
                const pricing = getItemPricing(item);
                return (
                  <li key={item.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          {item.image_url ? (
                            <AvatarImage src={item.image_url} alt={item.productName} />
                          ) : (
                            <AvatarFallback>{item.productName.charAt(0)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-semibold">{item.productName}</h3>
                          {item.colorName && <p className="text-gray-500 text-sm">Color: {item.colorName}</p>}
                          {item.sizeName && <p className="text-gray-500 text-sm">Size: {item.sizeName}</p>}
                          <p className="text-gray-600">{pricing.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleDecreaseQuantity(item.id)}>
                          -
                        </Button>
                        <span>{item.quantity}</span>
                        <Button variant="outline" size="icon" onClick={() => handleIncreaseQuantity(item.id)}>
                          +
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFromCart(item.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right mt-2">
                      <span className="font-semibold">Rs. {(pricing.finalPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        
        {cartItems.length > 0 && (
          <div className="border-t pt-4 mt-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total: Rs. {getTotalPrice().toFixed(2)}</span>
              <span className="text-sm text-gray-600">{getTotalItems()} items</span>
            </div>
            <Button 
              onClick={handleCheckout}
              className="w-full" 
              size="lg"
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
