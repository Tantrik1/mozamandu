import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Percent, RotateCcw, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoreBusinessStatsProps {
  totalRevenue: number;
  totalOrders: number;
  netProfit: number;
  grossMargin: number;
  averageOrderValue: number;
  conversionRate?: number;
  refundRate: number;
  returnRate?: number;
}

export function CoreBusinessStats({
  totalRevenue,
  totalOrders,
  netProfit,
  grossMargin,
  averageOrderValue,
  refundRate,
}: CoreBusinessStatsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 6 Core Stats (Conversion Rate & Return Rate Removed as requested)
  const stats = [
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: `Rs. ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      borderColor: 'border-emerald-500/20 dark:border-emerald-500/30',
      glowColor: 'hover:shadow-emerald-500/15'
    },
    {
      id: 'orders',
      label: 'Total Orders',
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
      borderColor: 'border-blue-500/20 dark:border-blue-500/30',
      glowColor: 'hover:shadow-blue-500/15'
    },
    {
      id: 'profit',
      label: 'Net Profit',
      value: `Rs. ${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      color: netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      bgColor: netProfit >= 0 
        ? 'bg-emerald-500/10 dark:bg-emerald-500/20'
        : 'bg-rose-500/10 dark:bg-rose-500/20',
      borderColor: netProfit >= 0 ? 'border-emerald-500/20 dark:border-emerald-500/30' : 'border-rose-500/20 dark:border-rose-500/30',
      glowColor: netProfit >= 0 ? 'hover:shadow-emerald-500/15' : 'hover:shadow-rose-500/15'
    },
    {
      id: 'margin',
      label: 'Gross Margin',
      value: `${grossMargin.toFixed(1)}%`,
      icon: Percent,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
      borderColor: 'border-purple-500/20 dark:border-purple-500/30',
      glowColor: 'hover:shadow-purple-500/15'
    },
    {
      id: 'aov',
      label: 'Avg Order Value',
      value: `Rs. ${averageOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
      borderColor: 'border-amber-500/20 dark:border-amber-500/30',
      glowColor: 'hover:shadow-amber-500/15'
    },
    {
      id: 'cancellation',
      label: 'Cancellation Rate',
      value: `${refundRate.toFixed(1)}%`,
      icon: RotateCcw,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
      borderColor: 'border-orange-500/20 dark:border-orange-500/30',
      glowColor: 'hover:shadow-orange-500/15'
    }
  ];

  // Auto-slide 3 seconds timer
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % stats.length;
        scrollToCard(nextIndex);
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, stats.length]);

  const scrollToCard = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.scrollWidth / stats.length;
      container.scrollTo({
        left: cardWidth * index,
        behavior: 'smooth',
      });
    }
  };

  const handleNext = () => {
    const nextIndex = (activeIndex + 1) % stats.length;
    setActiveIndex(nextIndex);
    scrollToCard(nextIndex);
  };

  const handlePrev = () => {
    const prevIndex = (activeIndex - 1 + stats.length) % stats.length;
    setActiveIndex(prevIndex);
    scrollToCard(prevIndex);
  };

  return (
    <div className="space-y-3">
      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h2 className="text-base font-bold text-foreground tracking-tight">Core Business Stats</h2>
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">(6 Key Metrics)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Play Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            title={isAutoPlaying ? "Pause Auto-Slide (3s)" : "Start Auto-Slide (3s)"}
          >
            {isAutoPlaying ? <Pause className="h-3.5 w-3.5 text-primary animate-pulse" /> : <Play className="h-3.5 w-3.5" />}
          </Button>

          {/* Nav Arrows */}
          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* One-Row Carousel Container */}
      <div 
        className="relative group"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <div
          ref={scrollContainerRef}
          className="grid grid-cols-3 sm:grid-cols-6 gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory touch-pan-x"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.id}
                className="snap-start min-w-[110px] sm:min-w-0"
              >
                <Card
                  onClick={() => {
                    setActiveIndex(index);
                    scrollToCard(index);
                  }}
                  className={`
                    relative overflow-hidden border ${stat.borderColor} rounded-xl shadow-2xs cursor-pointer
                  `}
                >
                  {/* Background Color Tint */}
                  <div className={`absolute inset-0 ${stat.bgColor} opacity-30`} />

                  <CardContent className="relative p-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground tracking-tight truncate">
                        {stat.label}
                      </span>
                      <div className={`p-1 rounded-md ${stat.bgColor} ${stat.color} shrink-0`}>
                        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-extrabold text-foreground tracking-tight truncate">
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Mobile Pagination Dot Indicators */}
        <div className="flex items-center justify-center gap-1.5 pt-1 lg:hidden">
          {stats.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveIndex(i);
                scrollToCard(i);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
