
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CustomerStats } from './CustomerStats';
import { CustomerSearch } from './CustomerSearch';
import { CustomerTable } from './CustomerTable';
import { CustomerDialog } from './CustomerDialog';
import { useCustomerManagement } from '@/hooks/useCustomerManagement';

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

export function CustomerManagement() {
  const { customers, customerOrders, loading, fetchCustomers, fetchCustomerOrders } = useCustomerManagement();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
    await fetchCustomerOrders(customer.id);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedCustomer(null);
  };

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

      <CustomerSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <CustomerStats customers={customers} />

      <CustomerTable 
        customers={customers}
        searchQuery={searchQuery}
        onViewCustomer={handleViewCustomer}
        onRefresh={fetchCustomers}
      />

      <CustomerDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        customer={selectedCustomer}
        customerOrders={customerOrders}
      />
    </div>
  );
}
