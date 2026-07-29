import { Card, CardContent } from '@/components/ui/card';
import { Package, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';

interface InventoryStatsProps {
  totalItems: number;
  availableStock: number;
  lowStockItems: number;
  outOfStockItems: number;
}

export function InventoryStats({ totalItems, availableStock, lowStockItems, outOfStockItems }: InventoryStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="rounded-2xl border-border/70 shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-2.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 border border-blue-500/20">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground truncate">Total Variants</p>
              <p className="text-lg sm:text-2xl font-black text-foreground">{totalItems.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground truncate">Available Stock</p>
              <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{availableStock.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-2.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground truncate">Low Stock Items</p>
              <p className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400">{lowStockItems.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 shadow-2xs hover:shadow-xs transition-shadow">
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-2.5 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl shrink-0 border border-rose-500/20">
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground truncate">Out of Stock</p>
              <p className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400">{outOfStockItems.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
