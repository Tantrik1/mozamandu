import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Tag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
}

export function ShopFilters({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onCategorySelect,
  onSubcategorySelect,
  onClearFilters,
}: ShopFiltersProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

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

  const hasActiveFilters = selectedCategoryId || selectedSubcategoryId;

  return (
    <div className="space-y-6">
      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
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
      <div>
        <h3 className="font-semibold mb-3">Price Range</h3>
        <div className="px-2">
          <Slider
            value={priceRange}
            onValueChange={(value) => setPriceRange(value as [number, number])}
            max={10000}
            step={100}
            className="mb-4"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Rs.{priceRange[0]}</span>
            <span>Rs.{priceRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="font-semibold mb-3">Quick Filters</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox id="featured" />
            <span className="text-sm">Featured Products</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox id="instock" />
            <span className="text-sm">In Stock Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox id="sale" />
            <span className="text-sm">On Sale</span>
          </label>
        </div>
      </div>
    </div>
  );
}