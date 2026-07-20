import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';

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
    `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const stats = [
    { label: "Today's Revenue", value: formatCurrency(todayRevenue), icon: Zap, highlight: true },
    { label: "Yesterday's Revenue", value: formatCurrency(yesterdayRevenue) },
    { label: 'Selected Period', value: formatCurrency(last7DaysRevenue), icon: Target },
    { label: 'Month-to-Date', value: formatCurrency(mtdRevenue) },
    { label: 'Year-to-Date', value: formatCurrency(ytdRevenue) },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <Card className="overflow-hidden border-primary/10">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          Time-Based Sales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-3 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat, index) => (
            <motion.div 
              key={stat.label} 
              variants={itemVariants}
              className={`
                p-3 rounded-xl transition-all duration-300 hover:scale-[1.02]
                ${stat.highlight 
                  ? 'bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20' 
                  : 'bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                {stat.icon && <stat.icon className="h-3.5 w-3.5 text-primary" />}
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <motion.p 
                className="text-sm font-semibold text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={stat.value}
              >
                {stat.value}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>

        {/* Growth Indicators */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/30">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`
              p-4 rounded-xl flex items-center gap-3 transition-all
              ${revenueGrowth >= 0 
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30' 
                : 'bg-gradient-to-br from-red-50 to-red-100/30 dark:from-red-950/40 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/30'
              }
            `}
          >
            <div className={`
              p-2 rounded-lg
              ${revenueGrowth >= 0 
                ? 'bg-emerald-100 dark:bg-emerald-900/50' 
                : 'bg-red-100 dark:bg-red-900/50'
              }
            `}>
              {revenueGrowth >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue Growth</p>
              <p className={`text-lg font-bold ${revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`
              p-4 rounded-xl flex items-center gap-3 transition-all
              ${ordersGrowth >= 0 
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30' 
                : 'bg-gradient-to-br from-red-50 to-red-100/30 dark:from-red-950/40 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/30'
              }
            `}
          >
            <div className={`
              p-2 rounded-lg
              ${ordersGrowth >= 0 
                ? 'bg-emerald-100 dark:bg-emerald-900/50' 
                : 'bg-red-100 dark:bg-red-900/50'
              }
            `}>
              {ordersGrowth >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Orders Growth</p>
              <p className={`text-lg font-bold ${ordersGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {ordersGrowth >= 0 ? '+' : ''}{ordersGrowth.toFixed(1)}%
              </p>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
