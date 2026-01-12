
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, Mail, Phone, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Customer, SortConfig } from '@/hooks/useCustomerManagement';

interface CustomerTableProps {
  customers: Customer[];
  paginatedCustomers: Customer[];
  searchQuery: string;
  onViewCustomer: (customer: Customer) => void;
  onRefresh: () => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  sortConfig: SortConfig;
  onSortChange: (sort: SortConfig) => void;
}

export function CustomerTable({ 
  customers, paginatedCustomers, searchQuery, onViewCustomer, onRefresh, 
  currentPage, setCurrentPage, pageSize, setPageSize, totalPages, 
  sortConfig, onSortChange 
}: CustomerTableProps) {
  const getPhone = (c: Customer) => c.phone || c.contact_number;
  const getWhatsapp = (c: Customer) => c.whatsapp || c.whatsapp_number;

  const filtered = paginatedCustomers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.email.toLowerCase().includes(q) || c.full_name?.toLowerCase().includes(q) || getPhone(c)?.includes(q) || getWhatsapp(c)?.includes(q);
  });

  const handleSort = (col: SortConfig['column']) => onSortChange({ 
    column: col, 
    direction: sortConfig.column === col && sortConfig.direction === 'asc' ? 'desc' : 'asc' 
  });
  
  const getSortIcon = (col: SortConfig['column']) => {
    if (sortConfig.column !== col) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleWhatsApp = (c: Customer) => { 
    const n = getWhatsapp(c) || getPhone(c); 
    n ? window.open(`https://wa.me/${n.replace(/\D/g, '')}`, '_blank') : toast.error('No WhatsApp number'); 
  };
  const handleEmail = (c: Customer) => c.email && window.open(`mailto:${c.email}`, '_blank');
  const handlePhone = (c: Customer) => { 
    const n = getPhone(c); 
    n ? window.open(`tel:${n}`, '_blank') : toast.error('No phone number'); 
  };
  const handleCopy = (c: Customer) => { 
    navigator.clipboard.writeText([c.full_name, c.email, getPhone(c), getWhatsapp(c)].filter(Boolean).join('\n')); 
    toast.success('Contact info copied'); 
  };

  if (!filtered.length && !searchQuery) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">No customers found</p>
          <Button onClick={onRefresh} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Customer List
            <Badge variant="secondary" className="ml-2">{customers.length} total</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={() => handleSort('full_name')}>
                    Customer{getSortIcon('full_name')}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead>
                  <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={() => handleSort('total_orders')}>
                    Orders{getSortIcon('total_orders')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={() => handleSort('total_spent')}>
                    Spent{getSortIcon('total_spent')}
                  </Button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <Button variant="ghost" className="h-auto p-0 hover:bg-transparent" onClick={() => handleSort('created_at')}>
                    Joined{getSortIcon('created_at')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filtered.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No match</TableCell>
                </TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{c.full_name || 'Unnamed'}</p>
                        <p className="text-sm text-muted-foreground">{c.email}</p>
                      </div>
                      {c.is_guest && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          Guest
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {getPhone(c) && <p>📞 {getPhone(c)}</p>}
                    {getWhatsapp(c) && getWhatsapp(c) !== getPhone(c) && <p>💬 {getWhatsapp(c)}</p>}
                    {!getPhone(c) && !getWhatsapp(c) && <span className="text-muted-foreground">No contact</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.total_orders > 0 ? 'default' : 'secondary'}>{c.total_orders}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    Rs. {c.total_spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleWhatsApp(c)} title="WhatsApp">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEmail(c)} title="Email">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => handlePhone(c)} title="Call">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => handleCopy(c)} title="Copy">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onViewCustomer(c)}>
                        <Eye className="h-4 w-4 mr-1" />View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            <Select value={pageSize.toString()} onValueChange={v => setPageSize(parseInt(v))}>
              <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />Prev
            </Button>
            <span className="text-sm text-muted-foreground px-2">Page {currentPage} of {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= totalPages}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
