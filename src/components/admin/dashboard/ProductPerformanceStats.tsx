import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Archive } from 'lucide-react';

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
  profit: number;
}

interface LeastProduct {
  name: string;
  quantity: number;
}

interface ProductPerformanceStatsProps {
  topSellingProducts: TopProduct[];
  leastSellingProducts: LeastProduct[];
  outOfStockCount: number;
  lowStockCount: number;
  deadStockCount: number;
}

export function ProductPerformanceStats({
  topSellingProducts,
  leastSellingProducts,
  outOfStockCount,
  lowStockCount,
  deadStockCount
}: ProductPerformanceStatsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-5 w-5 text-primary" />
          Product Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alert Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
            <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-950/30 rounded-lg text-center">
            <Archive className="h-5 w-5 text-gray-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-600">{deadStockCount}</p>
            <p className="text-xs text-muted-foreground">Dead Stock</p>
          </div>
        </div>

        {/* Top Selling Products */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Top Selling Products
          </h4>
          <div className="space-y-2">
            {topSellingProducts.slice(0, 5).map((product, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="outline" className="shrink-0">{index + 1}</Badge>
                  <span className="text-sm truncate">{product.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{product.quantity} units</p>
                  <p className="text-xs text-emerald-600">Rs. {product.revenue.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Least Selling Products */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            Least Selling Products
          </h4>
          <div className="space-y-2">
            {leastSellingProducts.slice(0, 3).map((product, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-sm truncate">{product.name}</span>
                <Badge variant="secondary">{product.quantity} units</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
