import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, UserCheck, Repeat, DollarSign, ShoppingCart, UserMinus, Crown, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface TopCustomer {
  name: string;
  email: string;
  totalSpent: number;
  ordersCount: number;
}

interface CustomerStatsPanelProps {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatPurchaseRate: number;
  customerLifetimeValue: number;
  avgOrdersPerCustomer: number;
  churnRate: number;
  highValueCustomersCount: number;
  topCustomers: TopCustomer[];
}

export function CustomerStatsPanel({
  totalCustomers,
  newCustomers,
  returningCustomers,
  repeatPurchaseRate,
  customerLifetimeValue,
  avgOrdersPerCustomer,
  churnRate,
  highValueCustomersCount,
  topCustomers
}: CustomerStatsPanelProps) {
  const stats = [
    { 
      label: 'Total Customers', 
      value: totalCustomers.toLocaleString(), 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20',
      border: 'border-blue-200/50 dark:border-blue-800/30'
    },
    { 
      label: 'New Customers', 
      value: newCustomers.toLocaleString(), 
      icon: UserPlus, 
      color: 'text-emerald-600', 
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
      border: 'border-emerald-200/50 dark:border-emerald-800/30'
    },
    { 
      label: 'Returning', 
      value: returningCustomers.toLocaleString(), 
      icon: UserCheck, 
      color: 'text-purple-600', 
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20',
      border: 'border-purple-200/50 dark:border-purple-800/30'
    },
    { 
      label: 'Repeat Rate', 
      value: repeatPurchaseRate.toFixed(1) + '%', 
      icon: Repeat, 
      color: 'text-cyan-600', 
      bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/40 dark:to-cyan-900/20',
      border: 'border-cyan-200/50 dark:border-cyan-800/30'
    },
    { 
      label: 'CLV', 
      value: `Rs. ${customerLifetimeValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 
      icon: DollarSign, 
      color: 'text-orange-600', 
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20',
      border: 'border-orange-200/50 dark:border-orange-800/30'
    },
    { 
      label: 'Avg Orders', 
      value: avgOrdersPerCustomer.toFixed(1), 
      icon: ShoppingCart, 
      color: 'text-indigo-600', 
      bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20',
      border: 'border-indigo-200/50 dark:border-indigo-800/30'
    },
    { 
      label: 'Churn Rate', 
      value: churnRate.toFixed(1) + '%', 
      icon: UserMinus, 
      color: churnRate > 20 ? 'text-red-600' : 'text-amber-600', 
      bg: churnRate > 20 
        ? 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20'
        : 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20',
      border: churnRate > 20 
        ? 'border-red-200/50 dark:border-red-800/30'
        : 'border-amber-200/50 dark:border-amber-800/30'
    },
    { 
      label: 'High Value', 
      value: highValueCustomersCount.toLocaleString(), 
      icon: Crown, 
      color: 'text-amber-600', 
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20',
      border: 'border-amber-200/50 dark:border-amber-800/30'
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Card className="overflow-hidden border-primary/10">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          Customer Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat) => (
            <motion.div 
              key={stat.label} 
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className={`p-3 rounded-xl border ${stat.border} ${stat.bg} transition-all duration-300 hover:shadow-md`}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <motion.p 
                className={`text-lg font-bold ${stat.color}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={stat.value}
              >
                {stat.value}
              </motion.p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Top Customers List */}
        <div className="pt-3 border-t border-border/30">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-600" />
            Top Customers
            <TrendingUp className="h-3 w-3 text-emerald-500 ml-auto" />
          </h4>
          <div className="space-y-2">
            {topCustomers.slice(0, 5).map((customer, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Badge 
                    variant="outline" 
                    className={`
                      shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold
                      ${index === 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}
                      ${index === 1 ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                      ${index === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' : ''}
                    `}
                  >
                    {index + 1}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {customer.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-emerald-600">
                    Rs. {customer.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{customer.ordersCount} orders</p>
                </div>
              </motion.div>
            ))}
            {topCustomers.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No customer data available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
