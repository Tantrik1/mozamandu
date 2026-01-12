import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Clock, Truck, CheckCircle, XCircle, RotateCcw, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface OrderPerformanceStatsProps {
  paidOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  codOrders: number;
  prepaidOrders: number;
  failedPayments: number;
}

export function OrderPerformanceStats({
  paidOrders,
  pendingOrders,
  shippedOrders,
  deliveredOrders,
  cancelledOrders,
  returnedOrders,
  codOrders,
  prepaidOrders,
  failedPayments
}: OrderPerformanceStatsProps) {
  const totalOrders = paidOrders + pendingOrders + shippedOrders + deliveredOrders + cancelledOrders + returnedOrders;
  
  const stats = [
    { 
      label: 'Paid', 
      value: paidOrders, 
      icon: CheckCircle, 
      color: 'text-emerald-600', 
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
      border: 'border-emerald-200/50 dark:border-emerald-800/30',
      percent: totalOrders > 0 ? (paidOrders / totalOrders * 100) : 0
    },
    { 
      label: 'Pending', 
      value: pendingOrders, 
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20',
      border: 'border-amber-200/50 dark:border-amber-800/30',
      percent: totalOrders > 0 ? (pendingOrders / totalOrders * 100) : 0
    },
    { 
      label: 'Shipped', 
      value: shippedOrders, 
      icon: Truck, 
      color: 'text-blue-600', 
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20',
      border: 'border-blue-200/50 dark:border-blue-800/30',
      percent: totalOrders > 0 ? (shippedOrders / totalOrders * 100) : 0
    },
    { 
      label: 'Delivered', 
      value: deliveredOrders, 
      icon: CheckCircle, 
      color: 'text-emerald-600', 
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
      border: 'border-emerald-200/50 dark:border-emerald-800/30',
      percent: totalOrders > 0 ? (deliveredOrders / totalOrders * 100) : 0
    },
    { 
      label: 'Cancelled', 
      value: cancelledOrders, 
      icon: XCircle, 
      color: 'text-red-600', 
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20',
      border: 'border-red-200/50 dark:border-red-800/30',
      percent: totalOrders > 0 ? (cancelledOrders / totalOrders * 100) : 0
    },
    { 
      label: 'Returned', 
      value: returnedOrders, 
      icon: RotateCcw, 
      color: 'text-orange-600', 
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20',
      border: 'border-orange-200/50 dark:border-orange-800/30',
      percent: totalOrders > 0 ? (returnedOrders / totalOrders * 100) : 0
    },
    { 
      label: 'COD', 
      value: codOrders, 
      icon: Wallet, 
      color: 'text-purple-600', 
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20',
      border: 'border-purple-200/50 dark:border-purple-800/30',
      percent: totalOrders > 0 ? (codOrders / totalOrders * 100) : 0
    },
    { 
      label: 'Prepaid', 
      value: prepaidOrders, 
      icon: CreditCard, 
      color: 'text-cyan-600', 
      bg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/40 dark:to-cyan-900/20',
      border: 'border-cyan-200/50 dark:border-cyan-800/30',
      percent: totalOrders > 0 ? (prepaidOrders / totalOrders * 100) : 0
    },
    { 
      label: 'Failed', 
      value: failedPayments, 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20',
      border: 'border-red-200/50 dark:border-red-800/30',
      percent: totalOrders > 0 ? (failedPayments / totalOrders * 100) : 0
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.03 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <Card className="overflow-hidden border-primary/10">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          Order Performance
          <span className="ml-auto text-xs font-normal text-muted-foreground px-2 py-1 rounded-full bg-muted">
            {totalOrders} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div 
          className="grid grid-cols-3 gap-2.5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat) => (
            <motion.div 
              key={stat.label} 
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              className={`
                p-3 rounded-xl border ${stat.border} ${stat.bg}
                transition-all duration-300 cursor-default
                hover:shadow-md
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              
              <motion.p 
                className={`text-xl font-bold ${stat.color}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={stat.value}
              >
                {stat.value.toLocaleString()}
              </motion.p>
              
              {/* Mini Progress Bar */}
              <div className="mt-2 h-1 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${stat.color.replace('text-', 'bg-')}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stat.percent, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stat.percent.toFixed(1)}%
              </p>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
