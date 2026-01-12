
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp, ExternalLink, Package, MapPin, CreditCard, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Customer, CustomerOrder, OrderItem } from '@/hooks/useCustomerManagement';

interface CustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  customerOrders: CustomerOrder[];
  isLoadingOrders: boolean;
  orderItems: Record<string, OrderItem[]>;
  isLoadingOrderItems: string | null;
  onFetchOrderItems: (orderId: string, source: 'customer_orders' | 'orders') => void;
}

export function CustomerDialog({ 
  isOpen, onClose, customer, customerOrders, isLoadingOrders, 
  orderItems, isLoadingOrderItems, onFetchOrderItems 
}: CustomerDialogProps) {
  const navigate = useNavigate();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  if (!customer) return null;

  const getPhone = (c: Customer) => c.phone || c.contact_number;
  const getWhatsapp = (c: Customer) => c.whatsapp || c.whatsapp_number;
  const memberSince = formatDistanceToNow(new Date(customer.created_at), { addSuffix: false });
  const avgOrderValue = customer.total_orders > 0 ? customer.total_spent / customer.total_orders : 0;

  const handleToggle = (id: string, src: 'customer_orders' | 'orders') => {
    if (expandedOrderId === id) { 
      setExpandedOrderId(null); 
    } else { 
      setExpandedOrderId(id); 
      if (!orderItems[id]) onFetchOrderItems(id, src); 
    }
  };

  const getStatusColor = (s: string) => {
    switch (s?.toLowerCase()) { 
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800'; 
      case 'payment_received': return 'bg-blue-100 text-blue-800'; 
      case 'processing': return 'bg-purple-100 text-purple-800'; 
      case 'shipped': return 'bg-indigo-100 text-indigo-800'; 
      case 'delivered': return 'bg-green-100 text-green-800'; 
      case 'cancelled': return 'bg-red-100 text-red-800'; 
      default: return 'bg-gray-100 text-gray-800'; 
    }
  };

  const badges = [];
  if (customer.is_guest) badges.push({ label: 'Guest Buyer', variant: 'outline' as const, className: 'bg-orange-50 text-orange-700 border-orange-200' });
  if (customer.total_orders >= 5) badges.push({ label: 'Frequent Buyer', variant: 'default' as const });
  if (customer.total_spent >= 10000) badges.push({ label: 'VIP', variant: 'destructive' as const });
  if (customer.total_orders > 1) badges.push({ label: 'Repeat', variant: 'secondary' as const });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{customer.full_name || 'Customer Details'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Customer Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg">Customer Information</CardTitle>
                <div className="flex gap-2">
                  {badges.map((b, i) => <Badge key={i} variant={b.variant} className={(b as any).className}>{b.label}</Badge>)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{customer.email}</p></div>
                  <div><span className="text-sm text-muted-foreground">Phone</span><p className="font-medium">{getPhone(customer) || 'N/A'}</p></div>
                  <div><span className="text-sm text-muted-foreground">WhatsApp</span><p className="font-medium">{getWhatsapp(customer) || 'N/A'}</p></div>
                  {customer.address && <div><span className="text-sm text-muted-foreground">Address</span><p className="font-medium">{customer.address}</p></div>}
                </div>
                <div className="space-y-2">
                  <div><span className="text-sm text-muted-foreground">{customer.is_guest ? 'First Order' : 'Member For'}</span><p className="font-medium">{memberSince}</p></div>
                  <div><span className="text-sm text-muted-foreground">Total Orders</span><p className="font-medium">{customer.total_orders}</p></div>
                  <div><span className="text-sm text-muted-foreground">Total Spent</span><p className="font-medium">Rs. {customer.total_spent.toLocaleString('en-IN')}</p></div>
                  <div><span className="text-sm text-muted-foreground">Avg Order</span><p className="font-medium">Rs. {avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order History Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                Order History
                <Badge variant="outline">{customerOrders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingOrders ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !customerOrders.length ? (
                <p className="text-muted-foreground text-center py-8">No orders found</p>
              ) : (
                <div className="space-y-3">
                  {customerOrders.map(o => {
                    const expanded = expandedOrderId === o.id;
                    const items = orderItems[o.id] || [];
                    const loading = isLoadingOrderItems === o.id;
                    const src = o.source || 'orders';
                    
                    return (
                      <Collapsible key={o.id} open={expanded}>
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <button 
                              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors" 
                              onClick={() => handleToggle(o.id, src)}
                            >
                              <div className="text-left">
                                <p className="font-medium">{o.order_number}</p>
                                <p className="text-sm text-muted-foreground">{format(new Date(o.created_at), 'MMM d, yyyy h:mm a')}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <Badge className={getStatusColor(o.status)}>{o.status?.replace(/_/g, ' ')}</Badge>
                                <span className="font-medium">Rs. {o.total_amount.toLocaleString('en-IN')}</span>
                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="border-t p-4 bg-muted/30 space-y-4">
                              {loading ? (
                                <>
                                  <Skeleton className="h-10 w-full" />
                                  <Skeleton className="h-10 w-full" />
                                </>
                              ) : (
                                <>
                                  {/* Order Items */}
                                  {items.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <Package className="h-4 w-4" />Items
                                      </h4>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Variant</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {items.map(i => (
                                            <TableRow key={i.id}>
                                              <TableCell className="font-medium">{i.product_name}</TableCell>
                                              <TableCell>{[i.color_name, i.size_name].filter(Boolean).join(' / ') || '-'}</TableCell>
                                              <TableCell className="text-right">{i.quantity}</TableCell>
                                              <TableCell className="text-right">Rs. {i.unit_price}</TableCell>
                                              <TableCell className="text-right">Rs. {i.total_price}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}

                                  {/* Pricing & Address */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />Pricing
                                      </h4>
                                      <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Subtotal</span>
                                          <span>Rs. {o.subtotal?.toLocaleString('en-IN') || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Delivery</span>
                                          <span>Rs. {o.delivery_charge?.toLocaleString('en-IN') || '0'}</span>
                                        </div>
                                        {o.promocode_discount && o.promocode_discount > 0 && (
                                          <div className="flex justify-between text-green-600">
                                            <span>Discount</span>
                                            <span>-Rs. {o.promocode_discount.toLocaleString('en-IN')}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between font-medium pt-2 border-t">
                                          <span>Total</span>
                                          <span>Rs. {o.total_amount.toLocaleString('en-IN')}</span>
                                        </div>
                                      </div>
                                    </div>
                                    {o.delivery_address && (
                                      <div>
                                        <h4 className="font-medium mb-2 flex items-center gap-2">
                                          <MapPin className="h-4 w-4" />Address
                                        </h4>
                                        <p className="text-sm text-muted-foreground">{o.delivery_address}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Payment Screenshot */}
                                  {o.payment_screenshot_url && (
                                    <div>
                                      <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <Image className="h-4 w-4" />Payment
                                      </h4>
                                      <a href={o.payment_screenshot_url} target="_blank" rel="noopener noreferrer">
                                        <img 
                                          src={o.payment_screenshot_url} 
                                          alt="Payment" 
                                          className="max-w-[200px] max-h-[200px] rounded border hover:opacity-80" 
                                        />
                                      </a>
                                    </div>
                                  )}

                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => navigate(`/order-summary/${o.order_number}`)} 
                                    className="w-full sm:w-auto"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />View Full Details
                                  </Button>
                                </>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
