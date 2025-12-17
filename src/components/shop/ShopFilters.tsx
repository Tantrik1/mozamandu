import { useState, useEffect } from 'react';
import { ChevronDown, FolderOpen, Tag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
  const [minInput, setMinInput] = useState(priceRange[0].toString());
  const [maxInput, setMaxInput] = useState(priceRange[1].toString());

  // Sync local state when prop changes
  useEffect(() => {
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

  const handleClearPrice = () => {
    setMinInput(MIN_PRICE.toString());
    setMaxInput(MAX_PRICE.toString());
    onPriceRangeApply([MIN_PRICE, MAX_PRICE]);
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
        <div className="space-y-1 max-h-48 overflow-y-auto">
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
                  <span className="font-medium truncate">{category.name}</span>
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
                        <Tag className="w-3 h-3 shrink-0" />
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
      <div className="space-y-3">
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
        
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="number"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              min={MIN_PRICE}
              max={MAX_PRICE}
              className="h-9 text-sm"
              placeholder="Min"
            />
          </div>
          <span className="text-muted-foreground">-</span>
          <div className="flex-1">
            <Input
              type="number"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              min={MIN_PRICE}
              max={MAX_PRICE}
              className="h-9 text-sm"
              placeholder="Max"
            />
          </div>
        </div>
        
        <Button onClick={handleApplyPrice} size="sm" className="w-full">
          Apply
        </Button>
      </div>
    </div>
  );
}