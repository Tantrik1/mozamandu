import { useState, useEffect } from 'react';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import { toast } from '@/hooks/use-toast';

interface ValidationItem {
  productId: string;
  productName: string;
  colorVariantId?: string;
  sizeVariantId?: string;
  quantity: number;
  availableStock: number;
}

interface CheckoutValidationProps {
  cartItems: any[];
  onValidationComplete: (isValid: boolean, items: ValidationItem[]) => void;
}

export function CheckoutValidation({ cartItems, onValidationComplete }: CheckoutValidationProps) {
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    validateStock();
  }, [cartItems]);

  const validateStock = async () => {
    if (!cartItems.length) {
      onValidationComplete(true, []);
      return;
    }

    setIsValidating(true);
    const validationItems: ValidationItem[] = [];
    let hasIssues = false;

    try {
      for (const item of cartItems) {
        // Get stock from inventory system instead of variant tables
        const availableStock = await getInventoryStock(
          item.product_id,
          item.color_variant_id,
          item.size_variant_id
        );

        const validationItem: ValidationItem = {
          productId: item.product_id,
          productName: item.product_name || 'Unknown Product',
          colorVariantId: item.color_variant_id,
          sizeVariantId: item.size_variant_id,
          quantity: item.quantity,
          availableStock: availableStock
        };

        validationItems.push(validationItem);

        if (availableStock < item.quantity) {
          hasIssues = true;
          toast({
            title: 'Stock Issue',
            description: `${item.product_name} has only ${availableStock} units available, but you requested ${item.quantity}`,
            variant: 'destructive',
          });
        }
      }

      onValidationComplete(!hasIssues, validationItems);
    } catch (error) {
      console.error('Error validating stock:', error);
      onValidationComplete(false, []);
    } finally {
      setIsValidating(false);
    }
  };

  const getInventoryStock = async (productId: string, colorVariantId?: string, sizeVariantId?: string): Promise<number> => {
    // This should use the inventory system to get actual available stock
    // For now, return a default value - this should be integrated with useInventoryManager
    return 100; // Placeholder
  };

  if (isValidating) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-gray-600">Validating stock availability...</div>
      </div>
    );
  }

  return null;
}
