
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { 
  fulfillStockForOrder, 
  releaseStockForOrder, 
  getOrderItemsForStockOperation,
  type StockReservationResult 
} from '@/utils/stockReservationManager';

export function useOrderStockManagement() {
  const [processing, setProcessing] = useState(false);

  const handleOrderStatusChange = async (
    orderId: string,
    newStatus: string,
    oldStatus: string,
    isCustomerOrder: boolean = false
  ): Promise<boolean> => {
    console.log('=== ORDER STATUS CHANGE ===');
    console.log('Order ID:', orderId);
    console.log('Status change:', oldStatus, '->', newStatus);
    console.log('Is customer order:', isCustomerOrder);

    setProcessing(true);
    
    try {
      // Get order items for stock operations
      const orderItems = await getOrderItemsForStockOperation(orderId, isCustomerOrder);
      
      if (orderItems.length === 0) {
        console.log('No order items found for stock operation');
        return true;
      }

      let stockResult: StockReservationResult | null = null;

      // Handle different status changes
      if (newStatus === 'delivered' && oldStatus !== 'delivered') {
        // Order delivered: fulfill stock (reduce both stock_quantity and reserved_stock)
        console.log('Order delivered: fulfilling stock...');
        stockResult = await fulfillStockForOrder(orderItems, orderId);
        
        if (stockResult.success) {
          toast({
            title: "Stock Updated",
            description: "Stock has been fulfilled for delivered order",
          });
        } else {
          toast({
            title: "Stock Warning",
            description: `Stock fulfillment had issues: ${stockResult.message}`,
            variant: "destructive",
          });
        }
      } 
      else if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        // Order cancelled: release reserved stock (only reduce reserved_stock)
        console.log('Order cancelled: releasing reserved stock...');
        stockResult = await releaseStockForOrder(orderItems, orderId);
        
        if (stockResult.success) {
          toast({
            title: "Stock Updated",
            description: "Reserved stock has been released for cancelled order",
          });
        } else {
          toast({
            title: "Stock Warning",
            description: `Stock release had issues: ${stockResult.message}`,
            variant: "destructive",
          });
        }
      }
      else if (oldStatus === 'cancelled' && newStatus !== 'cancelled') {
        // Order uncancelled: we would need to re-reserve stock
        // This is complex as we need to check current availability
        console.log('Order uncancelled: would need to re-reserve stock');
        toast({
          title: "Manual Stock Check Required",
          description: "Please manually verify stock availability for this uncancelled order",
          variant: "destructive",
        });
        return false;
      }
      else if (oldStatus === 'delivered' && newStatus !== 'delivered') {
        // Order undelivered: we would need to add stock back
        // This is complex and might require manual intervention
        console.log('Order undelivered: would need manual stock adjustment');
        toast({
          title: "Manual Stock Adjustment Required",
          description: "Please manually adjust stock for this order status change",
          variant: "destructive",
        });
        return false;
      }

      console.log('Stock operation result:', stockResult);
      return stockResult?.success ?? true;

    } catch (error) {
      console.error('Error handling order status change:', error);
      toast({
        title: "Stock Operation Failed",
        description: "Failed to update stock for order status change",
        variant: "destructive",
      });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  return {
    handleOrderStatusChange,
    processing
  };
}
