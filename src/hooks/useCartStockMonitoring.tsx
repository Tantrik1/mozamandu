
import { useState, useEffect } from 'react';
import { validateCartStock } from '@/utils/inventoryManager';

interface CartItem {
  productId: string;
  productInventoryId?: string;
  quantity: number;
  productName: string;
}

interface StockStatus {
  isValid: boolean;
  availableStock?: number;
  errorMessage?: string;
}

export function useCartStockMonitoring(cartItems: CartItem[]) {
  const [cartStockStatus, setCartStockStatus] = useState<{ [key: string]: StockStatus }>({});
  const [hasStockIssues, setHasStockIssues] = useState(false);
  const [invalidItems, setInvalidItems] = useState<Array<{ errorMessage: string }>>([]);

  useEffect(() => {
    if (cartItems.length === 0) {
      setCartStockStatus({});
      setHasStockIssues(false);
      setInvalidItems([]);
      return;
    }

    const checkStock = async () => {
      try {
        const result = await validateCartStock(cartItems);
        
        const statusMap: { [key: string]: StockStatus } = {};
        const issues: Array<{ errorMessage: string }> = [];
        
        result.validationResults.forEach((validationResult) => {
          const key = `${validationResult.productId}-${validationResult.productInventoryId || 'no-inventory'}`;
          statusMap[key] = {
            isValid: validationResult.isValid,
            availableStock: validationResult.availableStock,
            errorMessage: validationResult.errorMessage,
          };
          
          if (!validationResult.isValid && validationResult.errorMessage) {
            issues.push({ errorMessage: validationResult.errorMessage });
          }
        });
        
        setCartStockStatus(statusMap);
        setHasStockIssues(!result.isValid);
        setInvalidItems(issues);
      } catch (error) {
        console.error('Error checking cart stock:', error);
        setHasStockIssues(true);
        setInvalidItems([{ errorMessage: 'Failed to validate stock' }]);
      }
    };

    checkStock();
    
    // Check stock every 30 seconds
    const interval = setInterval(checkStock, 30000);
    
    return () => clearInterval(interval);
  }, [cartItems]);

  return {
    cartStockStatus,
    hasStockIssues,
    invalidItems,
  };
}
