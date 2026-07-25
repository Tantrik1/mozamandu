import { useState, useEffect } from 'react';
import { ChevronDown, FolderOpen, Tag, X, Palette, SlidersHorizontal, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface Color {
  id: string;
  name: string;
  hex_code: string | null;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  min_selling_price: number;
}

interface ShopFiltersProps {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
  onSubcategorySelect: (subcategoryId: string) => void;
  onClearFilters: () => void;
  priceRange: [number, number];
  onPriceRangeApply: (range: [number, number]) => void;
  selectedColorIds?: string[];
  onColorToggle?: (colorId: string) => void;
  onClearColors?: () => void;
  productIds?: string[];
  showColorFilter?: boolean;
}

const MIN_PRICE = 0;
const MAX_PRICE = 10000;

const PRICE_PRESETS = [
  { label: 'Under Rs. 500', min: 0, max: 500 },
  { label: 'Rs. 500 - 1k', min: 500, max: 1000 },
  { label: 'Rs. 1k - 2k', min: 1000, max: 2000 },
  { label: 'Above Rs. 2k', min: 2000, max: 10000 },
];

export function ShopFilters({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onCategorySelect,
  onSubcategorySelect,
  onClearFilters,
  priceRange,
  onPriceRangeApply,
  selectedColorIds = [],
  onColorToggle,
  onClearColors,
  productIds = [],
  showColorFilter = false,
}: ShopFiltersProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [minInput, setMinInput] = useState(priceRange[0].toString());
  const [maxInput, setMaxInput] = useState(priceRange[1].toString());

  // Fetch colors dynamically based on current product context
  const { data: availableColors = [] } = useQuery({
    queryKey: ['shop-colors-context', productIds],
    queryFn: async (): Promise<Color[]> => {
      if (productIds.length === 0) return [];
      
      const { data: colorVariants } = await supabase
        .from('color_variants')
        .select('color_id')
        .in('product_id', productIds)
        .not('color_id', 'is', null);
      
      if (!colorVariants || colorVariants.length === 0) return [];
      
      const uniqueColorIds = [...new Set(colorVariants.map(cv => cv.color_id))];
      
      const { data } = await supabase
        .from('colors')
        .select('id, name, hex_code')
        .in('id', uniqueColorIds)
        .eq('is_active', true)
        .order('name');
      
      return data || [];
    },
    enabled: showColorFilter && productIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Sync local state when prop changes
  useEffect(() => {
    setMinInput(priceRange[0].toString());
    setMaxInput(priceRange[1].toString());
  }, [priceRange]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchSubcategories(selectedCategoryId);
      setExpandedCategories([selectedCategoryId]);
    }
  }, [selectedCategoryId]);

  const fetchSubcategories = async (categoryId: string) => {
    const { data } = await supabase
      .from('subcategories')
      .select('id, name, category_id, min_selling_price')
      .eq('status', 'on')
      .eq('category_id', categoryId)
      .order('name');
    
    if (data) {
      setSubcategories(prev => {
        const filtered = prev.filter(s => s.category_id !== categoryId);
        return [...filtered, ...data];
      });
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter(id => id !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
      fetchSubcategories(categoryId);
    }
  };

  const handleApplyPrice = () => {
    let min = parseInt(minInput) || MIN_PRICE;
    let max = parseInt(maxInput) || MAX_PRICE;
    
    min = Math.max(MIN_PRICE, Math.min(min, MAX_PRICE));
    max = Math.max(MIN_PRICE, Math.min(max, MAX_PRICE));
    
    if (min > max) [min, max] = [max, min];
    
    setMinInput(min.toString());
    setMaxInput(max.toString());
    onPriceRangeApply([min, max]);
  };

  const handlePresetSelect = (min: number, max: number) => {
    setMinInput(min.toString());
    setMaxInput(max.toString());
    onPriceRangeApply([min, max]);
  };

  const handleClearPrice = () => {
    setMinInput(MIN_PRICE.toString());
    setMaxInput(MAX_PRICE.toString());
    onPriceRangeApply([MIN_PRICE, MAX_PRICE]);
  };

  const hasActiveFilters = selectedCategoryId || selectedSubcategoryId;
  const hasPriceFilter = priceRange[0] !== MIN_PRICE || priceRange[1] !== MAX_PRICE;
  const hasColorFilter = selectedColorIds.length > 0;

  return (
    <div className="space-y-5">
      {/* Clear Filters */}
      {(hasActiveFilters || hasPriceFilter || hasColorFilter) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onClearFilters();
            handleClearPrice();
            onClearColors?.();
          }}
          className="w-full justify-between text-destructive hover:text-destructive bg-destructive/5 hover:bg-destructive/10 font-bold rounded-xl border-destructive/20"
        >
          <span className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Clear All Active Filters
          </span>
          <span className="text-[10px] uppercase font-black bg-destructive/20 px-2 py-0.5 rounded-full">Reset</span>
        </Button>
      )}

      {/* 1. PRICE RANGE (PLACED FIRST ABOVE CATEGORIES & COLORS AS REQUESTED) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-teal-500/5 border border-emerald-500/20 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              Rs.
            </div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-foreground">Price Range</h3>
          </div>
          {hasPriceFilter && (
            <button 
              onClick={handleClearPrice}
              className="text-[11px] font-bold text-destructive hover:underline"
            >
              Reset Price
            </button>
          )}
        </div>
        
        {/* Price Presets */}
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

        {/* Min / Max Input */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rs.</span>
            <Input
              type="number"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              min={MIN_PRICE}
              max={MAX_PRICE}
              className="h-9 pl-8 text-xs font-semibold rounded-lg bg-background border-border/80"
              placeholder="Min"
            />
          </div>
          <span className="text-muted-foreground font-bold text-xs">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rs.</span>
            <Input
              type="number"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              min={MIN_PRICE}
              max={MAX_PRICE}
              className="h-9 pl-8 text-xs font-semibold rounded-lg bg-background border-border/80"
              placeholder="Max"
            />
          </div>
        </div>
        
        <Button onClick={handleApplyPrice} size="sm" className="w-full h-9 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs">
          Apply Price Filter
        </Button>
      </div>

      {/* 2. CATEGORIES */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
            <FolderOpen className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-foreground">Categories</h3>
        </div>

        <div className="space-y-1 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
          {categories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id);
            const isSelected = selectedCategoryId === category.id;
            const categorySubcategories = subcategories.filter(s => s.category_id === category.id);

            return (
              <div key={category.id}>
                <button
                  onClick={() => {
                    onCategorySelect(category.id);
                    toggleCategory(category.id);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all",
                    isSelected 
                      ? "bg-primary text-primary-foreground shadow-2xs" 
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  <span className="truncate">{category.name}</span>
                  {categorySubcategories.length > 0 && (
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 transition-transform shrink-0",
                        isExpanded && "rotate-180"
                      )} 
                    />
                  )}
                </button>

                {isExpanded && categorySubcategories.length > 0 && (
                  <div className="ml-3 mt-1 pl-2 space-y-1 border-l-2 border-primary/20">
                    {categorySubcategories.map((subcategory) => (
                      <button
                        key={subcategory.id}
                        onClick={() => onSubcategorySelect(subcategory.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                          selectedSubcategoryId === subcategory.id
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Tag className="w-3 h-3 shrink-0 text-primary" />
                        <span className="truncate">{subcategory.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. COLORS */}
      {showColorFilter && availableColors.length > 0 && onColorToggle && (
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center">
                <Palette className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-foreground">Available Colors</h3>
            </div>
            {hasColorFilter && onClearColors && (
              <button
                onClick={onClearColors}
                className="text-[11px] font-bold text-destructive hover:underline"
              >
                Clear
              </button>
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
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all relative flex items-center justify-center shadow-2xs hover:scale-110",
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 scale-110 shadow-sm"
                      : "border-black/15 dark:border-white/20 hover:border-primary/60"
                  )}
                  style={{ backgroundColor: color.hex_code || '#cccccc' }}
                  title={color.name}
                  aria-label={`Filter by ${color.name}`}
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
    </div>
  );
}