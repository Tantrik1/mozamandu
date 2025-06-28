
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
    <div className="grid md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{orders.length}</div>
          <div className="text-sm text-gray-600">Total Orders</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-blue-600">{customerOrders}</div>
          <div className="text-sm text-gray-600">Customer Orders</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-red-600">{adminOrders}</div>
          <div className="text-sm text-gray-600">Admin Orders</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-gray-600">{guestOrders}</div>
          <div className="text-sm text-gray-600">Guest Orders</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">Rs. {totalRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </CardContent>
      </Card>
    </div>
  );
}
