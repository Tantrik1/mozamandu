import { memo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  image_url?: string;
}

interface Subcategory {
  id: string;
  name: string;
  image_url?: string;
  category_id: string;
}

interface CategorySubcategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onCategorySelect: (id: string | null) => void;
  selectedSubcategoryId: string | null;
  onSubcategorySelect: (id: string | null) => void;
  onMoreFilters: () => void;
  activeFilterCount: number;
  isVisible?: boolean;
  topOffset?: number;
}

const fetchSubcategories = async (categoryId: string): Promise<Subcategory[]> => {
  const { data } = await supabase
    .from('subcategories')
    .select('id, name, image_url, category_id')
    .eq('category_id', categoryId)
    .eq('status', 'on')
    .order('name');
  return data || [];
};

export const CategorySubcategoryBar = memo(function CategorySubcategoryBar({
  categories,
  selectedCategoryId,
  onCategorySelect,
  selectedSubcategoryId,
  onSubcategorySelect,
  onMoreFilters,
  activeFilterCount,
  isVisible = true,
  topOffset = 0,
}: CategorySubcategoryBarProps) {
  // Fetch subcategories when a category is selected
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', selectedCategoryId],
    queryFn: () => fetchSubcategories(selectedCategoryId!),
    enabled: !!selectedCategoryId,
    staleTime: 5 * 60 * 1000,
  });

  if (!isVisible) return null;

  return (
    <div
      className="bg-background/95 backdrop-blur-md border-b border-border/60 sticky z-30 transition-all duration-300"
      style={{ top: `${topOffset}px` }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 space-y-2">
        {/* Row 1: Filter Button + Categories Horizontal Scroll Bar */}
        <div
          className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-4 px-4 touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Main Filter Action Button */}
          <button
            onClick={onMoreFilters}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border shadow-2xs shrink-0',
              activeFilterCount > 0
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border/80 hover:border-primary/40 text-foreground'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="h-4.5 min-w-4 px-1 bg-background text-foreground text-[10px] font-extrabold ml-0.5">
                {activeFilterCount}
              </Badge>
            )}
          </button>

          <div className="w-px h-5 bg-border/60 shrink-0 mx-0.5" />

          {/* "All Products" Pill */}
          <button
            onClick={() => {
              onCategorySelect(null);
              onSubcategorySelect(null);
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border shrink-0',
              !selectedCategoryId
                ? 'bg-foreground text-background border-foreground shadow-xs'
                : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            All Items
          </button>

          {/* Category Chips */}
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  if (isSelected) {
                    onCategorySelect(null);
                    onSubcategorySelect(null);
                  } else {
                    onCategorySelect(cat.id);
                    onSubcategorySelect(null);
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border shrink-0',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card border-border/80 text-foreground hover:border-primary/40'
                )}
              >
                {cat.image_url && (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-4 h-4 rounded-full object-cover shrink-0"
                    loading="lazy"
                  />
                )}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Inline Subcategory Chips (Smoothly displayed when category is selected) */}
        {selectedCategoryId && subcategories.length > 0 && (
          <div
            className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-4 px-4 touch-pan-x border-t border-border/30 pt-2 animate-in fade-in-50 duration-200"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
              Types:
            </span>

            {/* "All Subcategories" Pill */}
            <button
              onClick={() => onSubcategorySelect(null)}
              className={cn(
                'px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border shrink-0',
                !selectedSubcategoryId
                  ? 'bg-secondary text-secondary-foreground border-secondary font-bold'
                  : 'bg-muted/30 text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              All
            </button>

            {/* Subcategory Pills */}
            {subcategories.map((sub) => {
              const isSubSelected = selectedSubcategoryId === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => onSubcategorySelect(isSubSelected ? null : sub.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border shrink-0',
                    isSubSelected
                      ? 'bg-destructive text-destructive-foreground border-destructive font-bold shadow-2xs'
                      : 'bg-card border-border/60 text-foreground hover:border-destructive/40'
                  )}
                >
                  {sub.name}
                </button>
              );
            })}

            {/* Quick Clear */}
            {(selectedCategoryId || selectedSubcategoryId) && (
              <button
                onClick={() => {
                  onCategorySelect(null);
                  onSubcategorySelect(null);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive hover:underline ml-auto shrink-0 px-2"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
