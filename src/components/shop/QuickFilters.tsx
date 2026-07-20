import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp, Clock, DollarSign } from 'lucide-react';

interface QuickFilter {
  id: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
  type: 'price' | 'sort' | 'tag';
}

interface QuickFiltersProps {
  activeFilters: string[];
  onFilterToggle: (filterId: string, type: string, value: string) => void;
  className?: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: 'bestseller', label: 'Best Sellers', icon: <TrendingUp className="w-3.5 h-3.5" />, value: 'bestseller', type: 'sort' },
  { id: 'new', label: 'New Arrivals', icon: <Clock className="w-3.5 h-3.5" />, value: 'newest', type: 'sort' },
  { id: 'under500', label: 'Under ₹500', icon: <DollarSign className="w-3.5 h-3.5" />, value: '500', type: 'price' },
  { id: 'under1000', label: 'Under ₹1000', value: '1000', type: 'price' },
  { id: 'featured', label: 'Featured', icon: <Sparkles className="w-3.5 h-3.5" />, value: 'featured', type: 'tag' },
];

export const QuickFilters = memo(function QuickFilters({
  activeFilters,
  onFilterToggle,
  className,
}: QuickFiltersProps) {
  return (
    <div className={cn("overflow-x-auto scrollbar-hide -mx-4 px-4", className)}>
      <div className="flex items-center gap-2 pb-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap mr-1">Popular:</span>
        {QUICK_FILTERS.map((filter) => {
          const isActive = activeFilters.includes(filter.id);
          return (
            <button
              key={filter.id}
              onClick={() => onFilterToggle(filter.id, filter.type, filter.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              {filter.icon}
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});
