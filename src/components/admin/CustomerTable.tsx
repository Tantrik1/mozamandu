
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Phone, User } from 'lucide-react';

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

interface CustomerTableProps {
  customers: Customer[];
  searchQuery: string;
  onViewCustomer: (customer: Customer) => void;
  onRefresh: () => void;
}

export function CustomerTable({ customers, searchQuery, onViewCustomer, onRefresh }: CustomerTableProps) {
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      customer.email.toLowerCase().includes(searchLower) ||
      (customer.full_name && customer.full_name.toLowerCase().includes(searchLower)) ||
      (customer.contact_number && customer.contact_number.includes(searchQuery))
    );
  });

  return (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewCustomer(customer)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
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
                <Button onClick={onRefresh} variant="outline" className="mt-2">
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
