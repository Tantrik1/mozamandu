import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Percent, RotateCcw } from 'lucide-react';

interface CoreBusinessStatsProps {
  totalRevenue: number;
  totalOrders: number;
  netProfit: number;
  grossMargin: number;
  averageOrderValue: number;
  conversionRate: number;
  refundRate: number;
  returnRate: number;
}

export function CoreBusinessStats({
  totalRevenue,
  totalOrders,
  netProfit,
  grossMargin,
  averageOrderValue,
  conversionRate,
  refundRate,
  returnRate
}: CoreBusinessStatsProps) {
  const stats = [
    {
      label: 'Total Revenue',
      value: `Rs. ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      label: 'Total Orders',
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30'
    },
    {
      label: 'Net Profit',
      value: `Rs. ${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-600',
      bgColor: netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'
    },
    {
      label: 'Gross Margin',
      value: `${grossMargin.toFixed(1)}%`,
      icon: Percent,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30'
    },
    {
      label: 'Avg Order Value',
      value: `Rs. ${averageOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30'
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate.toFixed(2)}%`,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/30'
    },
    {
      label: 'Refund Rate',
      value: `${refundRate.toFixed(2)}%`,
      icon: RotateCcw,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30'
    },
    {
      label: 'Return Rate',
      value: `${returnRate.toFixed(2)}%`,
      icon: RotateCcw,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 dark:bg-rose-950/30'
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Core Business Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground truncate">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
