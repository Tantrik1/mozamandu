
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  colorVariantId?: string;
  sizeVariantId?: string;
  inventoryId?: string;
}

export const validateCartStock = async (cartItems: CartItem[]): Promise<boolean> => {
  try {
    for (const item of cartItems) {
      if (item.inventoryId) {
        const { data: inventory, error } = await supabase
          .from('product_inventory')
          .select('available_stock')
          .eq('id', item.inventoryId)
          .single();

        if (error || !inventory) {
          throw new Error(`Product ${item.productName} not found in inventory`);
        }

        if (inventory.available_stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}. Available: ${inventory.available_stock}, Required: ${item.quantity}`);
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Stock validation error:', error);
    throw error;
  }
};

interface CheckoutValidationProps {
  cartItems: CartItem[];
  onValidationResult: (isValid: boolean, error?: string) => void;
}

export function CheckoutValidation({ cartItems, onValidationResult }: CheckoutValidationProps) {
  const { toast } = useToast();

  useEffect(() => {
    const validateStock = async () => {
      try {
        await validateCartStock(cartItems);
        onValidationResult(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Stock validation failed';
        toast({
          title: 'Stock Validation Error',
          description: errorMessage,
          variant: 'destructive',
        });
        onValidationResult(false, errorMessage);
      }
    };

    if (cartItems.length > 0) {
      validateStock();
    }
  }, [cartItems, onValidationResult, toast]);

  return null;
}
