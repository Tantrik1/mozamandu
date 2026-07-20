import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Check, X, Sparkles } from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, startOfMonth, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { motion, AnimatePresence } from 'framer-motion';

export type DateFilterPreset = 
  | 'today' 
  | 'yesterday' 
  | 'last7days' 
  | 'last14days' 
  | 'last30days' 
  | 'last3months' 
  | 'last12months' 
  | 'thisMonth'
  | 'thisYear'
  | 'allTime' 
  | 'custom';

export interface DateFilterValue {
  preset: DateFilterPreset;
  startDate: Date;
  endDate: Date;
  label: string;
}

interface DashboardDateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
}

const presets: { value: DateFilterPreset; label: string; shortLabel?: string }[] = [
  { value: 'today', label: 'Today', shortLabel: '1D' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days', shortLabel: '7D' },
  { value: 'last14days', label: 'Last 14 Days', shortLabel: '14D' },
  { value: 'last30days', label: 'Last 30 Days', shortLabel: '30D' },
  { value: 'thisMonth', label: 'This Month', shortLabel: 'MTD' },
  { value: 'last3months', label: 'Last 3 Months', shortLabel: '3M' },
  { value: 'thisYear', label: 'This Year', shortLabel: 'YTD' },
  { value: 'last12months', label: 'Last 12 Months', shortLabel: '1Y' },
  { value: 'allTime', label: 'All Time', shortLabel: 'All' },
  { value: 'custom', label: 'Custom Range' },
];

export function getDateRangeFromPreset(preset: DateFilterPreset): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = startOfDay(now);
  const endOfToday = endOfDay(now);

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: endOfToday };
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return { startDate: yesterday, endDate: endOfDay(yesterday) };
    case 'last7days':
      return { startDate: subDays(today, 6), endDate: endOfToday };
    case 'last14days':
      return { startDate: subDays(today, 13), endDate: endOfToday };
    case 'last30days':
      return { startDate: subDays(today, 29), endDate: endOfToday };
    case 'thisMonth':
      return { startDate: startOfMonth(now), endDate: endOfToday };
    case 'last3months':
      return { startDate: subMonths(today, 3), endDate: endOfToday };
    case 'thisYear':
      return { startDate: startOfYear(now), endDate: endOfToday };
    case 'last12months':
      return { startDate: subYears(today, 1), endDate: endOfToday };
    case 'allTime':
      return { startDate: new Date('2020-01-01'), endDate: endOfToday };
    default:
      return { startDate: new Date('2020-01-01'), endDate: endOfToday };
  }
}

export function createDateFilterValue(preset: DateFilterPreset, customStart?: Date, customEnd?: Date): DateFilterValue {
  if (preset === 'custom' && customStart && customEnd) {
    return {
      preset,
      startDate: startOfDay(customStart),
      endDate: endOfDay(customEnd),
      label: `${format(customStart, 'MMM d, yyyy')} - ${format(customEnd, 'MMM d, yyyy')}`
    };
  }
  
  const presetLabel = presets.find(p => p.value === preset)?.label || 'All Time';
  const range = getDateRangeFromPreset(preset);
  
  return {
    preset,
    ...range,
    label: presetLabel
  };
}

export function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>({
    from: value.startDate,
    to: value.endDate
  });

  // Update temp range when value changes externally
  useEffect(() => {
    if (value.preset !== 'custom') {
      setTempDateRange({ from: value.startDate, to: value.endDate });
    }
  }, [value]);

  const handlePresetChange = (preset: DateFilterPreset) => {
    if (preset === 'custom') {
      setTempDateRange({ from: value.startDate, to: value.endDate });
      setIsCalendarOpen(true);
      return;
    }
    onChange(createDateFilterValue(preset));
  };

  const handleApplyCustomRange = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      onChange(createDateFilterValue('custom', tempDateRange.from, tempDateRange.to));
      setIsCalendarOpen(false);
    }
  };

  const handleCancelCustomRange = () => {
    setTempDateRange({ from: value.startDate, to: value.endDate });
    setIsCalendarOpen(false);
  };

  const handleQuickPresetInDialog = (preset: DateFilterPreset) => {
    if (preset === 'custom') return;
    const range = getDateRangeFromPreset(preset);
    setTempDateRange({ from: range.startDate, to: range.endDate });
  };

  const getDaysInRange = () => {
    const days = Math.ceil((value.endDate.getTime() - value.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Main Select Dropdown */}
        <Select value={value.preset} onValueChange={(v) => handlePresetChange(v as DateFilterPreset)}>
          <SelectTrigger className="w-[160px] md:w-[180px] bg-background/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary/70" />
              <SelectValue placeholder="Select period" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-background/95 backdrop-blur-xl border-primary/20 z-50">
            {presets.map((preset) => (
              <SelectItem 
                key={preset.value} 
                value={preset.value}
                className="cursor-pointer hover:bg-primary/10"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{preset.label}</span>
                  {preset.shortLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {preset.shortLabel}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={value.label}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {format(value.startDate, 'MMM d')} - {format(value.endDate, 'MMM d, yyyy')}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
              {getDaysInRange()} days
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Edit Button for Custom */}
        {value.preset === 'custom' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCalendarOpen(true)}
            className="h-8 px-2"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="sm:max-w-[720px] p-0 gap-0 bg-background/95 backdrop-blur-xl border-primary/20 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Select Date Range
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col md:flex-row">
            {/* Quick Presets Sidebar */}
            <div className="md:w-48 border-r border-border/50 p-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Quick Select</p>
              <div className="grid grid-cols-3 md:grid-cols-1 gap-1">
                {presets.filter(p => p.value !== 'custom').map((preset) => (
                  <Button
                    key={preset.value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "justify-start text-xs h-8",
                      tempDateRange?.from && tempDateRange?.to && 
                      format(tempDateRange.from, 'yyyy-MM-dd') === format(getDateRangeFromPreset(preset.value).startDate, 'yyyy-MM-dd') &&
                      format(tempDateRange.to, 'yyyy-MM-dd') === format(getDateRangeFromPreset(preset.value).endDate, 'yyyy-MM-dd')
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted"
                    )}
                    onClick={() => handleQuickPresetInDialog(preset.value)}
                  >
                    {preset.shortLabel || preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Calendar Area */}
            <div className="flex-1 p-4">
              <Calendar
                mode="range"
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={2}
                className="pointer-events-auto"
                disabled={(date) => date > new Date()}
                classNames={{
                  months: "flex flex-col sm:flex-row gap-4",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-muted rounded-md transition-colors",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground font-semibold",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-foreground",
                  day_hidden: "invisible",
                }}
              />

              {/* Selected Range Summary */}
              {tempDateRange?.from && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-medium">
                        {tempDateRange.from ? format(tempDateRange.from, 'MMM d, yyyy') : 'Start date'} 
                        {' → '}
                        {tempDateRange.to ? format(tempDateRange.to, 'MMM d, yyyy') : 'End date'}
                      </span>
                    </div>
                    {tempDateRange.from && tempDateRange.to && (
                      <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
                        {Math.ceil((tempDateRange.to.getTime() - tempDateRange.from.getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border/50 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelCustomRange}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyCustomRange}
              disabled={!tempDateRange?.from || !tempDateRange?.to}
              className="gap-1 bg-primary hover:bg-primary/90"
            >
              <Check className="h-4 w-4" />
              Apply Range
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
