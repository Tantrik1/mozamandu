import { memo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  reviewCount?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export const StarRating = memo(function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = false,
  reviewCount,
  interactive = false,
  onRatingChange,
  className
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, index) => {
          const fillPercentage = Math.min(Math.max(rating - index, 0), 1) * 100;
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(index)}
              disabled={!interactive}
              className={cn(
                'relative transition-transform',
                interactive && 'cursor-pointer hover:scale-110',
                !interactive && 'cursor-default'
              )}
            >
              {/* Background star (empty) */}
              <Star
                className={cn(
                  sizeClasses[size],
                  'text-muted-foreground/30 fill-muted-foreground/10'
                )}
              />
              {/* Foreground star (filled) - clipped based on rating */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercentage}%` }}
              >
                <Star
                  className={cn(
                    sizeClasses[size],
                    'text-amber-500 fill-amber-500'
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
      
      {showValue && rating > 0 && (
        <span className={cn('font-medium text-foreground', textSizeClasses[size])}>
          {rating.toFixed(1)}
        </span>
      )}
      
      {reviewCount !== undefined && (
        <span className={cn('text-muted-foreground', textSizeClasses[size])}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
});
