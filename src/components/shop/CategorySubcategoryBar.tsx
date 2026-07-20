import { memo, useState } from 'react';
import { ChevronRight, X, SlidersHorizontal, Package } from 'lucide-react';
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
  const [showCategories, setShowCategories] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);

  // Fetch subcategories when category is selected
  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', selectedCategoryId],
    queryFn: () => fetchSubcategories(selectedCategoryId!),
    enabled: !!selectedCategoryId,
    staleTime: 5 * 60 * 1000,
  });

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedSubcategory = subcategories.find(s => s.id === selectedSubcategoryId);

  if (!isVisible) return null;

  return (
    <div
      className="bg-background border-b sticky z-40"
      style={{ top: `${topOffset}px` }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div 
          className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide -mx-4 px-4"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Filters Button */}
          <button
            onClick={onMoreFilters}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              "border shadow-sm bg-background border-border hover:border-primary/50",
              activeFilterCount > 0 && "border-primary"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground text-xs ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Category Pill */}
          <button
            onClick={() => {
              setShowCategories(!showCategories);
              setShowSubcategories(false);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              "border shadow-sm",
              selectedCategoryId
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/50"
            )}
          >
            {selectedCategory?.name || 'Category'}
            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showCategories && "rotate-90")} />
          </button>

          {/* Subcategory Pill - Only show if category selected */}
          {selectedCategoryId && subcategories.length > 0 && (
            <button
              onClick={() => {
                setShowSubcategories(!showSubcategories);
                setShowCategories(false);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                "border shadow-sm",
                selectedSubcategoryId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/50"
              )}
            >
              {selectedSubcategory?.name || 'Subcategory'}
              <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showSubcategories && "rotate-90")} />
            </button>
          )}

          {/* Clear Selection */}
          {(selectedCategoryId || selectedSubcategoryId) && (
            <button
              onClick={() => {
                onCategorySelect(null);
                onSubcategorySelect(null);
                setShowCategories(false);
                setShowSubcategories(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Category Grid - Expandable */}
        {showCategories && (
          <div className="pb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {/* All Categories Option */}
              <button
                onClick={() => {
                  onCategorySelect(null);
                  onSubcategorySelect(null);
                  setShowCategories(false);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                  !selectedCategoryId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-center line-clamp-1">All</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onCategorySelect(cat.id);
                    onSubcategorySelect(null);
                    setShowCategories(false);
                    setShowSubcategories(true);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                    selectedCategoryId === cat.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-center line-clamp-1">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subcategory Grid - Expandable */}
        {showSubcategories && selectedCategoryId && subcategories.length > 0 && (
          <div className="pb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {/* All Subcategories Option */}
              <button
                onClick={() => {
                  onSubcategorySelect(null);
                  setShowSubcategories(false);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                  !selectedSubcategoryId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-center line-clamp-1">All</span>
              </button>

              {subcategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    onSubcategorySelect(sub.id);
                    setShowSubcategories(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                    selectedSubcategoryId === sub.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                    {sub.image_url ? (
                      <img
                        src={sub.image_url}
                        alt={sub.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-center line-clamp-1">{sub.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
