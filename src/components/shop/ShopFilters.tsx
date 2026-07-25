import { useState, useEffect } from 'react';
import { ChevronDown, Tag, X, Check, Package } from 'lucide-react';
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
      {/* Small Filter Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/40">
        <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Filters</span>
        {(hasActiveFilters || hasPriceFilter || hasColorFilter) && (
          <button
            onClick={() => {
              onClearFilters();
              handleClearPrice();
              onClearColors?.();
            }}
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
          {hasPriceFilter && (
            <button 
              onClick={handleClearPrice}
              className="text-[11px] font-bold text-destructive hover:underline"
            >
              Reset
            </button>
          )}
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

        {/* Min / Max Inputs */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="relative flex-1">
            <Input
              type="number"
              placeholder="Min Rs."
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              min={MIN_PRICE}
              max={MAX_PRICE}
              className="h-8 text-xs rounded-lg border-border/70 focus-visible:ring-primary"
            />
          </div>
          <span className="text-muted-foreground text-xs">–</span>
          <div className="relative flex-1">
            <Input
              type="number"
              placeholder="Max Rs."
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              min={MIN_PRICE}
              max={MAX_PRICE}
              className="h-8 text-xs rounded-lg border-border/70 focus-visible:ring-primary"
            />
          </div>
        </div>
        
        <Button onClick={handleApplyPrice} size="sm" variant="outline" className="w-full h-8 text-xs font-bold rounded-lg hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
          Apply Price
        </Button>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* 2. CATEGORIES */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Categories</h3>

        <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
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
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    isSelected 
                      ? "bg-primary/10 text-primary font-bold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="truncate">{category.name}</span>
                  {categorySubcategories.length > 0 && (
                    <ChevronDown 
                      className={cn(
                        "w-3.5 h-3.5 transition-transform shrink-0",
                        isExpanded && "rotate-180 text-primary"
                      )} 
                    />
                  )}
                </button>

                {isExpanded && categorySubcategories.length > 0 && (
                  <div className="ml-3 mt-0.5 pl-2 space-y-0.5 border-l border-primary/20">
                    {categorySubcategories.map((subcategory) => (
                      <button
                        key={subcategory.id}
                        onClick={() => onSubcategorySelect(subcategory.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
                          selectedSubcategoryId === subcategory.id
                            ? "text-primary font-bold"
                            : "text-muted-foreground hover:text-foreground"
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

      {/* Divider */}
      {showColorFilter && availableColors.length > 0 && <div className="border-t border-border/40" />}

      {/* 3. COLORS */}
      {showColorFilter && availableColors.length > 0 && onColorToggle && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Colors</h3>
            {hasColorFilter && onClearColors && (
              <button
                onClick={onClearColors}
                className="text-[11px] font-bold text-destructive hover:underline"
              >
                Clear
              </button>
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
                  className={cn(
                    "w-7 h-7 rounded-full border transition-all relative flex items-center justify-center hover:scale-110",
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 scale-110 shadow-2xs"
                      : "border-black/15 dark:border-white/20 hover:border-primary/50"
                  )}
                  style={{ backgroundColor: color.hex_code || '#cccccc' }}
                  title={color.name}
                  aria-label={`Filter by ${color.name}`}
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
  );
}