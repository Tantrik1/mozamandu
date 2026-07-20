import { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { ContactInfoForm } from '@/components/customer/ContactInfoForm';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Package, Clock, MapPin, Eye, RefreshCw, Wallet } from 'lucide-react';
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

type OrderFilter = 'all' | 'pending' | 'in_progress' | 'delivered' | 'cancelled';

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'pending_payment':
      return 'secondary';
    case 'payment_confirmed':
      return 'outline';
    case 'on_delivery':
      return 'default';
    case 'delivered':
      return 'default';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function matchesFilter(status: string, filter: OrderFilter) {
  if (filter === 'all') return true;
  if (filter === 'delivered') return status === 'delivered';
  if (filter === 'cancelled') return status === 'cancelled';
  if (filter === 'pending') return status === 'pending_payment' || status === 'payment_confirmed';
  if (filter === 'in_progress') return status === 'on_delivery';
  return true;
}

export default function CustomerDashboard() {
  const { user, userProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showContactForm, setShowContactForm] = useState(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [filter, setFilter] = useState<OrderFilter>('all');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, isLoading, navigate]);

  const fetchUserOrders = async () => {
    if (!user) return;

    setOrdersLoading(true);
    try {
      console.log('🔄 CustomerDashboard: Fetching customer orders for user:', user.id);

      const { data, error } = await supabase
        .from('customer_orders')
        .select('id, order_number, total_amount, paid_amount, remaining_amount, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ CustomerDashboard: Error fetching customer orders:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch your orders',
          variant: 'destructive',
        });
        setOrders([]);
      } else {
        console.log('✅ CustomerDashboard: Customer orders fetched:', data?.length || 0);
        setOrders(data || []);
      }
    } catch (error) {
      console.error('❌ CustomerDashboard: Unexpected error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your orders',
        variant: 'destructive',
      });
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleContactInfoComplete = () => {
    setShowContactForm(false);
    window.location.reload();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => matchesFilter(o.status, filter));
  }, [orders, filter]);

  const totalSpent = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  }, [orders]);

  const totalOutstanding = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o.remaining_amount) || 0), 0);
  }, [orders]);

  const pendingCount = useMemo(() => {
    return orders.filter((o) => o.status === 'pending_payment' || o.status === 'payment_confirmed').length;
  }, [orders]);

  const deliveredCount = useMemo(() => {
    return orders.filter((o) => o.status === 'delivered').length;
  }, [orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Customer Dashboard | Mozamandu</title>
        <meta
          name="description"
          content="View your orders, track delivery status, and manage your contact details in your Mozamandu customer dashboard."
        />
        <link rel="canonical" href={`${window.location.origin}/dashboard`} />
      </Helmet>

      <ModernNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Customer'}!
          </h1>
          <p className="mt-2 text-muted-foreground">Track your orders and manage your account</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" aria-label="Dashboard stats">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.full_name || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">{userProfile?.contact_number || 'No contact number'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-muted-foreground">All time orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. {totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Delivered: {deliveredCount}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-label="Orders and account">
          <article className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Your Orders</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Outstanding: Rs. {totalOutstanding.toFixed(2)}</p>
                </div>
                <Button onClick={fetchUserOrders} disabled={ordersLoading} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${ordersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs value={filter} onValueChange={(v) => setFilter(v as OrderFilter)}>
                  <TabsList className="w-full flex flex-wrap justify-start">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="in_progress">On delivery</TabsTrigger>
                    <TabsTrigger value="delivered">Delivered</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                  </TabsList>
                </Tabs>

                {ordersLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No orders yet</p>
                    <Button onClick={() => navigate('/')}>
                      Start Shopping
                    </Button>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No orders match this filter.</p>
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
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">Rs. {Number(order.total_amount).toFixed(2)}</p>
                              {order.remaining_amount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Remaining: Rs. {Number(order.remaining_amount).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(order.status)}>{formatStatus(order.status)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/customer-order-summary/${order.id}`} aria-label={`View order ${order.order_number}`}>
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
          </article>

          <aside>
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm text-foreground">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Number</label>
                  <p className="text-sm text-foreground">{userProfile?.contact_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">WhatsApp Number</label>
                  <p className="text-sm text-foreground">{userProfile?.whatsapp_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                  <p className="text-sm text-foreground">
                    {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

