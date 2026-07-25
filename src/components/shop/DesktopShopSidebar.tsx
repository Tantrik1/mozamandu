import { useState, useEffect, memo } from 'react';
import { Search, X, ChevronDown, ChevronRight, Package, SlidersHorizontal, Palette, FolderOpen, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SortOption } from './SortBottomSheet';

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
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
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

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'bestseller', label: 'Best Sellers' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
];

const PRICE_PRESETS = [
  { label: 'Under Rs. 500', min: 0, max: 500 },
  { label: 'Rs. 500 - 1k', min: 500, max: 1000 },
  { label: 'Rs. 1k - 2k', min: 1000, max: 2000 },
  { label: 'Above Rs. 2k', min: 2000, max: 10000 },
];

export const DesktopShopSidebar = memo(function DesktopShopSidebar({
  searchValue,
  onSearchChange,
  sortBy,
  onSortChange,
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
  const [localInput, setLocalInput] = useState(searchValue);
  const [minPrice, setMinPrice] = useState(String(priceRange[0]));
  const [maxPrice, setMaxPrice] = useState(String(priceRange[1]));
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(selectedCategoryId);

  // Sync external search value
  useEffect(() => {
    setLocalInput(searchValue);
  }, [searchValue]);

  // Sync price range from parent
  useEffect(() => {
    setMinPrice(String(priceRange[0]));
    setMaxPrice(String(priceRange[1]));
  }, [priceRange]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localInput.length >= 2) {
        onSearchChange(localInput);
      } else if (localInput.length === 0 && searchValue) {
        onSearchChange('');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localInput]);

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
    <aside className="hidden lg:block w-[280px] shrink-0">
      <div className="sticky top-[90px] space-y-6 max-h-[calc(100vh-110px)] overflow-y-auto pr-3 pb-8 scrollbar-hide">
        {/* Header + Clear */}
        <div className="flex items-center justify-between bg-card p-3.5 rounded-2xl border border-border/60 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold text-foreground tracking-tight">Filter Products</h2>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-xs text-destructive hover:underline font-bold bg-destructive/10 px-2.5 py-1 rounded-full transition-all"
            >
              Reset
            </button>
          )}
        </div>

        {/* 3. PRICE RANGE (PLACED ABOVE CATEGORIES & COLORS AS REQUESTED) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-teal-500/5 border border-emerald-500/20 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                Rs.
              </div>
              <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">Price Range</label>
            </div>
            {priceRange[0] > 0 || priceRange[1] < 10000 ? (
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                Active
              </span>
            ) : null}
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-1.5">
            {PRICE_PRESETS.map((preset) => {
              const isActive = priceRange[0] === preset.min && priceRange[1] === preset.max;
              return (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset.min, preset.max)}
                  className={cn(
                    "text-[11px] font-bold px-2 py-1.5 rounded-lg transition-all text-center border",
                    isActive
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                      : "bg-background/80 hover:bg-background text-foreground border-border/60"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Min / Max Inputs */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rs.</span>
              <Input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-9 pl-8 text-xs font-semibold rounded-lg bg-background border-border/80"
                min={0}
                max={10000}
              />
            </div>
            <span className="text-muted-foreground font-bold text-xs">–</span>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rs.</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-9 pl-8 text-xs font-semibold rounded-lg bg-background border-border/80"
                min={0}
                max={10000}
              />
            </div>
          </div>

          <Button
            onClick={handlePriceApply}
            size="sm"
            className="w-full h-9 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all"
          >
            Apply Price Filter
          </Button>
        </div>

        {/* 4. CATEGORIES */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
              <FolderOpen className="w-3.5 h-3.5" />
            </div>
            <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">Categories</label>
          </div>

          <div className="space-y-1">
            {/* All Products */}
            <button
              onClick={() => {
                onCategorySelect(null);
                onSubcategorySelect(null);
                setExpandedCategoryId(null);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                !selectedCategoryId
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Package className="w-4 h-4 shrink-0" />
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
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0 text-primary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {/* Subcategories */}
                  {isExpanded && subcategories.length > 0 && (
                    <div className="ml-3 mt-1 pl-2 space-y-1 border-l-2 border-primary/20">
                      <button
                        onClick={() => onSubcategorySelect(null)}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                          !selectedSubcategoryId && isSelected
                            ? "text-primary font-bold bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        All in {cat.name}
                      </button>
                      {subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => onSubcategorySelect(sub.id)}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                            selectedSubcategoryId === sub.id
                              ? "text-primary font-bold bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
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

        {/* 5. COLORS */}
        {availableColors.length > 0 && (
          <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center">
                  <Palette className="w-3.5 h-3.5" />
                </div>
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">Available Colors</label>
              </div>
              {selectedColorIds.length > 0 && (
                <span className="text-[10px] font-bold bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full">
                  {selectedColorIds.length} active
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {availableColors.map((color) => {
                const isSelected = selectedColorIds.includes(color.id);
                const isWhite = color.hex_code?.toLowerCase() === '#ffffff' || color.hex_code?.toLowerCase() === '#fff';

                return (
                  <button
                    key={color.id}
                    onClick={() => onColorToggle(color.id)}
                    title={color.name}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all relative flex items-center justify-center shadow-2xs hover:scale-110",
                      isSelected
                        ? "border-primary ring-2 ring-primary/40 scale-110 shadow-sm"
                        : "border-black/15 dark:border-white/20 hover:border-primary/60"
                    )}
                    style={{
                      backgroundColor: color.hex_code || '#cccccc',
                    }}
                  >
                    {isSelected && (
                      <Check
                        className={cn(
                          "w-4 h-4 font-extrabold stroke-[3]",
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

        {/* Result Count Footer */}
        <div className="p-3 bg-muted/40 rounded-xl text-center border border-border/50">
          <p className="text-xs font-medium text-muted-foreground">
            Showing <span className="font-extrabold text-foreground">{resultCount}</span> matching products
          </p>
        </div>
      </div>
    </aside>
  );
});
