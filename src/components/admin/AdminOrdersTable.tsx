import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'payment_confirmed': return 'bg-blue-100 text-blue-800';
      case 'on_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderType = (order: Order) => {
    if (!order.user_id) return 'Guest';
    if (order.user_role === 'admin') return 'Admin';
    return 'Customer';
  };

  const getOrderTypeBadgeColor = (orderType: string) => {
    switch (orderType) {
      case 'Admin': return 'bg-red-100 text-red-800';
      case 'Customer': return 'bg-blue-100 text-blue-800';
      case 'Guest': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const oldStatus = order.status;
    
    // Call the parent update function
    await onUpdateStatus(orderId, newStatus);
    
    // Send status update email
    try {
      console.log('Sending status update email...');
      const { error: emailError } = await supabase.functions.invoke('send-order-email', {
        body: {
          type: 'status_updated',
          orderId: orderId,
          isCustomerOrder: false, // This is for admin orders table
          oldStatus: oldStatus,
          newStatus: newStatus
        }
      });

      if (emailError) {
        console.error('Status update email failed:', emailError);
      } else {
        console.log('Status update email sent successfully');
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/order-summary/${orderId}`);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Paid</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredOrders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.order_number}</TableCell>
            <TableCell>
              <div>
                <p className="font-medium">{order.customer_name}</p>
                <p className="text-sm text-gray-600">{order.customer_email}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={getOrderTypeBadgeColor(getOrderType(order))}>
                {getOrderType(order)}
              </Badge>
            </TableCell>
            <TableCell>Rs. {Number(order.total_amount).toFixed(2)}</TableCell>
            <TableCell>
              <div>
                <p className="text-green-600">Rs. {Number(order.paid_amount).toFixed(2)}</p>
                {order.remaining_amount > 0 && (
                  <p className="text-sm text-orange-600">
                    Remaining: Rs. {Number(order.remaining_amount).toFixed(2)}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Select
                value={order.status}
                onValueChange={(value) => handleStatusUpdate(order.id, value)}
                disabled={updating === order.id}
              >
                <SelectTrigger className="w-40">
                  <SelectValue>
                    <Badge className={getStatusColor(order.status)}>
                      {updating === order.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="payment_confirmed">Payment Confirmed</SelectItem>
                  <SelectItem value="on_delivery">On Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              {new Date(order.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewOrder(order.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {filteredOrders.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
              No orders found matching your criteria.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
