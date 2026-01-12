
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Wallet, TrendingUp, UserPlus, Repeat } from 'lucide-react';
import type { Customer } from '@/hooks/useCustomerManagement';

interface CustomerStatsProps {
  customers: Customer[];
}

export function CustomerStats({ customers }: CustomerStatsProps) {
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.total_orders > 0).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // New customers this month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = customers.filter(c => new Date(c.created_at) >= firstDayOfMonth).length;
  
  // Repeat customers (more than 1 order)
  const repeatCustomers = customers.filter(c => c.total_orders > 1).length;
  
  // Active rate percentage
  const activeRate = totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(1) : '0';

  const stats = [
    {
      title: 'Total Customers',
      value: totalCustomers.toString(),
      icon: Users,
      description: 'All registered customers'
    },
    {
      title: 'Active Customers',
      value: `${activeCustomers} (${activeRate}%)`,
      icon: UserCheck,
      description: 'Customers with orders'
    },
    {
      title: 'Total Revenue',
      value: `Rs. ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: Wallet,
      description: 'From all customers'
    },
    {
      title: 'Avg Order Value',
      value: `Rs. ${avgOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: TrendingUp,
      description: 'Per order average'
    },
    {
      title: 'New This Month',
      value: newThisMonth.toString(),
      icon: UserPlus,
      description: 'Joined this month'
    },
    {
      title: 'Repeat Customers',
      value: repeatCustomers.toString(),
      icon: Repeat,
      description: 'More than 1 order'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
