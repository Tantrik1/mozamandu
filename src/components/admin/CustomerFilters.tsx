
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CustomerFilters as FilterType } from '@/hooks/useCustomerManagement';

interface CustomerFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onClearFilters: () => void;
}

export function CustomerFilters({ filters, onFiltersChange, onClearFilters }: CustomerFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterType>(filters);

  const activeFilterCount = [
    filters.minOrders !== null,
    filters.maxOrders !== null,
    filters.minSpent !== null,
    filters.maxSpent !== null,
    filters.dateFrom !== null,
    filters.dateTo !== null,
    filters.status !== 'all'
  ].filter(Boolean).length;

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleClear = () => {
    const defaultFilters: FilterType = {
      minOrders: null,
      maxOrders: null,
      minSpent: null,
      maxSpent: null,
      dateFrom: null,
      dateTo: null,
      status: 'all'
    };
    setLocalFilters(defaultFilters);
    onClearFilters();
  };

  const updateLocal = (key: keyof FilterType, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Advanced Filters</span>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Count Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Order Count</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Minimum</Label>
                  <Input
                    type="number"
                    placeholder="Min orders"
                    value={localFilters.minOrders ?? ''}
                    onChange={(e) => updateLocal('minOrders', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Maximum</Label>
                  <Input
                    type="number"
                    placeholder="Max orders"
                    value={localFilters.maxOrders ?? ''}
                    onChange={(e) => updateLocal('maxOrders', e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
              </div>
            </div>

            {/* Spending Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total Spent (Rs.)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Minimum</Label>
                  <Input
                    type="number"
                    placeholder="Min spent"
                    value={localFilters.minSpent ?? ''}
                    onChange={(e) => updateLocal('minSpent', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Maximum</Label>
                  <Input
                    type="number"
                    placeholder="Max spent"
                    value={localFilters.maxSpent ?? ''}
                    onChange={(e) => updateLocal('maxSpent', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </div>
              </div>
            </div>

            {/* Join Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Join Date</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !localFilters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.dateFrom ? format(localFilters.dateFrom, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.dateFrom ?? undefined}
                        onSelect={(date) => updateLocal('dateFrom', date ?? null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !localFilters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.dateTo ? format(localFilters.dateTo, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.dateTo ?? undefined}
                        onSelect={(date) => updateLocal('dateTo', date ?? null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Customer Status */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Customer Status</Label>
              <div className="flex gap-2">
                <Button
                  variant={localFilters.status === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateLocal('status', 'all')}
                >
                  All
                </Button>
                <Button
                  variant={localFilters.status === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateLocal('status', 'active')}
                >
                  Active (Has Orders)
                </Button>
                <Button
                  variant={localFilters.status === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateLocal('status', 'inactive')}
                >
                  Inactive (No Orders)
                </Button>
              </div>
            </div>

            {/* Apply Button */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleApply} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
