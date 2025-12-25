
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CustomerStats } from './CustomerStats';
import { CustomerSearch } from './CustomerSearch';
import { CustomerTable } from './CustomerTable';
import { CustomerDialog } from './CustomerDialog';
import { useCustomerManagement } from '@/hooks/useCustomerManagement';

export function CustomerManagement() {
  const { customers, customerOrders, loading, fetchCustomers, fetchCustomerOrders } = useCustomerManagement();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleViewCustomer = async (customer: typeof customers[0]) => {
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

  // Transform customers to match expected interface with contact_number and whatsapp_number
  const transformedCustomers = customers.map(c => ({
    ...c,
    contact_number: c.phone,
    whatsapp_number: c.whatsapp,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground mt-1">View and manage customer profiles</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={fetchCustomers} variant="outline" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          <Button onClick={fetchCustomers} size="sm">
            Recalculate Stats
          </Button>
        </div>
      </div>

      <CustomerSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <CustomerStats customers={transformedCustomers} />

      <CustomerTable 
        customers={transformedCustomers}
        searchQuery={searchQuery}
        onViewCustomer={(c) => handleViewCustomer(customers.find(cust => cust.id === c.id)!)}
        onRefresh={fetchCustomers}
      />

      <CustomerDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        customer={selectedCustomer ? {
          ...selectedCustomer,
          contact_number: selectedCustomer.phone,
          whatsapp_number: selectedCustomer.whatsapp,
        } : null}
        customerOrders={customerOrders}
      />
    </div>
  );
}
