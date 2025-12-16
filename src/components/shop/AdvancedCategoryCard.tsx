import { memo } from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedCategoryCardProps {
  category: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
  };
  index: number;
  subcategoryCount?: number;
  onClick: (id: string) => void;
}

export const AdvancedCategoryCard = memo(function AdvancedCategoryCard({
  category,
  index,
  subcategoryCount = 0,
  onClick,
}: AdvancedCategoryCardProps) {
  return (
    <button
      onClick={() => onClick(category.id)}
      className={cn(
        "group relative aspect-square rounded-3xl overflow-hidden",
        "bg-card border-2 border-transparent",
        "transition-all duration-500 ease-out",
        "hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20",
        "transform hover:scale-[1.02] hover:-rotate-1",
        "animate-fade-in"
      )}
      style={{ 
        animationDelay: `${index * 100}ms`, 
        animationFillMode: 'backwards' 
      }}
    >
      {/* Image Layer */}
      {category.image_url ? (
        <img
          src={category.image_url}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 flex items-center justify-center">
          <Layers className="w-16 h-16 text-muted-foreground/50" />
        </div>
      )}

      {/* Multi-layer Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5 transition-all duration-500 group-hover:from-black/90" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Animated Shine Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out skew-x-12" />
      </div>

      {/* Pulsing Glow Border on Hover */}
      <div className="absolute inset-0 rounded-3xl border-2 border-primary/0 group-hover:border-primary/50 transition-all duration-500 group-hover:animate-pulse" />

      {/* Item Count Badge - Top Left */}
      {subcategoryCount > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <div className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold",
            "bg-white/10 backdrop-blur-md border border-white/20",
            "text-white shadow-lg",
            "transform transition-all duration-300",
            "group-hover:bg-white/20 group-hover:scale-105"
          )}>
            {subcategoryCount} {subcategoryCount === 1 ? 'item' : 'items'}
          </div>
        </div>
      )}

      {/* Floating Arrow - Top Right */}
      <div className={cn(
        "absolute top-4 right-4 z-10",
        "w-10 h-10 rounded-full",
        "bg-white/10 backdrop-blur-md border border-white/20",
        "flex items-center justify-center",
        "transform transition-all duration-500",
        "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100",
        "group-hover:rotate-[-45deg]"
      )}>
        <ArrowRight className="w-5 h-5 text-white" />
      </div>

      {/* Glassmorphism Info Panel - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className={cn(
          "rounded-2xl p-4",
          "bg-white/10 backdrop-blur-xl border border-white/20",
          "transform transition-all duration-500",
          "translate-y-2 group-hover:translate-y-0",
          "shadow-lg"
        )}>
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
            {category.name}
          </h3>
          
          {category.description && (
            <p className="text-xs text-white/70 line-clamp-2 mb-2 transition-all duration-300 max-h-0 opacity-0 group-hover:max-h-10 group-hover:opacity-100">
              {category.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <span className="opacity-70 group-hover:opacity-100 transition-opacity">
              Explore Collection
            </span>
            <ArrowRight className="w-4 h-4 transform translate-x-0 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </button>
  );
});
