
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Search, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Updated interface to match new database schema
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

interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  created_at: string;
  role: string;
  orders?: CustomerOrder[];
}

export function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOrders, setCustomerOrders] = useState<{ [key: string]: CustomerOrder[] }>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      console.log('Fetching customers...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch customers",
          variant: "destructive",
        });
      } else {
        console.log('Customers fetched successfully:', data?.length || 0);
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId: string) => {
    if (customerOrders[customerId]) return; // Already fetched

    try {
      console.log('Fetching orders for customer:', customerId);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer orders:', error);
      } else {
        console.log('Customer orders fetched:', data?.length || 0);
        setCustomerOrders(prev => ({ 
          ...prev, 
          [customerId]: data || [] 
        }));
      }
    } catch (error) {
      console.error('Unexpected error fetching customer orders:', error);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.contact_number?.includes(searchQuery)
  );

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerOrders(customer.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'payment_confirmed': return 'bg-blue-100 text-blue-800';
      case 'on_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'Pending Payment';
      case 'payment_confirmed': return 'Payment Confirmed';
      case 'on_delivery': return 'On Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status.toUpperCase();
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading customers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <Button onClick={fetchCustomers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">Total Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {customers.filter(c => c.contact_number).length}
            </div>
            <p className="text-xs text-muted-foreground">With Contact Info</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Object.values(customerOrders).reduce((sum, orders) => sum + orders.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
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

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{customer.full_name || 'N/A'}</p>
                      <Badge variant="secondary" className="text-xs">
                        {customer.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.contact_number || 'N/A'}</TableCell>
                  <TableCell>{customer.whatsapp_number || 'N/A'}</TableCell>
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
                          <DialogTitle>Customer Details - {selectedCustomer?.full_name || selectedCustomer?.email}</DialogTitle>
                        </DialogHeader>
                        {selectedCustomer && (
                          <div className="space-y-6">
                            {/* Customer Info */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Contact Information</CardTitle>
                              </CardHeader>
                              <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium">Full Name</p>
                                  <p>{selectedCustomer.full_name || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Email</p>
                                  <p>{selectedCustomer.email}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Contact Number</p>
                                  <p>{selectedCustomer.contact_number || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">WhatsApp</p>
                                  <p>{selectedCustomer.whatsapp_number || 'N/A'}</p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Orders */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Order History</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {customerOrders[selectedCustomer.id]?.length > 0 ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Order #</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {customerOrders[selectedCustomer.id].map((order) => (
                                        <TableRow key={order.id}>
                                          <TableCell className="font-medium">
                                            {order.order_number}
                                          </TableCell>
                                          <TableCell>Rs. {order.total_amount.toFixed(2)}</TableCell>
                                          <TableCell>
                                            <Badge className={getStatusColor(order.status)}>
                                              {getStatusLabel(order.status)}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            {new Date(order.created_at).toLocaleDateString()}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <p className="text-gray-500 text-center py-4">No orders found</p>
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
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No customers found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
