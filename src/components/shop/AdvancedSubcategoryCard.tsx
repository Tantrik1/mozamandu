import { memo } from 'react';
import { ArrowRight, Package, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedSubcategoryCardProps {
  subcategory: {
    id: string;
    name: string;
    image_url?: string;
    selling_price: number;
    minimum_quantity?: number;
  };
  index: number;
  onClick: (id: string) => void;
}

export const AdvancedSubcategoryCard = memo(function AdvancedSubcategoryCard({
  subcategory,
  index,
  onClick,
}: AdvancedSubcategoryCardProps) {
  return (
    <button
      onClick={() => onClick(subcategory.id)}
      className={cn(
        "group relative aspect-square rounded-3xl overflow-hidden",
        "bg-card border-2 border-border/50",
        "transition-all duration-500 ease-out",
        "hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/10",
        "transform hover:scale-[1.02] hover:rotate-1",
        "animate-fade-in"
      )}
      style={{ 
        animationDelay: `${index * 100}ms`, 
        animationFillMode: 'backwards' 
      }}
    >
      {/* Image Layer with Parallax Effect */}
      {subcategory.image_url ? (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={subcategory.image_url}
            alt={subcategory.name}
            className="absolute inset-[-10%] w-[120%] h-[120%] object-cover transition-all duration-700 ease-out group-hover:scale-105 group-hover:translate-y-[-2%]"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-secondary/10 to-muted/30 flex items-center justify-center">
          <Package className="w-16 h-16 text-muted-foreground/40" />
        </div>
      )}

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-all duration-500" />
      <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Animated Shine Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out rotate-12" />
      </div>

      {/* Color Accent Border Animation */}
      <div className={cn(
        "absolute inset-0 rounded-3xl",
        "border-2 border-transparent",
        "group-hover:border-gradient-to-r group-hover:from-accent group-hover:to-primary",
        "transition-all duration-500"
      )}>
        <div className="absolute inset-0 rounded-3xl border-2 border-accent/0 group-hover:border-accent/40 transition-all duration-500" />
      </div>

      {/* Price Badge - Top Right (Glassmorphism) */}
      <div className="absolute top-4 right-4 z-10">
        <div className={cn(
          "px-3 py-2 rounded-xl",
          "bg-primary/90 backdrop-blur-sm",
          "text-primary-foreground font-bold text-sm",
          "shadow-lg shadow-primary/30",
          "transform transition-all duration-300",
          "group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/40"
        )}>
          Rs.{subcategory.selling_price}
        </div>
      </div>

      {/* Min Order Badge - Top Left */}
      {subcategory.minimum_quantity && subcategory.minimum_quantity > 1 && (
        <div className="absolute top-4 left-4 z-10">
          <div className={cn(
            "px-2.5 py-1.5 rounded-lg",
            "bg-white/15 backdrop-blur-md border border-white/20",
            "text-white text-xs font-medium",
            "flex items-center gap-1.5",
            "transform transition-all duration-300",
            "group-hover:bg-white/25"
          )}>
            <ShoppingBag className="w-3 h-3" />
            Min: {subcategory.minimum_quantity}
          </div>
        </div>
      )}

      {/* Bottom Info Panel with Glassmorphism */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className={cn(
          "rounded-2xl p-4",
          "bg-white/10 backdrop-blur-xl border border-white/20",
          "transform transition-all duration-500",
          "translate-y-1 group-hover:translate-y-0",
          "shadow-lg"
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white mb-1 line-clamp-1 group-hover:text-white transition-colors">
                {subcategory.name}
              </h3>
              <p className="text-xs text-white/60 font-medium">
                From Rs.{subcategory.selling_price}/piece
              </p>
            </div>
            
            {/* Arrow Button */}
            <div className={cn(
              "flex-shrink-0 w-9 h-9 rounded-full",
              "bg-white/20 backdrop-blur-sm",
              "flex items-center justify-center",
              "transform transition-all duration-300",
              "group-hover:bg-white/30 group-hover:scale-110"
            )}>
              <ArrowRight className="w-4 h-4 text-white transform transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Animation Indicator */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn(
          "absolute bottom-16 right-6 w-2 h-2 rounded-full bg-accent/50",
          "opacity-0 group-hover:opacity-100",
          "animate-ping transition-opacity duration-300"
        )} />
      </div>
    </button>
  );
});
