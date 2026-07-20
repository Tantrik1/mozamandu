import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortOption = 'bestseller' | 'newest' | 'price_low' | 'price_high' | 'name';

interface SortBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'bestseller', label: 'Best Sellers' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
];

export function SortBottomSheet({
  isOpen,
  onClose,
  currentSort,
  onSortChange,
}: SortBottomSheetProps) {
  if (!isOpen) return null;

  const handleSelect = (sort: SortOption) => {
    onSortChange(sort);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 bg-background rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Sort By</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="py-2 safe-area-bottom">
          {SORT_OPTIONS.map((option) => {
            const isActive = currentSort === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full flex items-center justify-between px-5 py-4 transition-colors",
                  isActive ? "bg-primary/5" : "hover:bg-muted"
                )}
              >
                <span className={cn(
                  "font-medium",
                  isActive && "text-primary"
                )}>
                  {option.label}
                </span>
                {isActive && <Check className="w-5 h-5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
