import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Users, Eye, ShoppingCart, CreditCard, LogOut, MousePointer } from 'lucide-react';

interface TrafficConversionStatsProps {
  totalVisitors: number;
  sessions: number;
  uniqueVisitors: number;
  addToCartRate: number;
  checkoutInitiationRate: number;
  cartAbandonmentRate: number;
  checkoutAbandonmentRate: number;
  bounceRate: number;
}

export function TrafficConversionStats({
  totalVisitors,
  sessions,
  uniqueVisitors,
  addToCartRate,
  checkoutInitiationRate,
  cartAbandonmentRate,
  checkoutAbandonmentRate,
  bounceRate
}: TrafficConversionStatsProps) {
  const stats = [
    { label: 'Total Visitors', value: totalVisitors.toLocaleString(), icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Sessions', value: sessions.toLocaleString(), icon: MousePointer, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { label: 'Unique Visitors', value: uniqueVisitors.toLocaleString(), icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
    { label: 'Add to Cart Rate', value: addToCartRate.toFixed(1) + '%', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Checkout Init Rate', value: checkoutInitiationRate.toFixed(1) + '%', icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
    { label: 'Cart Abandonment', value: cartAbandonmentRate.toFixed(1) + '%', icon: LogOut, color: cartAbandonmentRate > 70 ? 'text-red-600' : 'text-amber-600', bg: cartAbandonmentRate > 70 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Checkout Abandon', value: checkoutAbandonmentRate.toFixed(1) + '%', icon: LogOut, color: checkoutAbandonmentRate > 30 ? 'text-red-600' : 'text-amber-600', bg: checkoutAbandonmentRate > 30 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Bounce Rate', value: bounceRate.toFixed(1) + '%', icon: LogOut, color: bounceRate > 50 ? 'text-red-600' : 'text-amber-600', bg: bounceRate > 50 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-5 w-5 text-primary" />
          Traffic & Conversion
          <span className="text-xs text-muted-foreground font-normal ml-auto">(Google Analytics)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
