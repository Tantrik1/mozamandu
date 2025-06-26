
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { useRobustCart } from '@/hooks/useRobustCart';
import { CartSidebar } from './CartSidebar';

export function CartButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { getTotalItems } = useRobustCart();
  
  const totalItems = getTotalItems();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <ShoppingCart className="h-5 w-5" />
        {totalItems > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {totalItems}
          </Badge>
        )}
      </Button>
      <CartSidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
