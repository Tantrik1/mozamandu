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
  { label: 'Under ₹300', min: 0, max: 300 },
  { label: '₹300 - ₹500', min: 300, max: 500 },
  { label: '₹500 - ₹1000', min: 500, max: 1000 },
  { label: 'Above ₹1000', min: 1000, max: 10000 },
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-background rounded-t-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              Reset all
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Price - Presets + Custom */}
          <div>
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full mb-3"
            >
              <h3 className="font-semibold">Price Range</h3>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                expandedSections.includes('price') && "rotate-180"
              )} />
            </button>
            {expandedSections.includes('price') && (
              <div className="space-y-3">
                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                  {PRICE_PRESETS.map((preset) => {
                    const isActive = priceRange[0] === preset.min && priceRange[1] === preset.max;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => handlePricePreset(preset.min, preset.max)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                {/* Custom Range */}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="h-10"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="h-10"
                  />
                  <Button size="sm" onClick={handlePriceApply}>
                    Go
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Colors - Visual Dots */}
          {availableColors.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('color')}
                className="flex items-center justify-between w-full mb-3"
              >
                <h3 className="font-semibold">Colors</h3>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  expandedSections.includes('color') && "rotate-180"
                )} />
              </button>
              {expandedSections.includes('color') && (
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => {
                    const isSelected = selectedColorIds.includes(color.id);
                    return (
                      <button
                        key={color.id}
                        onClick={() => onColorToggle(color.id)}
                        className={cn(
                          "w-9 h-9 rounded-full border-2 transition-all relative",
                          isSelected
                            ? "border-primary ring-2 ring-primary/30 scale-110"
                            : "border-border hover:scale-110"
                        )}
                        style={{ backgroundColor: color.hex_code || '#ccc' }}
                        title={color.name}
                      >
                        {isSelected && (
                          <Check className={cn(
                            "w-4 h-4 absolute inset-0 m-auto",
                            (color.hex_code === '#FFFFFF' || color.hex_code === '#ffffff') 
                              ? "text-black" 
                              : "text-white"
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

        {/* Footer - Apply Button */}
        <div className="px-5 py-4 border-t bg-background safe-area-bottom">
          <Button
            onClick={handleApplyAndClose}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            Show {resultCount} Product{resultCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
