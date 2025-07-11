
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  minimum_order_amount: number;
}

interface PromoCodeSectionProps {
  promoCode: string;
  setPromoCode: (value: string) => void;
  appliedPromo: PromoCode | null;
  isPromoApplied: boolean;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
}

export function PromoCodeSection({
  promoCode,
  setPromoCode,
  appliedPromo,
  isPromoApplied,
  onApplyPromo,
  onRemovePromo
}: PromoCodeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Promo Code</CardTitle>
        <CardDescription>Apply a promo code to get discount on your order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter promo code"
            disabled={isPromoApplied}
          />
          {!isPromoApplied ? (
            <Button onClick={onApplyPromo} disabled={!promoCode}>
              Apply
            </Button>
          ) : (
            <Button variant="outline" onClick={onRemovePromo}>
              Remove
            </Button>
          )}
        </div>
        {appliedPromo && (
          <p className="text-sm text-green-600 mt-1">
            Promo code "{appliedPromo.code}" applied - {appliedPromo.discount_percentage}% discount
          </p>
        )}
      </CardContent>
    </Card>
  );
}
