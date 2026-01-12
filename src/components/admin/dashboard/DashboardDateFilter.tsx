import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, startOfMonth, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

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

const presets: { value: DateFilterPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last14days', label: 'Last 14 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'last3months', label: 'Last 3 Months' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'last12months', label: 'Last 12 Months' },
  { value: 'allTime', label: 'All Time' },
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
      return { startDate: subDays(today, 6), endDate: endOfToday };
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
  
  const presetLabel = presets.find(p => p.value === preset)?.label || 'Last 7 Days';
  const range = getDateRangeFromPreset(preset);
  
  return {
    preset,
    ...range,
    label: presetLabel
  };
}

export function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: value.startDate,
    to: value.endDate
  });

  const handlePresetChange = (preset: DateFilterPreset) => {
    if (preset === 'custom') {
      setIsCalendarOpen(true);
      return;
    }
    onChange(createDateFilterValue(preset));
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onChange(createDateFilterValue('custom', range.from, range.to));
      setIsCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={value.preset} onValueChange={(v) => handlePresetChange(v as DateFilterPreset)}>
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.preset === 'custom' && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.label}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
              initialFocus
              className="p-3 pointer-events-auto"
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
      )}

      <div className="text-sm text-muted-foreground hidden md:block">
        {format(value.startDate, 'MMM d, yyyy')} - {format(value.endDate, 'MMM d, yyyy')}
      </div>
    </div>
  );
}
