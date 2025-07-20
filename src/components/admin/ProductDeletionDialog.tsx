import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Package, Calendar, User, Phone, Mail, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RelatedOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  total_amount: number;
  status: 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled';
  created_at: string;
  delivery_address: string;
  items: {
    product_name: string;
    color_name: string;
    size_name: string;
    quantity: number;
    sku: string;
  }[];
}

interface ProductDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onConfirm: () => void;
}

export function ProductDeletionDialog({
  isOpen,
  onClose,
  productId,
  productName,
  onConfirm,
}: ProductDeletionDialogProps) {
  const [relatedOrders, setRelatedOrders] = useState<RelatedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [canDeleteDirectly, setCanDeleteDirectly] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && productId) {
      checkRelatedOrders();
    }
  }, [isOpen, productId]);

  const checkRelatedOrders = async () => {
    setLoading(true);
    try {
      // First, get all inventory IDs for this product
      const { data: inventoryIds, error: inventoryError } = await supabase
        .from('product_inventory')
        .select('id')
        .eq('product_id', productId);

      if (inventoryError) throw inventoryError;

      const inventoryIdList = inventoryIds?.map(item => item.id) || [];

      // Get all order items related to this product through inventory
      let allOrderItems: any[] = [];
      
      if (inventoryIdList.length > 0) {
        const { data: orderItems, error: itemsError } = await supabase
          .from('customer_order_item_details')
          .select(`
            *,
            customer_orders!inner(
              id,
              order_number,
              customer_name,
              customer_email,
              contact_number,
              total_amount,
              status,
              created_at,
              delivery_address
            )
          `)
          .in('product_inventory_id', inventoryIdList);

        if (itemsError) throw itemsError;
        allOrderItems = [...(orderItems || [])];
      }

      // Also check by product_name since some items might be stored that way
      const { data: orderItemsByName, error: nameError } = await supabase
        .from('customer_order_item_details')
        .select(`
          *,
          customer_orders!inner(
            id,
            order_number,
            customer_name,
            customer_email,
            contact_number,
            total_amount,
            status,
            created_at,
            delivery_address
          )
        `)
        .ilike('product_name', `%${productName}%`);

      if (nameError) throw nameError;

      // Combine and deduplicate orders
      allOrderItems = [...allOrderItems, ...(orderItemsByName || [])];
      const uniqueOrdersMap = new Map();

      allOrderItems.forEach(item => {
        const order = item.customer_orders;
        if (!uniqueOrdersMap.has(order.id)) {
          uniqueOrdersMap.set(order.id, {
            ...order,
            items: []
          });
        }
        uniqueOrdersMap.get(order.id).items.push({
          product_name: item.product_name,
          color_name: item.color_name,
          size_name: item.size_name,
          quantity: item.quantity,
          sku: item.sku
        });
      });

      const orders = Array.from(uniqueOrdersMap.values());
      setRelatedOrders(orders);

      // Check if all orders are in delivered or cancelled status
      const nonCompletedOrders = orders.filter(
        order => order.status !== 'delivered' && order.status !== 'cancelled'
      );
      setCanDeleteDirectly(nonCompletedOrders.length === 0);

    } catch (error) {
      console.error('Error checking related orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to check related orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAllAndDelete = async () => {
    setCancelling(true);
    try {
      // Cancel all non-completed orders
      const ordersToCancel = relatedOrders.filter(
        order => order.status !== 'delivered' && order.status !== 'cancelled'
      );

      for (const order of ordersToCancel) {
        const { error } = await supabase
          .from('customer_orders')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (error) throw error;
      }

      // Now delete the product
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (deleteError) throw deleteError;

      toast({
        title: 'Success',
        description: `Cancelled ${ordersToCancel.length} orders and deleted product "${productName}" successfully`,
      });

      onConfirm();
      onClose();
    } catch (error) {
      console.error('Error cancelling orders and deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel orders and delete product',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleDirectDelete = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Product "${productName}" deleted successfully`,
      });

      onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'payment_confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'on_delivery':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Delete Product: {productName}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="text-center">
              <Package className="h-8 w-8 animate-pulse mx-auto mb-2" />
              <p>Checking related orders...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {relatedOrders.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-medium mb-2">No Related Orders Found</h3>
                <p className="text-gray-600">This product has no associated orders and can be safely deleted.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    Found {relatedOrders.length} related order{relatedOrders.length !== 1 ? 's' : ''}
                  </h3>
                  {canDeleteDirectly ? (
                    <Badge className="bg-green-100 text-green-800">
                      All orders are completed - Safe to delete
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Has active orders - Requires cancellation
                    </Badge>
                  )}
                </div>

                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {relatedOrders.map((order) => (
                      <Card key={order.id} className="border">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{order.order_number}</CardTitle>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>{order.customer_name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span>{order.customer_email}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span>{order.contact_number}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium">Delivery Address:</span>
                            </div>
                            <p className="text-sm text-gray-600 ml-6">{order.delivery_address}</p>
                          </div>

                          <div className="mt-3">
                            <h4 className="text-sm font-medium mb-2">Product Items:</h4>
                            <div className="space-y-1">
                              {order.items.map((item, index) => (
                                <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{item.product_name}</span>
                                    <span>Qty: {item.quantity}</span>
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    {item.color_name && `Color: ${item.color_name}`}
                                    {item.size_name && ` | Size: ${item.size_name}`}
                                    {item.sku && ` | SKU: ${item.sku}`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 text-right">
                            <span className="text-sm font-medium">Total: Rs {order.total_amount}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={onClose} disabled={cancelling}>
            Cancel
          </Button>
          
          {relatedOrders.length === 0 || canDeleteDirectly ? (
            <Button 
              variant="destructive" 
              onClick={handleDirectDelete}
              disabled={loading}
            >
              <Package className="h-4 w-4 mr-2" />
              Delete Product
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={handleCancelAllAndDelete}
              disabled={loading || cancelling}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {cancelling ? 'Processing...' : `Cancel ${relatedOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length} Orders & Delete Product`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}