import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Clock, Truck, CheckCircle, XCircle, RotateCcw, CreditCard, Wallet, AlertCircle } from 'lucide-react';

interface OrderPerformanceStatsProps {
  paidOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  codOrders: number;
  prepaidOrders: number;
  failedPayments: number;
}

export function OrderPerformanceStats({
  paidOrders,
  pendingOrders,
  shippedOrders,
  deliveredOrders,
  cancelledOrders,
  returnedOrders,
  codOrders,
  prepaidOrders,
  failedPayments
}: OrderPerformanceStatsProps) {
  const stats = [
    { label: 'Paid Orders', value: paidOrders, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Pending Orders', value: pendingOrders, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Shipped Orders', value: shippedOrders, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Delivered Orders', value: deliveredOrders, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Cancelled Orders', value: cancelledOrders, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Returned Orders', value: returnedOrders, icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'COD Orders', value: codOrders, icon: Wallet, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Prepaid Orders', value: prepaidOrders, icon: CreditCard, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
    { label: 'Failed Payments', value: failedPayments, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Order Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className={`p-3 rounded-lg ${stat.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground truncate">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
