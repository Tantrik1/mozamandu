
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CustomerStats } from './CustomerStats';
import { CustomerSearch } from './CustomerSearch';
import { CustomerTable } from './CustomerTable';
import { CustomerDialog } from './CustomerDialog';
import { useCustomerManagement } from '@/hooks/useCustomerManagement';
import { RefreshCw } from 'lucide-react';

export function CustomerManagement() {
  const { customers, customerOrders, loading, isLoadingOrders, fetchCustomers, fetchCustomerOrders } = useCustomerManagement();
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground mt-1">View and manage customer profiles</p>
        </div>
        <Button onClick={fetchCustomers} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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
        isLoadingOrders={isLoadingOrders}
      />
    </div>
  );
}
