import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MobileFilterBarProps {
  filterCount: number;
  onFilterClick: () => void;
  onSortClick: () => void;
  sortLabel?: string;
  className?: string;
}

export function MobileFilterBar({
  filterCount,
  onFilterClick,
  onSortClick,
  sortLabel = 'Sort',
  className,
}: MobileFilterBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
        "bg-background/95 backdrop-blur-lg border-t border-border",
        "px-4 py-3 safe-area-bottom",
        className
      )}
    >
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        {/* Filter Button */}
        <Button
          variant="outline"
          onClick={onFilterClick}
          className="flex-1 h-12 rounded-xl font-medium relative"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
          {filterCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 bg-primary text-primary-foreground text-xs"
            >
              {filterCount}
            </Badge>
          )}
        </Button>

        {/* Sort Button */}
        <Button
          variant="outline"
          onClick={onSortClick}
          className="flex-1 h-12 rounded-xl font-medium"
        >
          <ArrowUpDown className="w-4 h-4 mr-2" />
          {sortLabel}
        </Button>
      </div>
    </div>
  );
}
