import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { ContactInfoForm } from '@/components/customer/ContactInfoForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Heart, Clock, User, AlertCircle, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
  payment_screenshot_url: string | null;
}

export default function CustomerDashboard() {
  const { user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [needsContactInfo, setNeedsContactInfo] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth?redirect=/dashboard');
      return;
    }

    if (userProfile?.role === 'admin') {
      navigate('/admin');
    }
  }, [user, userProfile, isLoading, navigate]);

  useEffect(() => {
    if (user && userProfile) {
      // Check if contact information is missing
      if (!userProfile.contact_number) {
        setNeedsContactInfo(true);
      } else {
        fetchOrders();
      }
    }
  }, [user, userProfile]);

  const fetchOrders = async () => {
    if (!user) return;
    
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, paid_amount, remaining_amount, status, created_at, payment_screenshot_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Error",
          description: "Failed to load your orders",
          variant: "destructive",
        });
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Orders fetch error:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleContactInfoComplete = () => {
    setNeedsContactInfo(false);
    // Refresh user profile to get updated contact info
    window.location.reload();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePayRemaining = (orderId: string) => {
    // Navigate to payment page with order ID
    navigate(`/checkout?order=${orderId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show contact info form if needed
  if (needsContactInfo && user) {
    return <ContactInfoForm userId={user.id} onComplete={handleContactInfoComplete} />;
  }

  // Check if user needs to verify email
  const needsVerification = user && !user.email_confirmed_at;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-600 mt-2">
            {userProfile?.full_name ? `Hi ${userProfile.full_name}` : 'Manage your orders and account'}
          </p>
        </div>

        {needsVerification && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="font-medium text-orange-800">Email Verification Pending</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Please check your email and click the verification link to complete your account setup.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-muted-foreground">
                {orders.length === 1 ? '1 order placed' : `${orders.length} orders placed`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(order => order.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">Orders being processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(order => order.remaining_amount > 0).length}
              </div>
              <p className="text-xs text-muted-foreground">Orders with pending payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Status</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {needsVerification ? 'Pending Verification' : 'Verified'}
              </div>
              <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No orders found</p>
                    <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
                      Start Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{order.order_number}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Total Amount</p>
                            <p className="font-medium">${order.total_amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Paid Amount</p>
                            <p className="font-medium text-green-600">${order.paid_amount.toFixed(2)}</p>
                          </div>
                        </div>

                        {order.remaining_amount > 0 && (
                          <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium text-orange-800">
                                  Payment Due: ${order.remaining_amount.toFixed(2)}
                                </p>
                                <p className="text-xs text-orange-600">
                                  Complete your payment to process the order
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handlePayRemaining(order.id)}
                                className="bg-orange-600 hover:bg-orange-700"
                              >
                                Pay Now
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Name:</span>
                  <p className="font-medium">{userProfile?.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <p className="font-medium">{userProfile?.email}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Account Type:</span>
                  <p className="font-medium capitalize">{userProfile?.role}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Member Since:</span>
                  <p className="font-medium">
                    {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  Browse Products
                </Button>
                <Button onClick={() => navigate('/categories')} variant="outline" className="w-full">
                  Shop by Category
                </Button>
                <Button onClick={fetchOrders} variant="outline" className="w-full">
                  Refresh Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
