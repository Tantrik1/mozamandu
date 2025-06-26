
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BaseOrder, OrderStatus } from '@/types/order';

export default function CustomerDashboard() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<BaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Fetching orders for user:', user.id);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        });
      } else {
        console.log('Orders fetched successfully:', data?.length || 0);
        // Cast the data to BaseOrder type to handle database type mismatch
        setOrders((data || []).map(order => ({
          ...order,
          status: order.status as OrderStatus
        })));
      }
    } catch (error) {
      console.error('Unexpected error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'verified': return 'bg-purple-100 text-purple-800';
      case 'in_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'Pending Payment';
      case 'processing': return 'Processing';
      case 'verified': return 'Verified';
      case 'in_delivery': return 'In Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-gray-600">You need to sign in to view your dashboard.</p>
          <Button asChild className="mt-4">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Dashboard</h1>

        {/* Order Summary */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Order History</h2>
          {loading ? (
            <div className="text-center">Loading orders...</div>
          ) : orders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map(order => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Order #{order.order_number}</CardTitle>
                        <CardDescription>
                          Placed on {new Date(order.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-gray-700">
                        Total: Rs. {order.total_amount.toFixed(2)}
                      </p>
                      {order.remaining_amount > 0 && (
                        <div className="text-sm">
                          <p className="text-green-600">
                            Paid: Rs. {order.paid_amount.toFixed(2)} ({order.payment_percentage}%)
                          </p>
                          <p className="text-orange-600">
                            Due: Rs. {order.remaining_amount.toFixed(2)}
                          </p>
                        </div>
                      )}
                      <Button asChild variant="link" className="p-0 h-auto">
                        <Link to={`/order-summary/${order.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-500">No orders placed yet.</p>
              <Button asChild className="mt-4">
                <Link to="/products">Start Shopping</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Account Details */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Account Details</h2>
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>
                Manage your account details and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center space-x-4">
                <span>{user.email}</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
      <Footer />
    </div>
  );
}
