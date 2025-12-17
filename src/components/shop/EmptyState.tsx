import { Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  suggestions?: string[];
}

export function EmptyState({ hasFilters, onClearFilters, suggestions }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">No products found</h3>
      
      {hasFilters ? (
        <>
          <p className="text-muted-foreground mb-4 max-w-sm">
            {suggestions && suggestions.length > 0 ? (
              <>Try {suggestions.join(' or ')}</>
            ) : (
              <>Your filters didn't match any products. Try adjusting your filters.</>
            )}
          </p>
          <Button onClick={onClearFilters} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Clear all filters
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground max-w-sm">
          We're working on adding more products. Check back soon!
        </p>
      )}
    </div>
  );
}
