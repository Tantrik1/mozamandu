import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, UserCheck, Repeat, DollarSign, ShoppingCart, UserMinus, Crown } from 'lucide-react';

interface TopCustomer {
  name: string;
  email: string;
  totalSpent: number;
  ordersCount: number;
}

interface CustomerStatsPanelProps {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatPurchaseRate: number;
  customerLifetimeValue: number;
  avgOrdersPerCustomer: number;
  churnRate: number;
  highValueCustomersCount: number;
  topCustomers: TopCustomer[];
}

export function CustomerStatsPanel({
  totalCustomers,
  newCustomers,
  returningCustomers,
  repeatPurchaseRate,
  customerLifetimeValue,
  avgOrdersPerCustomer,
  churnRate,
  highValueCustomersCount,
  topCustomers
}: CustomerStatsPanelProps) {
  const stats = [
    { label: 'Total Customers', value: totalCustomers.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'New Customers', value: newCustomers.toLocaleString(), icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Returning', value: returningCustomers.toLocaleString(), icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { label: 'Repeat Rate', value: repeatPurchaseRate.toFixed(1) + '%', icon: Repeat, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
    { label: 'CLV', value: `Rs. ${customerLifetimeValue.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { label: 'Avg Orders/Customer', value: avgOrdersPerCustomer.toFixed(1), icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
    { label: 'Churn Rate', value: churnRate.toFixed(1) + '%', icon: UserMinus, color: churnRate > 20 ? 'text-red-600' : 'text-amber-600', bg: churnRate > 20 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'High Value', value: highValueCustomersCount.toLocaleString(), icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Customer Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className={`p-3 rounded-lg ${stat.bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Top Customers List */}
        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-600" />
            Top Customers
          </h4>
          <div className="space-y-2">
            {topCustomers.slice(0, 5).map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{customer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-emerald-600">Rs. {customer.totalSpent.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">{customer.ordersCount} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
