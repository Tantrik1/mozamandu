
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Search, Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  role: string;
  created_at: string;
  total_orders: number;
  total_spent: number;
}

interface CustomerOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    
    console.log('Fetching customers...');
    
    try {
      // Fetch all profiles (both admin and customer roles)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profile fetch error:', profilesError);
        toast({
          title: "Error",
          description: "Failed to fetch customer profiles: " + profilesError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('Raw profiles data:', profiles);

      if (!profiles || profiles.length === 0) {
        console.log('No profiles found in database');
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Filter for customers only in the component, not in the query
      const customerProfiles = profiles.filter(profile => profile.role === 'customer');
      console.log('Filtered customer profiles:', customerProfiles);

      // Get order statistics for each customer profile
      const customersWithStats = await Promise.all(
        customerProfiles.map(async (profile) => {
          try {
            console.log(`Fetching orders for customer ${profile.id}...`);
            
            const { data: orders, error: ordersError } = await supabase
              .from('orders')
              .select('total_amount')
              .eq('user_id', profile.id);

            if (ordersError) {
              console.error('Orders fetch error for customer', profile.id, ':', ordersError);
            }

            const totalOrders = orders?.length || 0;
            const totalSpent = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

            console.log(`Customer ${profile.email}: ${totalOrders} orders, Rs. ${totalSpent} spent`);

            return {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name,
              contact_number: profile.contact_number,
              whatsapp_number: profile.whatsapp_number,
              role: profile.role || 'customer',
              created_at: profile.created_at,
              total_orders: totalOrders,
              total_spent: totalSpent,
            };
          } catch (error) {
            console.error('Error processing customer profile', profile.id, ':', error);
            return {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name,
              contact_number: profile.contact_number,
              whatsapp_number: profile.whatsapp_number,
              role: profile.role || 'customer',
              created_at: profile.created_at,
              total_orders: 0,
              total_spent: 0,
            };
          }
        })
      );

      console.log('Final customers with stats:', customersWithStats);
      setCustomers(customersWithStats);
      
    } catch (error) {
      console.error('Error in fetchCustomers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId: string) => {
    console.log('Fetching orders for customer:', customerId);
    
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, status, created_at')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Customer orders fetch error:', error);
    } else {
      console.log('Customer orders:', data);
      setCustomerOrders(data || []);
    }
  };

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerOrders(customer.id);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.email.toLowerCase().includes(searchLower) ||
      (customer.full_name && customer.full_name.toLowerCase().includes(searchLower)) ||
      (customer.contact_number && customer.contact_number.includes(searchQuery))
    );
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mr-4"></div>
          <span>Loading customers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <Button onClick={fetchCustomers}>Refresh</Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or contact number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{customers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {customers.filter(c => c.total_orders > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              Rs. {customers.reduce((sum, c) => sum + c.total_spent, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">
                            {customer.full_name || 'Unnamed Customer'}
                          </p>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.contact_number && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {customer.contact_number}
                          </div>
                        )}
                        {customer.whatsapp_number && (
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <Phone className="h-3 w-3" />
                            WhatsApp: {customer.whatsapp_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{customer.total_orders}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">Rs. {customer.total_spent.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      {new Date(customer.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCustomer(customer)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              Customer Details - {selectedCustomer?.full_name || selectedCustomer?.email}
                            </DialogTitle>
                          </DialogHeader>
                          {selectedCustomer && (
                            <div className="space-y-6">
                              {/* Customer Info */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Customer Information</CardTitle>
                                </CardHeader>
                                <CardContent className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <p><strong>Name:</strong> {selectedCustomer.full_name || 'N/A'}</p>
                                    <p><strong>Email:</strong> {selectedCustomer.email}</p>
                                    <p><strong>Role:</strong> {selectedCustomer.role || 'customer'}</p>
                                  </div>
                                  <div>
                                    <p><strong>Contact:</strong> {selectedCustomer.contact_number || 'N/A'}</p>
                                    <p><strong>WhatsApp:</strong> {selectedCustomer.whatsapp_number || 'N/A'}</p>
                                    <p><strong>Joined:</strong> {new Date(selectedCustomer.created_at).toLocaleDateString()}</p>
                                  </div>
                                  <div className="md:col-span-2">
                                    <p><strong>Total Orders:</strong> {selectedCustomer.total_orders}</p>
                                    <p><strong>Total Spent:</strong> Rs. {selectedCustomer.total_spent.toFixed(2)}</p>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Customer Orders */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Order History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {customerOrders.length > 0 ? (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Order #</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Date</TableHead>
                                        </TableRow>
                                      </TableTableHeader>
                                      <TableBody>
                                        {customerOrders.map((order) => (
                                          <TableRow key={order.id}>
                                            <TableCell className="font-medium">
                                              {order.order_number}
                                            </TableCell>
                                            <TableCell>Rs. {order.total_amount.toFixed(2)}</TableCell>
                                            <TableCell>
                                              <span className={`px-2 py-1 rounded text-xs ${
                                                order.status === 'delivered' 
                                                  ? 'bg-green-100 text-green-800'
                                                  : order.status === 'cancelled'
                                                  ? 'bg-red-100 text-red-800'
                                                  : 'bg-yellow-100 text-yellow-800'
                                              }`}>
                                                {order.status}
                                              </span>
                                            </TableCell>
                                            <TableCell>
                                              {new Date(order.created_at).toLocaleDateString()}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  ) : (
                                    <p className="text-gray-500">No orders found for this customer.</p>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? "No customers found matching your search criteria."
                  : "No customer profiles found in the database."
                }
              </p>
              {!searchQuery && (
                <div className="text-sm text-gray-400 space-y-1">
                  <p>• No customers have signed up yet, or</p>
                  <p>• There might be a database connectivity issue</p>
                  <Button onClick={fetchCustomers} variant="outline" className="mt-2">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
