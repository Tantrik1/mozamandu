
import { useState, useEffect } from 'react';
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
}

export function PromoCodeSection({
  onDiscountApplied,
  onPromoCodeUsed,
  orderTotal
}: PromoCodeSectionProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  const applyPromoCode = async () => {
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
      setAppliedPromo(data);
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
    setAppliedPromo(null);
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
            disabled={!!appliedPromo || isApplying}
          />
          {!appliedPromo ? (
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
