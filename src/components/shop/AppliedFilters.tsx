import { memo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppliedFilter {
  id: string;
  label: string;
  type: 'category' | 'subcategory' | 'color' | 'price' | 'sort' | 'search';
  colorHex?: string;
}

interface AppliedFiltersProps {
  filters: AppliedFilter[];
  onRemove: (filterId: string, type: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const AppliedFilters = memo(function AppliedFilters({
  filters,
  onRemove,
  onClearAll,
  className,
}: AppliedFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {filters.map((filter) => (
        <button
          key={`${filter.type}-${filter.id}`}
          onClick={() => onRemove(filter.id, filter.type)}
          className={cn(
            "inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-medium",
            "bg-primary/10 text-primary border border-primary/20",
            "hover:bg-primary/20 transition-colors group"
          )}
        >
          {filter.colorHex && (
            <span
              className="w-3 h-3 rounded-full border border-primary/30"
              style={{ backgroundColor: filter.colorHex }}
            />
          )}
          <span>{filter.label}</span>
          <X className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
      
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
});
