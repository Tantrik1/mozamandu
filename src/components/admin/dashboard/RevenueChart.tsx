import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { XAxis, YAxis, CartesianGrid, Area, AreaChart, Line, BarChart, Bar, LineChart } from 'recharts';
import { TrendingUp, BarChart3, LineChartIcon, AreaChartIcon } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RevenueDataPoint {
  period: string;
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  period: string;
  onPeriodChange: (period: string) => void;
}

type ChartType = 'area' | 'line' | 'bar';

export function RevenueChart({ data, period, onPeriodChange }: RevenueChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area');

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
    orders: { label: "Orders", color: "hsl(142 76% 36%)" }
  };

  const chartTypes: { value: ChartType; icon: React.ElementType; label: string }[] = [
    { value: 'area', icon: AreaChartIcon, label: 'Area' },
    { value: 'line', icon: LineChartIcon, label: 'Line' },
    { value: 'bar', icon: BarChart3, label: 'Bar' },
  ];

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;

  const renderChart = () => {
    const commonProps = {
      data,
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <defs>
              <linearGradient id="colorRevenueBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
            <XAxis 
              dataKey="period" 
              className="text-xs" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              className="text-xs" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar 
              dataKey="revenue" 
              fill="url(#colorRevenueBar)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke="hsl(142 76% 36%)" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        );
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2.5}
              fill="url(#colorRevenue)"
            />
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke="hsl(142 76% 36%)" 
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        );
    }
  };

  return (
    <Card className="col-span-full overflow-hidden border-primary/10">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <CardDescription>Revenue and orders over time</CardDescription>
            </div>
          </div>
          
          {/* Chart Type Toggles */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
            {chartTypes.map((type) => (
              <Button
                key={type.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 gap-1.5 transition-all",
                  chartType === type.value 
                    ? "bg-background shadow-sm border border-border/50" 
                    : "hover:bg-muted"
                )}
                onClick={() => setChartType(type.value)}
              >
                <type.icon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{type.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        {data.length > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Total Revenue:</span>
              <span className="text-sm font-semibold">Rs. {totalRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Total Orders:</span>
              <span className="text-sm font-semibold">{totalOrders}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Avg/Period:</span>
              <span className="text-sm font-semibold">Rs. {avgRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={chartType}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {data.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <div className="p-4 rounded-full bg-muted/50">
                  <BarChart3 className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-sm">No data available for this period</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-72">
                {renderChart()}
              </ChartContainer>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
