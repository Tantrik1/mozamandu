import { useState, useEffect } from 'react';
import { X, Check, ChevronDown, Tag, Palette, DollarSign, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface Color {
  id: string;
  name: string;
  hex_code: string | null;
}

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Categories & Subcategories
  categories?: Category[];
  selectedCategoryId?: string | null;
  onCategorySelect?: (id: string | null) => void;
  subcategories?: Subcategory[];
  selectedSubcategoryId?: string | null;
  onSubcategorySelect?: (id: string | null) => void;
  // Colors
  availableColors: Color[];
  selectedColorIds: string[];
  onColorToggle: (colorId: string) => void;
  // Price
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
  // Actions
  onApply: () => void;
  onReset: () => void;
  resultCount: number;
}

const PRICE_PRESETS = [
  { label: 'Under Rs. 500', min: 0, max: 500 },
  { label: 'Rs. 500 - 1k', min: 500, max: 1000 },
  { label: 'Rs. 1k - 2k', min: 1000, max: 2000 },
  { label: 'Above Rs. 2k', min: 2000, max: 10000 },
];

export function FilterBottomSheet({
  isOpen,
  onClose,
  categories = [],
  selectedCategoryId,
  onCategorySelect,
  subcategories = [],
  selectedSubcategoryId,
  onSubcategorySelect,
  availableColors,
  selectedColorIds,
  onColorToggle,
  priceRange,
  onPriceChange,
  onApply,
  onReset,
  resultCount,
}: FilterBottomSheetProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['category', 'price', 'color']);
  const [minPrice, setMinPrice] = useState(priceRange[0].toString());
  const [maxPrice, setMaxPrice] = useState(priceRange[1].toString());

  // Sync price inputs
  useEffect(() => {
    setMinPrice(priceRange[0].toString());
    setMaxPrice(priceRange[1].toString());
  }, [priceRange]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handlePricePreset = (min: number, max: number) => {
    setMinPrice(min.toString());
    setMaxPrice(max.toString());
    onPriceChange([min, max]);
  };

  const handlePriceApply = () => {
    const min = Math.max(0, parseInt(minPrice) || 0);
    const max = Math.max(min, parseInt(maxPrice) || 10000);
    onPriceChange([min, max]);
  };

  const handleApplyAndClose = () => {
    onApply();
    onClose();
  };

  if (!isOpen) return null;

  const currentCategorySubcategories = selectedCategoryId
    ? subcategories.filter(s => s.category_id === selectedCategoryId)
    : [];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-background rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-border/50">
        {/* Top Drag Handle Indicator */}
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
          <span className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" /> Filter Products
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="text-xs font-bold text-destructive hover:underline transition-all flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content with ample bottom padding so items are never hidden behind sticky footer */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-12 space-y-6">
          {/* 1. Categories Section */}
          {categories.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('category')}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Categories
                </h3>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform text-muted-foreground",
                  expandedSections.includes('category') && "rotate-180"
                )} />
              </button>

              {expandedSections.includes('category') && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        onCategorySelect?.(null);
                        onSubcategorySelect?.(null);
                      }}
                      className={cn(
                        "text-xs font-bold px-3.5 py-2 rounded-xl border transition-all shadow-2xs",
                        !selectedCategoryId
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border/80 text-foreground hover:border-primary/40"
                      )}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            if (isSelected) {
                              onCategorySelect?.(null);
                              onSubcategorySelect?.(null);
                            } else {
                              onCategorySelect?.(cat.id);
                              onSubcategorySelect?.(null);
                            }
                          }}
                          className={cn(
                            "text-xs font-bold px-3.5 py-2 rounded-xl border transition-all shadow-2xs",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-card border-border/80 text-foreground hover:border-primary/40"
                          )}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Subcategories if a Category is selected */}
                  {selectedCategoryId && currentCategorySubcategories.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-2">Subcategories</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onSubcategorySelect?.(null)}
                          className={cn(
                            "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all",
                            !selectedSubcategoryId
                              ? "bg-secondary text-secondary-foreground border-secondary font-bold"
                              : "bg-muted/40 border-transparent text-muted-foreground"
                          )}
                        >
                          All Types
                        </button>
                        {currentCategorySubcategories.map((sub) => {
                          const isSubSelected = selectedSubcategoryId === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => onSubcategorySelect?.(isSubSelected ? null : sub.id)}
                              className={cn(
                                "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all",
                                isSubSelected
                                  ? "bg-destructive text-destructive-foreground border-destructive font-bold"
                                  : "bg-card border-border/60 text-foreground"
                              )}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border/40" />

          {/* 2. Price Range */}
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" /> Price Range (Rs.)
              </h3>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform text-muted-foreground",
                expandedSections.includes('price') && "rotate-180"
              )} />
            </button>

            {expandedSections.includes('price') && (
              <div className="space-y-3 pt-1">
                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                  {PRICE_PRESETS.map((preset) => {
                    const isActive = priceRange[0] === preset.min && priceRange[1] === preset.max;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => handlePricePreset(preset.min, preset.max)}
                        className={cn(
                          "text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border shadow-2xs",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary font-extrabold shadow-xs"
                            : "bg-muted/40 text-muted-foreground border-transparent hover:border-border"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                {/* Custom Range */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rs.</span>
                    <Input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      className="pl-9 h-10 text-xs font-bold rounded-xl bg-card border-border/80"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs font-bold">-</span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rs.</span>
                    <Input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="pl-9 h-10 text-xs font-bold rounded-xl bg-card border-border/80"
                    />
                  </div>
                  <Button size="sm" onClick={handlePriceApply} className="h-10 px-4 text-xs font-extrabold rounded-xl shadow-xs">
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/40" />

          {/* 3. Colors */}
          {availableColors.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('color')}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" /> Colors
                </h3>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform text-muted-foreground",
                  expandedSections.includes('color') && "rotate-180"
                )} />
              </button>

              {expandedSections.includes('color') && (
                <div className="flex flex-wrap gap-3 pt-1 pb-4">
                  {availableColors.map((color) => {
                    const isSelected = selectedColorIds.includes(color.id);
                    const isWhite = color.hex_code?.toLowerCase() === '#ffffff' || color.hex_code?.toLowerCase() === '#fff';
                    return (
                      <button
                        key={color.id}
                        onClick={() => onColorToggle(color.id)}
                        className={cn(
                          "w-9 h-9 rounded-full border-2 transition-all relative flex items-center justify-center shadow-xs",
                          isSelected
                            ? "border-primary ring-2 ring-primary/40 scale-110 shadow-md"
                            : "border-black/15 dark:border-white/20 hover:scale-105"
                        )}
                        style={{ backgroundColor: color.hex_code || '#cccccc' }}
                        title={color.name}
                      >
                        {isSelected && (
                          <Check className={cn(
                            "w-4 h-4 font-bold stroke-[3]",
                            isWhite ? "text-black" : "text-white"
                          )} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer with ample padding for mobile safe area */}
        <div className="p-4 px-5 pb-8 sm:pb-5 border-t border-border/60 bg-background/95 backdrop-blur-md shrink-0 shadow-lg z-20">
          <Button
            onClick={handleApplyAndClose}
            className="w-full h-12 rounded-2xl text-sm font-extrabold shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            Show {resultCount} Product{resultCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
