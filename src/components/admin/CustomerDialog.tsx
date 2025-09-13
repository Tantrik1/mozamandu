
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  promocode_used?: string;
  source?: string;
}

interface CustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  customerOrders: CustomerOrder[];
}

export function CustomerDialog({ isOpen, onClose, customer, customerOrders }: CustomerDialogProps) {
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Customer Details - {customer.full_name || customer.email}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <p><strong>Name:</strong> {customer.full_name || 'N/A'}</p>
                <p><strong>Email:</strong> {customer.email}</p>
                <p><strong>Role:</strong> {customer.role || 'customer'}</p>
              </div>
              <div>
                <p><strong>Contact:</strong> {customer.contact_number || 'N/A'}</p>
                <p><strong>WhatsApp:</strong> {customer.whatsapp_number || 'N/A'}</p>
                <p><strong>Joined:</strong> {new Date(customer.created_at).toLocaleDateString()}</p>
              </div>
              <div className="md:col-span-2">
                <p><strong>Total Orders:</strong> {customer.total_orders}</p>
                <p><strong>Total Spent:</strong> Rs. {customer.total_spent.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order History ({customerOrders.length} orders)</CardTitle>
            </CardHeader>
            <CardContent>
              {customerOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Promo Used</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerOrders.map((order) => (
                      <TableRow key={`${order.id}-${order.source || 'unknown'}`}>
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
                          {order.promocode_used ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                              {order.promocode_used}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.source === 'customer_orders' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {order.source === 'customer_orders' ? 'Customer Orders' : 'Orders'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">📦</div>
                  <p className="text-gray-500">No orders found for this customer.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    This customer may not have placed any orders yet, or orders may be associated with different contact details.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
