import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Users, UserCheck, UserX, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export type OrderSourceFilter = 'all' | 'registered' | 'guest';

interface OrderSourceStats {
  totalOrders: number;
  totalRevenue: number;
  registeredOrders: number;
  registeredRevenue: number;
  guestOrders: number;
  guestRevenue: number;
  registeredAOV: number;
  guestAOV: number;
}

interface OrderSourceBreakdownProps {
  stats: OrderSourceStats;
  sourceFilter: OrderSourceFilter;
  onSourceFilterChange: (filter: OrderSourceFilter) => void;
}

export function OrderSourceBreakdown({ 
  stats, 
  sourceFilter, 
  onSourceFilterChange 
}: OrderSourceBreakdownProps) {
  const orderData = [
    { name: 'Registered', value: stats.registeredOrders, color: 'hsl(var(--primary))' },
    { name: 'Guest', value: stats.guestOrders, color: 'hsl(var(--muted-foreground))' },
  ].filter(d => d.value > 0);

  const revenueData = [
    { name: 'Registered', value: stats.registeredRevenue, color: 'hsl(var(--primary))' },
    { name: 'Guest', value: stats.guestRevenue, color: 'hsl(var(--muted-foreground))' },
  ].filter(d => d.value > 0);

  const registeredPercentage = stats.totalOrders > 0 
    ? ((stats.registeredOrders / stats.totalOrders) * 100).toFixed(1) 
    : '0';
  
  const guestPercentage = stats.totalOrders > 0 
    ? ((stats.guestOrders / stats.totalOrders) * 100).toFixed(1) 
    : '0';

  const registeredRevenuePercentage = stats.totalRevenue > 0 
    ? ((stats.registeredRevenue / stats.totalRevenue) * 100).toFixed(1) 
    : '0';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Order Source Analysis
          </CardTitle>
          
          {/* Source Filter Toggle */}
          <ToggleGroup 
            type="single" 
            value={sourceFilter} 
            onValueChange={(value) => value && onSourceFilterChange(value as OrderSourceFilter)}
            className="bg-muted/50 rounded-lg p-1"
          >
            <ToggleGroupItem 
              value="all" 
              size="sm"
              className="text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3"
            >
              All Orders
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="registered" 
              size="sm"
              className="text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3"
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Registered
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="guest" 
              size="sm"
              className="text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3"
            >
              <UserX className="h-3 w-3 mr-1" />
              Guest
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="space-y-4">
            {/* Registered Orders Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-xl bg-primary/10 border border-primary/20"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Registered</span>
                </div>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                  {registeredPercentage}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-lg font-bold">{stats.registeredOrders.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(stats.registeredRevenue)}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-primary/10">
                <p className="text-xs text-muted-foreground">Avg. Order Value</p>
                <p className="text-sm font-semibold">{formatCurrency(stats.registeredAOV)}</p>
              </div>
            </motion.div>

            {/* Guest Orders Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl bg-muted/50 border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-muted">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">Guest</span>
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  {guestPercentage}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="text-lg font-bold">{stats.guestOrders.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.guestRevenue)}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Avg. Order Value</p>
                <p className="text-sm font-semibold">{formatCurrency(stats.guestAOV)}</p>
              </div>
            </motion.div>
          </div>

          {/* Orders Pie Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <ShoppingCart className="h-4 w-4" />
              Orders Distribution
            </p>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {orderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString()}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-2xl font-bold mt-1">
              {stats.totalOrders.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">total</span>
            </p>
          </motion.div>

          {/* Revenue Pie Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Revenue Distribution
            </p>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-2xl font-bold mt-1">
              {formatCurrency(stats.totalRevenue)}
              <span className="text-sm font-normal text-muted-foreground ml-1">total</span>
            </p>
          </motion.div>
        </div>

        {/* Insight Banner */}
        {stats.registeredOrders > 0 && stats.guestOrders > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/10"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm">
                <span className="font-medium text-primary">{registeredRevenuePercentage}%</span>
                <span className="text-muted-foreground"> of revenue comes from registered customers. </span>
                {Number(registeredRevenuePercentage) > 50 ? (
                  <span className="text-muted-foreground">Great customer loyalty!</span>
                ) : (
                  <span className="text-muted-foreground">Consider incentivizing account creation.</span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}