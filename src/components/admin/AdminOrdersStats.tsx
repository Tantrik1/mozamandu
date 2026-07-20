
import { Card, CardContent } from '@/components/ui/card';

interface Order {
  id: string;
  total_amount: number;
  user_id: string | null;
  user_role?: string;
}

interface AdminOrdersStatsProps {
  orders: Order[];
}

export function AdminOrdersStats({ orders }: AdminOrdersStatsProps) {
  const getOrderType = (order: Order) => {
    if (!order.user_id) return 'Guest';
    if (order.user_role === 'admin') return 'Admin';
    return 'Customer';
  };

  const customerOrders = orders.filter(o => getOrderType(o) === 'Customer').length;
  const adminOrders = orders.filter(o => getOrderType(o) === 'Admin').length;
  const guestOrders = orders.filter(o => getOrderType(o) === 'Guest').length;
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="text-xl md:text-2xl font-bold">{orders.length}</div>
          <div className="text-xs md:text-sm text-muted-foreground">Total Orders</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="text-xl md:text-2xl font-bold text-blue-600">{customerOrders}</div>
          <div className="text-xs md:text-sm text-muted-foreground">Customer</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="text-xl md:text-2xl font-bold text-red-600">{adminOrders}</div>
          <div className="text-xs md:text-sm text-muted-foreground">Admin</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="text-xl md:text-2xl font-bold text-muted-foreground">{guestOrders}</div>
          <div className="text-xs md:text-sm text-muted-foreground">Guest</div>
        </CardContent>
      </Card>
      <Card className="col-span-2 sm:col-span-1">
        <CardContent className="p-3 md:p-4">
          <div className="text-xl md:text-2xl font-bold truncate">Rs. {totalRevenue.toLocaleString()}</div>
          <div className="text-xs md:text-sm text-muted-foreground">Revenue</div>
        </CardContent>
      </Card>
    </div>
  );
}
