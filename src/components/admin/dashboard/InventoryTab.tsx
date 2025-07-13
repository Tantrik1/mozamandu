import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Area, AreaChart, Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Package, TrendingDown, AlertTriangle, BarChart3, Warehouse, DollarSign } from 'lucide-react';

const stockStatusData = [
  { status: 'In Stock', count: 234, value: 65, fill: 'hsl(var(--chart-2))' },
  { status: 'Low Stock', count: 45, value: 12, fill: 'hsl(var(--chart-3))' },
  { status: 'Out of Stock', count: 23, value: 6, fill: 'hsl(var(--chart-5))' },
  { status: 'Overstock', count: 62, value: 17, fill: 'hsl(var(--chart-4))' },
];

const categoryData = [
  { category: 'Electronics', items: 125, value: 45000 },
  { category: 'Clothing', items: 89, value: 23000 },
  { category: 'Books', items: 156, value: 8900 },
  { category: 'Sports', items: 67, value: 15600 },
  { category: 'Home', items: 78, value: 19800 },
];

const stockMovementData = [
  { date: '2024-01-01', inbound: 120, outbound: 95, net: 25 },
  { date: '2024-01-02', inbound: 85, outbound: 110, net: -25 },
  { date: '2024-01-03', inbound: 95, outbound: 87, net: 8 },
  { date: '2024-01-04', inbound: 110, outbound: 102, net: 8 },
  { date: '2024-01-05', inbound: 130, outbound: 98, net: 32 },
  { date: '2024-01-06', inbound: 105, outbound: 115, net: -10 },
  { date: '2024-01-07', inbound: 140, outbound: 89, net: 51 },
];

const lowStockItems = [
  { name: 'Premium T-Shirt', current: 5, minimum: 20, category: 'Clothing' },
  { name: 'Wireless Headphones', current: 3, minimum: 15, category: 'Electronics' },
  { name: 'Running Shoes', current: 8, minimum: 25, category: 'Sports' },
  { name: 'Coffee Mug', current: 12, minimum: 30, category: 'Home' },
  { name: 'Notebook', current: 4, minimum: 50, category: 'Books' },
];

export function InventoryTab() {
  const [realtimeStats, setRealtimeStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryStats();
    
    // Setup realtime subscription with proper cleanup
    const channel = supabase
      .channel('inventory-realtime-' + Math.random().toString(36).substr(2, 9))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_inventory'
        },
        (payload) => {
          console.log('Inventory change detected:', payload);
          fetchInventoryStats();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInventoryStats = async () => {
    try {
      const { data: inventory } = await supabase
        .from('product_inventory')
        .select('stock_quantity, available_stock, low_stock_threshold, cost_price, is_active');

      if (inventory) {
        const activeItems = inventory.filter(item => item.is_active);
        const lowStock = activeItems.filter(item => 
          item.available_stock <= (item.low_stock_threshold || 10)
        );
        const outOfStock = activeItems.filter(item => item.available_stock === 0);
        const totalValue = activeItems.reduce((sum, item) => 
          sum + (item.cost_price * item.stock_quantity), 0
        );

        setRealtimeStats({
          totalItems: activeItems.length,
          lowStockItems: lowStock.length,
          outOfStockItems: outOfStock.length,
          totalValue,
        });
      }
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Realtime Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Package className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Items</p>
                <p className="text-2xl font-bold text-blue-700">{realtimeStats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Low Stock</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-orange-700">{realtimeStats.lowStockItems}</p>
                  {realtimeStats.lowStockItems > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      Alert
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Out of Stock</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-red-700">{realtimeStats.outOfStockItems}</p>
                  {realtimeStats.outOfStockItems > 0 && (
                    <Badge variant="destructive">
                      Critical
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Total Value</p>
                <p className="text-2xl font-bold text-green-700">${realtimeStats.totalValue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Stock Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                inStock: { label: "In Stock", color: "hsl(var(--chart-2))" },
                lowStock: { label: "Low Stock", color: "hsl(var(--chart-3))" },
                outOfStock: { label: "Out of Stock", color: "hsl(var(--chart-5))" },
                overstock: { label: "Overstock", color: "hsl(var(--chart-4))" },
              }}
              className="h-[200px]"
            >
              <PieChart>
                <Pie
                  data={stockStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ status, value }) => `${status}: ${value}%`}
                >
                  {stockStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Inventory by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                items: { label: "Items", color: "hsl(var(--chart-1))" },
                value: { label: "Value", color: "hsl(var(--chart-2))" },
              }}
              className="h-[200px]"
            >
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="left" dataKey="items" fill="hsl(var(--chart-1))" />
                <Bar yAxisId="right" dataKey="value" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Stock Movement */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement (7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              inbound: { label: "Inbound", color: "hsl(var(--chart-2))" },
              outbound: { label: "Outbound", color: "hsl(var(--chart-5))" },
              net: { label: "Net Change", color: "hsl(var(--chart-1))" },
            }}
            className="h-[250px]"
          >
            <AreaChart data={stockMovementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="inbound"
                stackId="1"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="outbound"
                stackId="2"
                stroke="hsl(var(--chart-5))"
                fill="hsl(var(--chart-5))"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lowStockItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-orange-700">
                    {item.current} / {item.minimum}
                  </p>
                  <Badge variant="destructive">
                    Reorder Needed
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">12.5</p>
              <p className="text-sm text-muted-foreground">Inventory Turnover</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">29 days</p>
              <p className="text-sm text-muted-foreground">Avg Days in Stock</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">94.5%</p>
              <p className="text-sm text-muted-foreground">Stock Accuracy</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">15.2%</p>
              <p className="text-sm text-muted-foreground">Carrying Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}