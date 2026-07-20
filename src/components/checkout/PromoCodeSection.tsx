
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Tag, X, Check } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  discount_type?: string;
  minimum_order_amount: number;
  max_discount?: number | null;
}

interface PromoCodeSectionProps {
  promoCode: string;
  setPromoCode: (code: string) => void;
  appliedPromo: PromoCode | null;
  isPromoApplied: boolean;
  isLoading?: boolean;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
  discountAmount?: number;
}

export function PromoCodeSection({
  promoCode,
  setPromoCode,
  appliedPromo,
  isPromoApplied,
  isLoading = false,
  onApplyPromo,
  onRemovePromo,
  discountAmount = 0
}: PromoCodeSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Promo Code</CardTitle>
        </div>
        <CardDescription>Apply a promo code to get discount on your order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              disabled={isPromoApplied || isLoading}
              className={isPromoApplied ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700' : ''}
            />
            {isPromoApplied && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
            )}
          </div>
          {!isPromoApplied ? (
            <Button 
              onClick={onApplyPromo} 
              disabled={!promoCode.trim() || isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Apply'
              )}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={onRemovePromo}
              className="min-w-[100px] text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
        
        {appliedPromo && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {appliedPromo.code} applied
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {appliedPromo.discount_type === 'fixed' 
                    ? `Rs. ${appliedPromo.discount_percentage} off`
                    : `${appliedPromo.discount_percentage}% discount`
                  }
                  {appliedPromo.max_discount && appliedPromo.discount_type !== 'fixed' && (
                    <span> (max Rs. {appliedPromo.max_discount})</span>
                  )}
                </p>
              </div>
              {discountAmount > 0 && (
                <div className="text-right">
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    -Rs. {discountAmount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
