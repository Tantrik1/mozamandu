
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  minimum_order_amount: number;
}

interface PromoCodeSectionProps {
  onDiscountApplied: (discount: number) => void;
  onPromoCodeUsed: (code: string) => void;
  orderTotal: number;
  promoCode?: string;
  setPromoCode?: (code: string) => void;
  appliedPromo?: PromoCode | null;
  isPromoApplied?: boolean;
  onApplyPromo?: () => void;
  onRemovePromo?: () => void;
}

export function PromoCodeSection({
  onDiscountApplied,
  onPromoCodeUsed,
  orderTotal,
  promoCode: externalPromoCode,
  setPromoCode: externalSetPromoCode,
  appliedPromo: externalAppliedPromo,
  isPromoApplied: externalIsPromoApplied,
  onApplyPromo: externalOnApplyPromo,
  onRemovePromo: externalOnRemovePromo
}: PromoCodeSectionProps) {
  const [internalPromoCode, setInternalPromoCode] = useState('');
  const [internalAppliedPromo, setInternalAppliedPromo] = useState<PromoCode | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  // Use external state if provided, otherwise use internal state
  const promoCode = externalPromoCode !== undefined ? externalPromoCode : internalPromoCode;
  const setPromoCode = externalSetPromoCode || setInternalPromoCode;
  const appliedPromo = externalAppliedPromo !== undefined ? externalAppliedPromo : internalAppliedPromo;
  const isPromoApplied = externalIsPromoApplied !== undefined ? externalIsPromoApplied : !!internalAppliedPromo;

  const applyPromoCode = async () => {
    if (externalOnApplyPromo) {
      externalOnApplyPromo();
      return;
    }

    if (!promoCode.trim()) return;

    setIsApplying(true);
    try {
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: 'Invalid Promo Code',
          description: 'The promo code you entered is not valid or has expired.',
          variant: 'destructive',
        });
        return;
      }

      if (orderTotal < data.minimum_order_amount) {
        toast({
          title: 'Minimum Order Not Met',
          description: `Minimum order amount for this promo code is Rs. ${data.minimum_order_amount}`,
          variant: 'destructive',
        });
        return;
      }

      const discount = (orderTotal * data.discount_percentage) / 100;
      setInternalAppliedPromo(data);
      onDiscountApplied(discount);
      onPromoCodeUsed(data.code);
      
      toast({
        title: 'Promo Code Applied!',
        description: `You saved Rs. ${discount.toFixed(2)} with "${data.code}"`,
      });
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply promo code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const removePromoCode = () => {
    if (externalOnRemovePromo) {
      externalOnRemovePromo();
      return;
    }

    setInternalAppliedPromo(null);
    setPromoCode('');
    onDiscountApplied(0);
    onPromoCodeUsed('');
    toast({
      title: 'Promo Code Removed',
      description: 'The promo code has been removed from your order.',
    });
  };

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
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Enter promo code"
            disabled={isPromoApplied || isApplying}
          />
          {!isPromoApplied ? (
            <Button 
              onClick={applyPromoCode} 
              disabled={!promoCode.trim() || isApplying}
            >
              {isApplying ? 'Applying...' : 'Apply'}
            </Button>
          ) : (
            <Button variant="outline" onClick={removePromoCode}>
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
