import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Percent, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface CoreBusinessStatsProps {
  totalRevenue: number;
  totalOrders: number;
  netProfit: number;
  grossMargin: number;
  averageOrderValue: number;
  conversionRate: number;
  refundRate: number;
  returnRate: number;
}

export function CoreBusinessStats({
  totalRevenue,
  totalOrders,
  netProfit,
  grossMargin,
  averageOrderValue,
  conversionRate,
  refundRate,
  returnRate
}: CoreBusinessStatsProps) {
  const stats = [
    {
      label: 'Total Revenue',
      value: `Rs. ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
      borderColor: 'border-emerald-200/50 dark:border-emerald-800/30',
      glowColor: 'shadow-emerald-500/10'
    },
    {
      label: 'Total Orders',
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20',
      borderColor: 'border-blue-200/50 dark:border-blue-800/30',
      glowColor: 'shadow-blue-500/10'
    },
    {
      label: 'Net Profit',
      value: `Rs. ${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      color: netProfit >= 0 ? 'text-emerald-600' : 'text-red-600',
      bgColor: netProfit >= 0 
        ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20'
        : 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20',
      borderColor: netProfit >= 0 ? 'border-emerald-200/50 dark:border-emerald-800/30' : 'border-red-200/50 dark:border-red-800/30',
      glowColor: netProfit >= 0 ? 'shadow-emerald-500/10' : 'shadow-red-500/10'
    },
    {
      label: 'Gross Margin',
      value: `${grossMargin.toFixed(1)}%`,
      icon: Percent,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20',
      borderColor: 'border-purple-200/50 dark:border-purple-800/30',
      glowColor: 'shadow-purple-500/10'
    },
    {
      label: 'Avg Order Value',
      value: `Rs. ${averageOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20',
      borderColor: 'border-orange-200/50 dark:border-orange-800/30',
      glowColor: 'shadow-orange-500/10'
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/40 dark:to-cyan-900/20',
      borderColor: 'border-cyan-200/50 dark:border-cyan-800/30',
      glowColor: 'shadow-cyan-500/10'
    },
    {
      label: 'Cancellation Rate',
      value: `${refundRate.toFixed(1)}%`,
      icon: RotateCcw,
      color: 'text-amber-600',
      bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20',
      borderColor: 'border-amber-200/50 dark:border-amber-800/30',
      glowColor: 'shadow-amber-500/10'
    },
    {
      label: 'Return Rate',
      value: `${returnRate.toFixed(1)}%`,
      icon: RotateCcw,
      color: 'text-rose-600',
      bgColor: 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/40 dark:to-rose-900/20',
      borderColor: 'border-rose-200/50 dark:border-rose-800/30',
      glowColor: 'shadow-rose-500/10'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Core Business Stats
        </h2>
      </div>
      <motion.div 
        className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stats.map((stat, index) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className={`
              group relative overflow-hidden border ${stat.borderColor}
              hover:shadow-lg ${stat.glowColor} transition-all duration-300
              hover:-translate-y-0.5
            `}>
              {/* Animated background gradient */}
              <div className={`absolute inset-0 ${stat.bgColor} opacity-60`} />
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5" />
              
              <CardContent className="relative p-3 sm:p-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <motion.div 
                      className={`p-1.5 sm:p-2 rounded-xl ${stat.bgColor} border ${stat.borderColor} shrink-0`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                    </motion.div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                  <motion.p 
                    className="text-base sm:text-lg font-bold text-foreground break-all leading-tight"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={stat.value}
                  >
                    {stat.value}
                  </motion.p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
