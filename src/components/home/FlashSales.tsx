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
  subcategory: { name: string; min_selling_price?: number | null } | null;
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
    <div className="flex items-center gap-1.5">
      {[
        { value: timeLeft.hours, label: 'H' },
        { value: timeLeft.minutes, label: 'M' },
        { value: timeLeft.seconds, label: 'S' },
      ].map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-1.5">
          <div className="bg-destructive text-destructive-foreground text-sm font-bold rounded-md px-2 py-1 min-w-[36px] text-center tabular-nums">
            {String(unit.value).padStart(2, '0')}
            <span className="text-[10px] font-medium ml-0.5 opacity-80">{unit.label}</span>
          </div>
          {i < 2 && <span className="text-destructive font-bold text-lg">:</span>}
        </div>
      ))}
    </div>
  );
});

export const FlashSales = memo(function FlashSales({ products, isLoading }: FlashSalesProps) {
  if (isLoading) {
    return (
      <section className="py-10 md:py-12 lg:py-16 bg-gradient-to-r from-destructive/5 via-background to-destructive/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
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
    <section className="py-10 md:py-12 lg:py-16 bg-gradient-to-br from-destructive/5 via-background to-primary/5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-destructive/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 md:mb-8 animate-fade-in">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive text-sm font-semibold rounded-full mb-3">
              <Zap className="w-4 h-4 fill-current" />
              Flash Sale — Limited Time
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Today's Hot Deals
            </h2>
            <div className="flex items-center gap-3 mt-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Ends in</span>
              <CountdownTimer />
            </div>
          </div>
          <Button asChild variant="outline" className="rounded-full group self-start sm:self-auto border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
            <Link to="/shop" className="flex items-center gap-2">
              View All Sales
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {products.map((product, index) => {
            const sellingPrice = product.selling_price ?? product.subcategory?.min_selling_price ?? null;
            const discount = sellingPrice != null && product.cost_price > 0
              ? Math.round(((product.cost_price - sellingPrice) / product.cost_price) * 100)
              : 0;

            const displayPrice = sellingPrice ?? product.cost_price ?? 0;

            return (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <HomeProductCard
                  product={product}
                  className="border-2 border-destructive/20 hover:border-destructive/40 hover:shadow-xl transition-all duration-300"
                  badge={
                    discount > 0 ? (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full shadow-lg">
                          <Zap className="w-3 h-3 fill-current" />
                          {discount}% OFF
                        </span>
                      </div>
                    ) : null
                  }
                  priceSlot={
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-bold text-destructive">
                        Rs. {displayPrice.toLocaleString()}
                      </p>
                      {discount > 0 && (
                        <p className="text-sm text-muted-foreground line-through">
                          Rs. {product.cost_price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
