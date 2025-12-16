import { useState, useEffect } from 'react';
import { ChevronDown, FolderOpen, Tag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  selling_price: number;
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
}

const MIN_PRICE = 50;
const MAX_PRICE = 10000;

export function ShopFilters({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onCategorySelect,
  onSubcategorySelect,
  onClearFilters,
  priceRange,
  onPriceRangeApply,
}: ShopFiltersProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>(priceRange);
  const [minInput, setMinInput] = useState(priceRange[0].toString());
  const [maxInput, setMaxInput] = useState(priceRange[1].toString());

  // Sync local state when prop changes
  useEffect(() => {
    setLocalPriceRange(priceRange);
    setMinInput(priceRange[0].toString());
    setMaxInput(priceRange[1].toString());
  }, [priceRange]);

  // Fetch subcategories for expanded categories
  useEffect(() => {
    if (selectedCategoryId) {
      fetchSubcategories(selectedCategoryId);
      setExpandedCategories([selectedCategoryId]);
    }
  }, [selectedCategoryId]);

  const fetchSubcategories = async (categoryId: string) => {
    const { data } = await supabase
      .from('subcategories')
      .select('id, name, category_id, selling_price')
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

  const handleSliderChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]];
    setLocalPriceRange(newRange);
    setMinInput(newRange[0].toString());
    setMaxInput(newRange[1].toString());
  };

  const handleMinChange = (value: string) => {
    setMinInput(value);
    const num = parseInt(value) || MIN_PRICE;
    if (num >= MIN_PRICE && num <= localPriceRange[1]) {
      setLocalPriceRange([num, localPriceRange[1]]);
    }
  };

  const handleMaxChange = (value: string) => {
    setMaxInput(value);
    const num = parseInt(value) || MAX_PRICE;
    if (num <= MAX_PRICE && num >= localPriceRange[0]) {
      setLocalPriceRange([localPriceRange[0], num]);
    }
  };

  const handleApplyPrice = () => {
    let min = parseInt(minInput) || MIN_PRICE;
    let max = parseInt(maxInput) || MAX_PRICE;
    
    // Clamp values
    min = Math.max(MIN_PRICE, Math.min(min, MAX_PRICE));
    max = Math.max(MIN_PRICE, Math.min(max, MAX_PRICE));
    
    // Ensure min <= max
    if (min > max) {
      [min, max] = [max, min];
    }
    
    const newRange: [number, number] = [min, max];
    setLocalPriceRange(newRange);
    setMinInput(min.toString());
    setMaxInput(max.toString());
    onPriceRangeApply(newRange);
  };

  const handleClearPrice = () => {
    const defaultRange: [number, number] = [MIN_PRICE, MAX_PRICE];
    setLocalPriceRange(defaultRange);
    setMinInput(MIN_PRICE.toString());
    setMaxInput(MAX_PRICE.toString());
    onPriceRangeApply(defaultRange);
  };

  const hasActiveFilters = selectedCategoryId || selectedSubcategoryId;
  const hasPriceFilter = priceRange[0] !== MIN_PRICE || priceRange[1] !== MAX_PRICE;

  return (
    <div className="space-y-6">
      {/* Clear Filters */}
      {(hasActiveFilters || hasPriceFilter) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onClearFilters();
            handleClearPrice();
          }}
          className="w-full justify-start text-destructive hover:text-destructive"
        >
          <X className="w-4 h-4 mr-2" />
          Clear all filters
        </Button>
      )}

      {/* Categories */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Categories
        </h3>
        <div className="space-y-1">
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
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent"
                  )}
                >
                  <span className="font-medium">{category.name}</span>
                  {categorySubcategories.length > 0 && (
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 transition-transform",
                        isExpanded && "rotate-180"
                      )} 
                    />
                  )}
                </button>

                {/* Subcategories */}
                {isExpanded && categorySubcategories.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                    {categorySubcategories.map((subcategory) => (
                      <button
                        key={subcategory.id}
                        onClick={() => onSubcategorySelect(subcategory.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                          selectedSubcategoryId === subcategory.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Tag className="w-3 h-3" />
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

      {/* Price Range */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Price Range</h3>
          {hasPriceFilter && (
            <button 
              onClick={handleClearPrice}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        
        {/* Min/Max Inputs */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Min</label>
            <Input
              type="number"
              value={minInput}
              onChange={(e) => handleMinChange(e.target.value)}
              min={MIN_PRICE}
              max={MAX_PRICE}
              className="h-9 text-sm"
              placeholder="50"
            />
          </div>
          <span className="text-muted-foreground mt-5">-</span>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Max</label>
            <Input
              type="number"
              value={maxInput}
              onChange={(e) => handleMaxChange(e.target.value)}
              min={MIN_PRICE}
              max={MAX_PRICE}
              className="h-9 text-sm"
              placeholder="10000"
            />
          </div>
        </div>

        {/* Slider */}
        <div className="px-1">
          <Slider
            value={localPriceRange}
            onValueChange={handleSliderChange}
            min={MIN_PRICE}
            max={MAX_PRICE}
            step={50}
            className="my-4"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Rs. {MIN_PRICE}</span>
            <span>Rs. {MAX_PRICE.toLocaleString()}</span>
          </div>
        </div>

        {/* Apply Button */}
        <Button 
          onClick={handleApplyPrice} 
          size="sm" 
          className="w-full"
        >
          Apply Price Filter
        </Button>
      </div>
    </div>
  );
}
