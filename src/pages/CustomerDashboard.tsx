
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ContactInfoForm } from '@/components/customer/ContactInfoForm';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Footer } from '@/components/layout/Footer';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Package, Clock, MapPin, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CustomerOrder {
  id: string;
  order_number: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
}

export default function CustomerDashboard() {
  const { user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showContactForm, setShowContactForm] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }

      if (userProfile && !userProfile.contact_number) {
        setShowContactForm(true);
      } else {
        fetchUserOrders();
      }
    }
  }, [user, userProfile, isLoading, navigate]);

  const fetchUserOrders = async () => {
    if (!user) return;

    setOrdersLoading(true);
    try {
      console.log('🔄 CustomerDashboard: Fetching orders for user:', user.id);

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, paid_amount, remaining_amount, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ CustomerDashboard: Error fetching user orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch your orders",
          variant: "destructive",
        });
        setOrders([]);
      } else {
        console.log('✅ CustomerDashboard: User orders fetched:', data?.length || 0);
        setOrders(data || []);
      }
    } catch (error) {
      console.error('❌ CustomerDashboard: Unexpected error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your orders",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleContactInfoComplete = () => {
    setShowContactForm(false);
    window.location.reload(); // Refresh to get updated profile
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (showContactForm) {
    return <ContactInfoForm onComplete={handleContactInfoComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Customer'}!
          </h1>
          <p className="mt-2 text-gray-600">Manage your orders and account settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.full_name || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {userProfile?.contact_number || 'No contact number'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-muted-foreground">
                All time orders
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
                {orders.filter(o => o.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'delivered').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Orders</CardTitle>
                <Button 
                  onClick={fetchUserOrders} 
                  disabled={ordersLoading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${ordersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No orders yet</p>
                    <Button 
                      onClick={() => navigate('/')} 
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Start Shopping
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">Rs. {order.total_amount.toFixed(2)}</p>
                              {order.remaining_amount > 0 && (
                                <p className="text-xs text-orange-600">
                                  Remaining: Rs. {order.remaining_amount.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/order-summary/${order.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Contact Number</label>
                <p className="text-sm">{userProfile?.contact_number || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">WhatsApp Number</label>
                <p className="text-sm">{userProfile?.whatsapp_number || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Member Since</label>
                <p className="text-sm">
                  {userProfile?.created_at 
                    ? new Date(userProfile.created_at).toLocaleDateString()
                    : 'N/A'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
