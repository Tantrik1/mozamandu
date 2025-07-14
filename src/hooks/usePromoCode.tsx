
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  minimum_order_amount: number;
}

export function usePromoCode() {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [isPromoApplied, setIsPromoApplied] = useState(false);

  const applyPromoCode = async (totalWithDelivery: number) => {
    if (!promoCode || isPromoApplied) return;

    const { data: promo, error } = await supabase
      .from('promocodes')
      .select('*')
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !promo) {
      toast({
        title: "Invalid Promo Code",
        description: "Promo code not found or expired",
        variant: "destructive",
      });
      return;
    }

    // Check expiration date
    const now = new Date();
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      toast({
        title: "Invalid Promo Code",
        description: "Promo code has expired",
        variant: "destructive",
      });
      return;
    }

    if (promo.minimum_order_amount && totalWithDelivery < promo.minimum_order_amount) {
      toast({
        title: "Invalid Promo Code",
        description: `Minimum order amount is Rs. ${promo.minimum_order_amount}`,
        variant: "destructive",
      });
      return;
    }

    setAppliedPromo(promo);
    setIsPromoApplied(true);
    toast({
      title: "Promo Code Applied!",
      description: `${promo.discount_percentage}% discount applied`,
    });
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setIsPromoApplied(false);
    setPromoCode('');
  };

  return {
    promoCode,
    setPromoCode,
    appliedPromo,
    isPromoApplied,
    applyPromoCode,
    removePromoCode
  };
}
