import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface TimeBasedSalesStatsProps {
  todayRevenue: number;
  yesterdayRevenue: number;
  last7DaysRevenue: number;
  last30DaysRevenue: number;
  mtdRevenue: number;
  ytdRevenue: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export function TimeBasedSalesStats({
  todayRevenue,
  yesterdayRevenue,
  last7DaysRevenue,
  last30DaysRevenue,
  mtdRevenue,
  ytdRevenue,
  revenueGrowth,
  ordersGrowth
}: TimeBasedSalesStatsProps) {
  const formatCurrency = (value: number) => 
    `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const stats = [
    { label: "Today's Revenue", value: formatCurrency(todayRevenue) },
    { label: "Yesterday's Revenue", value: formatCurrency(yesterdayRevenue) },
    { label: 'Last 7 Days', value: formatCurrency(last7DaysRevenue) },
    { label: 'Last 30 Days', value: formatCurrency(last30DaysRevenue) },
    { label: 'Month-to-Date', value: formatCurrency(mtdRevenue) },
    { label: 'Year-to-Date', value: formatCurrency(ytdRevenue) },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-primary" />
          Time-Based Sales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-semibold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className={`p-3 rounded-lg flex items-center gap-2 ${revenueGrowth >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            {revenueGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Revenue Growth</p>
              <p className={`text-sm font-bold ${revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className={`p-3 rounded-lg flex items-center gap-2 ${ordersGrowth >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            {ordersGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Orders Growth</p>
              <p className={`text-sm font-bold ${ordersGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {ordersGrowth >= 0 ? '+' : ''}{ordersGrowth.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
