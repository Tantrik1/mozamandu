
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Phone, User } from 'lucide-react';

interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;           // Lovable Cloud column
  whatsapp: string | null;        // Lovable Cloud column
  contact_number: string | null;  // External Supabase column
  whatsapp_number: string | null; // External Supabase column
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
    // Use whichever phone column exists
    const customerPhone = customer.contact_number || customer.phone || '';
    
    return (
      customer.email.toLowerCase().includes(searchLower) ||
      (customer.full_name && customer.full_name.toLowerCase().includes(searchLower)) ||
      customerPhone.includes(searchQuery)
    );
  });

  // Helper to get phone/whatsapp from either column
  const getPhone = (customer: Customer) => customer.contact_number || customer.phone;
  const getWhatsapp = (customer: Customer) => customer.whatsapp_number || customer.whatsapp;

  return (
    <Card>
      <CardHeader className="px-4 md:px-6">
        <CardTitle className="text-lg md:text-xl">Registered Customers ({filteredCustomers.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Customer</TableHead>
                  <TableHead className="min-w-[140px]">Contact Info</TableHead>
                  <TableHead className="min-w-[80px]">Orders</TableHead>
                  <TableHead className="min-w-[100px]">Total Spent</TableHead>
                  <TableHead className="min-w-[100px]">Joined</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium truncate max-w-[150px]">
                          {customer.full_name || 'Unnamed Customer'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate max-w-[150px]">{customer.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getPhone(customer) && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{getPhone(customer)}</span>
                        </div>
                      )}
                      {getWhatsapp(customer) && (
                        <div className="flex items-center gap-1 text-sm text-emerald-600">
                          <Phone className="h-3 w-3" />
                          <span className="truncate">{getWhatsapp(customer)}</span>
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
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? "No customers found matching your search criteria."
                : "No customer profiles found in the database."
              }
            </p>
            {!searchQuery && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• No customers have signed up yet, or</p>
                <p>• There might be a database connectivity issue</p>
                <Button onClick={onRefresh} variant="outline" size="sm" className="mt-2">
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
