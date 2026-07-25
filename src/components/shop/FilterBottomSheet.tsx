import { useState, useEffect } from 'react';
import { X, Check, ChevronDown, SlidersHorizontal, Palette } from 'lucide-react';
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-background rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-foreground">Filter Products</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="text-xs font-bold text-destructive hover:underline bg-destructive/10 px-2.5 py-1 rounded-full transition-all"
            >
              Reset All
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* 1. Price Range - Placed First */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-teal-500/5 border border-emerald-500/20 space-y-3">
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  Rs.
                </div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-foreground">Price Range (Rs.)</h3>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform text-emerald-600",
                expandedSections.includes('price') && "rotate-180"
              )} />
            </button>

            {expandedSections.includes('price') && (
              <div className="space-y-3 pt-1">
                {/* Presets */}
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_PRESETS.map((preset) => {
                    const isActive = priceRange[0] === preset.min && priceRange[1] === preset.max;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => handlePricePreset(preset.min, preset.max)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-bold transition-all text-center border",
                          isActive
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-background hover:bg-muted text-foreground border-border/80"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                {/* Custom Range */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rs.</span>
                    <Input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      className="h-9 pl-8 text-xs font-semibold rounded-lg bg-background"
                    />
                  </div>
                  <span className="text-muted-foreground font-bold text-xs">-</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">Rs.</span>
                    <Input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="h-9 pl-8 text-xs font-semibold rounded-lg bg-background"
                    />
                  </div>
                  <Button size="sm" onClick={handlePriceApply} className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
                    Set
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Colors */}
          {availableColors.length > 0 && (
            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
              <button
                onClick={() => toggleSection('color')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center">
                    <Palette className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-foreground">Available Colors</h3>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform text-purple-600",
                  expandedSections.includes('color') && "rotate-180"
                )} />
              </button>

              {expandedSections.includes('color') && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {availableColors.map((color) => {
                    const isSelected = selectedColorIds.includes(color.id);
                    const isWhite = color.hex_code?.toLowerCase() === '#ffffff' || color.hex_code?.toLowerCase() === '#fff';
                    return (
                      <button
                        key={color.id}
                        onClick={() => onColorToggle(color.id)}
                        className={cn(
                          "w-9 h-9 rounded-full border-2 transition-all relative flex items-center justify-center shadow-2xs",
                          isSelected
                            ? "border-primary ring-2 ring-primary/40 scale-110 shadow-sm"
                            : "border-black/15 dark:border-white/20"
                        )}
                        style={{ backgroundColor: color.hex_code || '#cccccc' }}
                        title={color.name}
                      >
                        {isSelected && (
                          <Check className={cn(
                            "w-4 h-4 font-extrabold stroke-[3]",
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
        <div className="px-5 py-4 border-t border-border/60 bg-background safe-area-bottom">
          <Button
            onClick={handleApplyAndClose}
            className="w-full h-12 rounded-xl text-sm font-extrabold shadow-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Show {resultCount} Product{resultCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
