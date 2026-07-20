import { useState, useEffect, memo } from 'react';
import { Search, X, ChevronDown, ChevronRight, Package } from 'lucide-react';
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

  // Debounced search - triggers after 2+ chars
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
      // Deselect
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

  return (
    <aside className="hidden lg:block w-[260px] shrink-0">
      <div className="sticky top-[80px] space-y-5 max-h-[calc(100vh-100px)] overflow-y-auto pr-2 pb-8 scrollbar-hide">
        {/* Header + Clear */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-xs text-destructive hover:underline font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Real-time Search */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              className="pl-8 pr-8 h-9 text-sm rounded-lg"
            />
            {localInput && (
              <button
                onClick={() => {
                  setLocalInput('');
                  onSearchChange('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {localInput.length === 1 && (
            <p className="text-[11px] text-muted-foreground">Type 2+ characters to search</p>
          )}
        </div>

        {/* Sort */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Sort By</label>
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger className="h-9 text-sm rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Categories */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Categories</label>
          <div className="space-y-0.5">
            {/* All */}
            <button
              onClick={() => {
                onCategorySelect(null);
                onSubcategorySelect(null);
                setExpandedCategoryId(null);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors",
                !selectedCategoryId
                  ? "bg-primary/10 text-primary font-medium"
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
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">{cat.name}</span>
                  </button>

                  {/* Subcategories */}
                  {isExpanded && subcategories.length > 0 && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      <button
                        onClick={() => onSubcategorySelect(null)}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors",
                          !selectedSubcategoryId && isSelected
                            ? "text-primary font-medium bg-primary/5"
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
                            "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors",
                            selectedSubcategoryId === sub.id
                              ? "text-primary font-medium bg-primary/5"
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

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Colors */}
        {availableColors.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Colors</label>
            <div className="flex flex-wrap gap-2">
              {availableColors.map((color) => {
                const isSelected = selectedColorIds.includes(color.id);
                return (
                  <button
                    key={color.id}
                    onClick={() => onColorToggle(color.id)}
                    title={color.name}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 scale-110"
                        : "border-border hover:border-primary/50"
                    )}
                    style={{
                      backgroundColor: color.hex_code || '#ccc',
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        {availableColors.length > 0 && <div className="h-px bg-border" />}

        {/* Price Range */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Price Range (Rs.)</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-8 text-xs rounded-lg"
              min={0}
              max={10000}
            />
            <span className="text-muted-foreground text-xs">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-8 text-xs rounded-lg"
              min={0}
              max={10000}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePriceApply}
            className="w-full h-8 text-xs rounded-lg"
          >
            Apply Price
          </Button>
        </div>

        {/* Result count */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{resultCount}</span> products found
          </p>
        </div>
      </div>
    </aside>
  );
});
