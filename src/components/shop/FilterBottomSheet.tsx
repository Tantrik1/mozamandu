import { useState, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Color {
  id: string;
  name: string;
  hex_code: string | null;
}

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
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
  availableColors,
  selectedColorIds,
  onColorToggle,
  priceRange,
  onPriceChange,
  onApply,
  onReset,
  resultCount,
}: FilterBottomSheetProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['price', 'color']);
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

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-background rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">Filter Products</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="text-xs font-bold text-destructive hover:underline transition-all"
            >
              Reset All
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* 1. Price Range */}
          <div className="space-y-3">
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Price Range</h3>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform text-muted-foreground",
                expandedSections.includes('price') && "rotate-180"
              )} />
            </button>

            {expandedSections.includes('price') && (
              <div className="space-y-3 pt-1">
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {PRICE_PRESETS.map((preset) => {
                    const isActive = priceRange[0] === preset.min && priceRange[1] === preset.max;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => handlePricePreset(preset.min, preset.max)}
                        className={cn(
                          "text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all border",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary font-bold"
                            : "bg-muted/40 text-muted-foreground border-transparent"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                {/* Custom Range */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min Rs."
                      className="h-8 text-xs font-semibold rounded-lg"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs font-bold">-</span>
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max Rs."
                      className="h-8 text-xs font-semibold rounded-lg"
                    />
                  </div>
                  <Button size="sm" onClick={handlePriceApply} className="h-8 px-3 text-xs font-bold rounded-lg">
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/40" />

          {/* 2. Colors */}
          {availableColors.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('color')}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Available Colors</h3>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform text-muted-foreground",
                  expandedSections.includes('color') && "rotate-180"
                )} />
              </button>

              {expandedSections.includes('color') && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {availableColors.map((color) => {
                    const isSelected = selectedColorIds.includes(color.id);
                    const isWhite = color.hex_code?.toLowerCase() === '#ffffff' || color.hex_code?.toLowerCase() === '#fff';
                    return (
                      <button
                        key={color.id}
                        onClick={() => onColorToggle(color.id)}
                        className={cn(
                          "w-8 h-8 rounded-full border transition-all relative flex items-center justify-center",
                          isSelected
                            ? "border-primary ring-2 ring-primary/40 scale-110 shadow-2xs"
                            : "border-black/15 dark:border-white/20"
                        )}
                        style={{ backgroundColor: color.hex_code || '#cccccc' }}
                        title={color.name}
                      >
                        {isSelected && (
                          <Check className={cn(
                            "w-3.5 h-3.5 font-bold stroke-[3]",
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

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border/50 bg-background safe-area-bottom">
          <Button
            onClick={handleApplyAndClose}
            className="w-full h-11 rounded-xl text-sm font-bold shadow-md bg-primary text-primary-foreground"
          >
            Show {resultCount} Product{resultCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
