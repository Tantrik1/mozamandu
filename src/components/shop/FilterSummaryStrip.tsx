import { memo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterItem {
  id: string;
  label: string;
  type: 'category' | 'subcategory' | 'color' | 'price' | 'search';
  colorHex?: string;
}

interface FilterSummaryStripProps {
  filters: FilterItem[];
  onRemove: (id: string, type: string) => void;
  onClearAll: () => void;
  productCount: number;
  className?: string;
}

export const FilterSummaryStrip = memo(function FilterSummaryStrip({
  filters,
  onRemove,
  onClearAll,
  productCount,
  className,
}: FilterSummaryStripProps) {
  if (filters.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Showing all {productCount} products
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground mr-1">
        {productCount} result{productCount !== 1 ? 's' : ''} for:
      </span>
      
      {filters.map((filter, index) => (
        <span key={`${filter.type}-${filter.id}`} className="inline-flex items-center">
          {index > 0 && <span className="text-muted-foreground mx-1">·</span>}
          <button
            onClick={() => onRemove(filter.id, filter.type)}
            className={cn(
              "inline-flex items-center gap-1 text-sm font-medium text-foreground",
              "hover:text-primary transition-colors group"
            )}
          >
            {filter.colorHex && (
              <span
                className="w-3 h-3 rounded-full border border-border"
                style={{ backgroundColor: filter.colorHex }}
              />
            )}
            <span>{filter.label}</span>
            <X className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
          </button>
        </span>
      ))}
      
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
});
