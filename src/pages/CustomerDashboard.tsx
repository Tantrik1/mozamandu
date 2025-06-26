import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarDays, CreditCard, MapPin, Package, Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CustomerOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  contact_number: string;
  whatsapp_number: string | null;
  delivery_address: string;
  total_amount: number;
  subtotal: number;
  delivery_charge: number;
  status: string;
  created_at: string;
  updated_at: string;
  combo_applied: boolean;
  promocode_used: string | null;
  promocode_discount: number;
  payment_screenshot_url: string | null;
  pricing_breakdown?: any;
}

export default function CustomerDashboard() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
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
        setOrders(data || []);
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
                    <CardTitle>Order #{order.order_number}</CardTitle>
                    <CardDescription>
                      Placed on {new Date(order.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-gray-700">
                        Total: Rs. {order.total_amount.toFixed(2)}
                      </p>
                      <p className="text-gray-700">
                        Status: {order.status}
                      </p>
                      <Button asChild variant="link">
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
                <User className="h-5 w-5 text-gray-500" />
                <span>{user.email}</span>
              </div>
              {/* Add more account details here */}
            </CardContent>
          </Card>
        </section>
      </div>
      <Footer />
    </div>
  );
}
