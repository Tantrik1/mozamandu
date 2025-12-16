import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Boxes, Package, DollarSign, RefreshCw, Calendar, Percent, AlertCircle } from 'lucide-react';

interface InventoryStatsProps {
  totalSKUs: number;
  availableStockUnits: number;
  stockValueAtCost: number;
  stockTurnoverRatio: number;
  avgDaysInventoryHeld: number;
  inventoryFillRate: number;
  oversellingIncidents: number;
}

export function InventoryStats({
  totalSKUs,
  availableStockUnits,
  stockValueAtCost,
  stockTurnoverRatio,
  avgDaysInventoryHeld,
  inventoryFillRate,
  oversellingIncidents
}: InventoryStatsProps) {
  const stats = [
    { label: 'Total SKUs', value: totalSKUs.toLocaleString(), icon: Boxes, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Available Stock', value: availableStockUnits.toLocaleString() + ' units', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Stock Value (Cost)', value: `Rs. ${stockValueAtCost.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { label: 'Turnover Ratio', value: stockTurnoverRatio.toFixed(2), icon: RefreshCw, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
    { label: 'Avg Days Held', value: avgDaysInventoryHeld.toFixed(0) + ' days', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { label: 'Fill Rate', value: inventoryFillRate.toFixed(1) + '%', icon: Percent, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
    { label: 'Overselling Issues', value: oversellingIncidents.toString(), icon: AlertCircle, color: oversellingIncidents > 0 ? 'text-red-600' : 'text-emerald-600', bg: oversellingIncidents > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="h-5 w-5 text-primary" />
          Inventory & SKU Stats
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
