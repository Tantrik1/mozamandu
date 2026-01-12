
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerStats } from './CustomerStats';
import { CustomerFilters } from './CustomerFilters';
import { CustomerTable } from './CustomerTable';
import { CustomerDialog } from './CustomerDialog';
import { useCustomerManagement } from '@/hooks/useCustomerManagement';
import { RefreshCw, Download, Search } from 'lucide-react';

export function CustomerManagement() {
  const {
    customers,
    filteredCustomers,
    paginatedCustomers,
    customerOrders,
    orderItems,
    loading,
    isLoadingOrders,
    isLoadingOrderItems,
    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    // Sorting
    sortConfig,
    updateSort,
    // Filters
    filters,
    updateFilters,
    clearFilters,
    // Actions
    fetchCustomers,
    fetchCustomerOrders,
    fetchOrderItems,
    exportToCSV
  } = useCustomerManagement();

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-4"></div>
          <span>Loading customers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage {filteredCustomers.length} customer profiles
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchCustomers} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <CustomerStats customers={customers} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <CustomerFilters
        filters={filters}
        onFiltersChange={updateFilters}
        onClearFilters={clearFilters}
      />

      {/* Table */}
      <CustomerTable
        customers={filteredCustomers}
        paginatedCustomers={paginatedCustomers}
        searchQuery={searchQuery}
        onViewCustomer={handleViewCustomer}
        onRefresh={fetchCustomers}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalPages={totalPages}
        sortConfig={sortConfig}
        onSortChange={updateSort}
      />

      {/* Dialog */}
      <CustomerDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        customer={selectedCustomer}
        customerOrders={customerOrders}
        isLoadingOrders={isLoadingOrders}
        orderItems={orderItems}
        isLoadingOrderItems={isLoadingOrderItems}
        onFetchOrderItems={fetchOrderItems}
      />
    </div>
  );
}
