import { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Clock } from 'lucide-react';
import { HomeProductCard } from './HomeProductCard';

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  cost_price: number;
  image_url: string | null;
  subcategory: { name: string; min_selling_price?: number | null; max_selling_price?: number | null } | null;
  has_color_variants?: boolean;
}

interface FlashSalesProps {
  products: Product[];
  isLoading: boolean;
}

const CountdownTimer = memo(function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const getEndOfDay = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return end;
    };

    const updateTimer = () => {
      const now = new Date();
      const end = getEndOfDay();
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) return;
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 bg-background border border-destructive/20 px-3 py-1.5 rounded-xl shadow-2xs">
      <Clock className="w-3.5 h-3.5 text-destructive animate-pulse" />
      <span className="text-xs font-semibold text-muted-foreground mr-1 hidden xs:inline">Ends in:</span>
      {[
        { value: timeLeft.hours, label: 'h' },
        { value: timeLeft.minutes, label: 'm' },
        { value: timeLeft.seconds, label: 's' },
      ].map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-1">
          <div className="bg-destructive text-destructive-foreground text-xs font-black rounded-md px-1.5 py-0.5 min-w-[28px] text-center tabular-nums shadow-2xs">
            {String(unit.value).padStart(2, '0')}
            <span className="text-[9px] font-bold ml-0.5 opacity-80">{unit.label}</span>
          </div>
          {i < 2 && <span className="text-destructive font-black text-xs">:</span>}
        </div>
      ))}
    </div>
  );
});

export const FlashSales = memo(function FlashSales({ products, isLoading }: FlashSalesProps) {
  if (isLoading) {
    return (
      <section className="py-10 md:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted rounded-2xl aspect-square animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-16 lg:py-20 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Center Aligned Section Header */}
        <div className="text-center mb-8 md:mb-12 space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide bg-destructive/10 text-destructive border border-destructive/20 shadow-2xs">
            <Zap className="w-3.5 h-3.5 fill-current animate-bounce" />
            Flash Sale — Limited Time
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Flash Deals of the Day
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            Grab premium socks at extraordinary discounted prices before stock runs out
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            <CountdownTimer />
            <Button asChild variant="ghost" className="group text-xs sm:text-sm font-semibold">
              <Link to="/shop" className="flex items-center gap-1.5 text-destructive hover:text-destructive">
                View All Deals
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <HomeProductCard
                product={product}
                className="border-destructive/20 hover:border-destructive/40"
                badge={
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-extrabold rounded-full shadow-xs">
                      <Zap className="w-3 h-3 fill-current" />
                      Flash Deal
                    </span>
                  </div>
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
