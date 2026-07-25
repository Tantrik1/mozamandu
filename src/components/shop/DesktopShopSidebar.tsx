import { useState, useEffect, memo } from 'react';
import { ChevronDown, ChevronRight, Package, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  image_url?: string;
}

interface Color {
  id: string;
  name: string;
  hex_code: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface DesktopShopSidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onCategorySelect: (id: string | null) => void;
  onSubcategorySelect: (id: string | null) => void;
  availableColors: Color[];
  selectedColorIds: string[];
  onColorToggle: (id: string) => void;
  priceRange: [number, number];
  onPriceRangeApply: (range: [number, number]) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  resultCount: number;
}

const fetchSubcategories = async (categoryId: string): Promise<Subcategory[]> => {
  const { data } = await supabase
    .from('subcategories')
    .select('id, name, category_id')
    .eq('category_id', categoryId)
    .eq('status', 'on')
    .order('name');
  return data || [];
};

const PRICE_PRESETS = [
  { label: 'Under Rs. 500', min: 0, max: 500 },
  { label: 'Rs. 500 - 1k', min: 500, max: 1000 },
  { label: 'Rs. 1k - 2k', min: 1000, max: 2000 },
  { label: 'Above Rs. 2k', min: 2000, max: 10000 },
];

export const DesktopShopSidebar = memo(function DesktopShopSidebar({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onCategorySelect,
  onSubcategorySelect,
  availableColors,
  selectedColorIds,
  onColorToggle,
  priceRange,
  onPriceRangeApply,
  onClearAll,
  hasActiveFilters,
  resultCount,
}: DesktopShopSidebarProps) {
  const [minPrice, setMinPrice] = useState(String(priceRange[0]));
  const [maxPrice, setMaxPrice] = useState(String(priceRange[1]));
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(selectedCategoryId);

  // Sync price range from parent
  useEffect(() => {
    setMinPrice(String(priceRange[0]));
    setMaxPrice(String(priceRange[1]));
  }, [priceRange]);

  // Fetch subcategories for expanded category
  const { data: subcategories = [] } = useQuery({
    queryKey: ['sidebar-subcategories', expandedCategoryId],
    queryFn: () => fetchSubcategories(expandedCategoryId!),
    enabled: !!expandedCategoryId,
    staleTime: 5 * 60 * 1000,
  });

  const handleCategoryClick = (catId: string) => {
    if (selectedCategoryId === catId) {
      onCategorySelect(null);
      onSubcategorySelect(null);
      setExpandedCategoryId(null);
    } else {
      onCategorySelect(catId);
      onSubcategorySelect(null);
      setExpandedCategoryId(catId);
    }
  };

  const handlePriceApply = () => {
    const min = Math.max(0, parseInt(minPrice) || 0);
    const max = Math.min(10000, parseInt(maxPrice) || 10000);
    onPriceRangeApply([min, max]);
  };

  const handlePresetSelect = (min: number, max: number) => {
    setMinPrice(String(min));
    setMaxPrice(String(max));
    onPriceRangeApply([min, max]);
  };

  return (
    <aside className="hidden lg:block w-[260px] shrink-0">
      <div className="sticky top-[90px] bg-card rounded-2xl border border-border/50 p-5 shadow-2xs space-y-5 max-h-[calc(100vh-110px)] overflow-y-auto scrollbar-hide">
        {/* Small Filter Header */}
        <div className="flex items-center justify-between pb-1 border-b border-border/40">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Filters</span>
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-xs text-destructive hover:underline font-bold transition-all"
            >
              Reset All
            </button>
          )}
        </div>

        {/* 1. PRICE RANGE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Price Range</h3>
            {priceRange[0] > 0 || priceRange[1] < 10000 ? (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Applied
              </span>
            ) : null}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((preset) => {
              const isActive = priceRange[0] === preset.min && priceRange[1] === preset.max;
              return (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset.min, preset.max)}
                  className={cn(
                    "text-[11px] font-semibold px-2 py-1 rounded-lg transition-all border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Clean Min/Max Inputs */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder="Min Rs."
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-8 text-xs rounded-lg border-border/70 focus-visible:ring-primary"
                min={0}
                max={10000}
              />
            </div>
            <span className="text-muted-foreground text-xs">–</span>
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder="Max Rs."
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-8 text-xs rounded-lg border-border/70 focus-visible:ring-primary"
                min={0}
                max={10000}
              />
            </div>
          </div>

          <Button
            onClick={handlePriceApply}
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs font-bold rounded-lg hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          >
            Apply Price
          </Button>
        </div>

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* 2. CATEGORIES */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Categories</h3>

          <div className="space-y-0.5">
            <button
              onClick={() => {
                onCategorySelect(null);
                onSubcategorySelect(null);
                setExpandedCategoryId(null);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                !selectedCategoryId
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              All Products
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const isExpanded = expandedCategoryId === cat.id;

              return (
                <div key={cat.id}>
                  <button
                    onClick={() => handleCategoryClick(cat.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 text-primary" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {/* Subcategories */}
                  {isExpanded && subcategories.length > 0 && (
                    <div className="ml-3 mt-0.5 pl-2 space-y-0.5 border-l border-primary/20">
                      <button
                        onClick={() => onSubcategorySelect(null)}
                        className={cn(
                          "w-full text-left px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                          !selectedSubcategoryId && isSelected
                            ? "text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        All in {cat.name}
                      </button>
                      {subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => onSubcategorySelect(sub.id)}
                          className={cn(
                            "w-full text-left px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                            selectedSubcategoryId === sub.id
                              ? "text-primary font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        {availableColors.length > 0 && <div className="border-t border-border/40" />}

        {/* 3. COLORS */}
        {availableColors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Colors</h3>
              {selectedColorIds.length > 0 && (
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {selectedColorIds.length} selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {availableColors.map((color) => {
                const isSelected = selectedColorIds.includes(color.id);
                const isWhite = color.hex_code?.toLowerCase() === '#ffffff' || color.hex_code?.toLowerCase() === '#fff';

                return (
                  <button
                    key={color.id}
                    onClick={() => onColorToggle(color.id)}
                    title={color.name}
                    className={cn(
                      "w-7 h-7 rounded-full border transition-all relative flex items-center justify-center hover:scale-110",
                      isSelected
                        ? "border-primary ring-2 ring-primary/40 scale-110 shadow-2xs"
                        : "border-black/15 dark:border-white/20 hover:border-primary/50"
                    )}
                    style={{
                      backgroundColor: color.hex_code || '#cccccc',
                    }}
                  >
                    {isSelected && (
                      <Check
                        className={cn(
                          "w-3.5 h-3.5 font-bold stroke-[3]",
                          isWhite ? "text-black" : "text-white"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
});
