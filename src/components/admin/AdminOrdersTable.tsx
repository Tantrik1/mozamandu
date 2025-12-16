import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, RefreshCw, CheckCircle, Truck, Package, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useInventoryManager } from '@/hooks/useInventoryManager';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending_payment' | 'payment_confirmed' | 'on_delivery' | 'delivered' | 'cancelled';
  created_at: string;
  user_id: string | null;
  user_role?: string;
}

interface AdminOrdersTableProps {
  orders: Order[];
  filteredOrders: Order[];
  updating: string | null;
  onUpdateStatus: (orderId: string, newStatus: string) => Promise<void>;
}

export function AdminOrdersTable({ 
  orders, 
  filteredOrders, 
  updating, 
  onUpdateStatus 
}: AdminOrdersTableProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'payment_confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'on_delivery': return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getOrderType = (order: Order) => {
    if (!order.user_id) return 'Guest';
    if (order.user_role === 'admin') return 'Admin';
    return 'Customer';
  };

  const getOrderTypeBadgeColor = (orderType: string) => {
    switch (orderType) {
      case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Customer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Guest': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const { reserveStock, releaseStock, fulfillStock } = useInventoryManager();

  const handleInventoryUpdate = async (orderId: string, newStatus: string, oldStatus: string) => {
    try {
      console.log('🔄 Checking inventory update for order:', orderId, 'from', oldStatus, 'to', newStatus);
      
      // Only handle inventory for specific status changes
      if (newStatus === 'delivered' && oldStatus !== 'delivered') {
        // Fulfill stock: reduce both reserved and total stock
        console.log('📦 Fulfilling stock for delivery...');
        await fulfillStock(orderId);
      } else if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        // Release stock: only reduce reserved stock, keep total stock
        console.log('🔓 Releasing reserved stock for cancellation...');
        await releaseStock(orderId);
      } else {
        // No inventory changes needed for other status transitions
        console.log('ℹ️ No inventory changes required for this status transition');
        return;
      }

      console.log('✅ Inventory update completed successfully');
    } catch (error) {
      console.error('❌ Inventory update failed:', error);
      throw error;
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const oldStatus = order.status;
    
    try {
      // Handle inventory changes first
      await handleInventoryUpdate(orderId, newStatus, oldStatus);
      
      // Update order status in database
      await onUpdateStatus(orderId, newStatus);
      
      // Send status update email
      console.log('Sending status update email...');
      const { error: emailError } = await supabase.functions.invoke('send-order-email', {
        body: {
          type: 'status_updated',
          orderId: orderId,
          isCustomerOrder: true,
          oldStatus: oldStatus,
          newStatus: newStatus
        }
      });

      if (emailError) {
        console.error('Status update email failed:', emailError);
      } else {
        console.log('Status update email sent successfully');
      }
    } catch (error) {
      console.error('Status update failed:', error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusActions = (order: Order) => {
    const actions = [];
    
    switch (order.status) {
      case 'pending_payment':
        actions.push({
          label: 'Confirm Payment',
          icon: CheckCircle,
          nextStatus: 'payment_confirmed',
          variant: 'default' as const,
          color: ''
        });
        break;
        
      case 'payment_confirmed':
        actions.push({
          label: 'Mark On Delivery',
          icon: Truck,
          nextStatus: 'on_delivery',
          variant: 'secondary' as const,
          color: ''
        });
        break;
        
      case 'on_delivery':
        actions.push({
          label: 'Mark Delivered',
          icon: Package,
          nextStatus: 'delivered',
          variant: 'default' as const,
          color: ''
        });
        break;
        
      case 'delivered':
        // No actions for delivered orders
        break;
        
      case 'cancelled':
        // No actions for cancelled orders
        break;
    }
    
    // Add cancel option for non-final statuses
    if (!['delivered', 'cancelled'].includes(order.status)) {
      actions.push({
        label: 'Cancel',
        icon: X,
        nextStatus: 'cancelled',
        variant: 'destructive' as const,
        color: ''
      });
    }
    
    return actions;
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/customer-order-summary/${orderId}`);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px]">Order #</TableHead>
            <TableHead className="min-w-[150px]">Customer</TableHead>
            <TableHead className="min-w-[80px]">Type</TableHead>
            <TableHead className="min-w-[90px]">Total</TableHead>
            <TableHead className="min-w-[110px]">Paid</TableHead>
            <TableHead className="min-w-[120px]">Status</TableHead>
            <TableHead className="min-w-[90px]">Date</TableHead>
            <TableHead className="min-w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders.map((order) => {
            const statusActions = getStatusActions(order);
            
            return (
              <TableRow key={order.id}>
                <TableCell className="font-medium text-sm">{order.order_number}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium truncate max-w-[140px]">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[140px]">{order.customer_email}</p>
                  </div>
                </TableCell>
              <TableCell>
                <Badge variant="outline" className={getOrderTypeBadgeColor(getOrderType(order))}>
                  {getOrderType(order)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">Rs. {Number(order.total_amount).toFixed(2)}</TableCell>
              <TableCell>
                <div>
                  <p className="text-emerald-600 text-sm">Rs. {Number(order.paid_amount).toFixed(2)}</p>
                  {order.remaining_amount > 0 && (
                    <p className="text-xs text-amber-600">
                      Due: Rs. {Number(order.remaining_amount).toFixed(2)}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.status)}>
                  {updating === order.id ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  {order.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {new Date(order.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {statusActions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant}
                      size="sm"
                      onClick={() => handleStatusUpdate(order.id, action.nextStatus)}
                      disabled={updating === order.id}
                      className="text-xs h-7 px-2"
                    >
                      <action.icon className="h-3 w-3 mr-1" />
                      {action.label}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewOrder(order.id)}
                    className="h-7 px-2"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
          {filteredOrders.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No orders found matching your criteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
