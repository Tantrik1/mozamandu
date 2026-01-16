
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Interface matching your external Supabase schema (percentage-based only)
interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_percentage: number;
  minimum_order_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

interface PromoValidationResult {
  isValid: boolean;
  error?: string;
}

export function usePromoCode() {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate actual discount amount (percentage-based only)
  const calculateDiscount = (promo: PromoCode, orderTotal: number): number => {
    return (orderTotal * promo.discount_percentage) / 100;
  };

  // Validate promo code with all checks
  const validatePromoCode = async (promo: PromoCode, orderTotal: number): Promise<PromoValidationResult> => {
    const now = new Date();

    // Check if promo has started (valid_from)
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return {
        isValid: false,
        error: `This promo code is not active yet. It starts on ${new Date(promo.valid_from).toLocaleDateString()}`
      };
    }

    // Check if promo has expired (valid_until)
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return {
        isValid: false,
        error: 'This promo code has expired'
      };
    }

    // Check minimum order amount
    if (promo.minimum_order_amount && orderTotal < promo.minimum_order_amount) {
      return {
        isValid: false,
        error: `Minimum order amount is Rs. ${promo.minimum_order_amount}`
      };
    }

    return { isValid: true };
  };

  const applyPromoCode = async (orderTotal: number): Promise<boolean> => {
    if (!promoCode.trim() || isPromoApplied || isLoading) return false;

    setIsLoading(true);

    try {
      // Fetch promo code from database - only select columns that exist in your table
      const { data: promo, error } = await supabase
        .from('promocodes')
        .select('id, code, description, discount_percentage, minimum_order_amount, valid_from, valid_until, is_active')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promo) {
        toast({
          title: "Invalid Promo Code",
          description: "Promo code not found or is inactive",
          variant: "destructive",
        });
        return false;
      }

      // Validate the promo code
      const validation = await validatePromoCode(promo as PromoCode, orderTotal);
      
      if (!validation.isValid) {
        toast({
          title: "Invalid Promo Code",
          description: validation.error,
          variant: "destructive",
        });
        return false;
      }

      // Calculate discount
      const discount = calculateDiscount(promo as PromoCode, orderTotal);
      
      // Build success message
      const successMessage = `${promo.discount_percentage}% discount applied (Rs. ${discount.toFixed(2)} off)`;

      setAppliedPromo(promo as PromoCode);
      setIsPromoApplied(true);
      
      toast({
        title: "Promo Code Applied!",
        description: successMessage,
      });

      return true;
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast({
        title: "Error",
        description: "Failed to apply promo code. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setIsPromoApplied(false);
    setPromoCode('');
    toast({
      title: "Promo Code Removed",
      description: "The promo code has been removed from your order.",
    });
  };

  // Get discount amount for the current applied promo
  const getDiscountAmount = (orderTotal: number): number => {
    if (!appliedPromo) return 0;
    return calculateDiscount(appliedPromo, orderTotal);
  };

  return {
    promoCode,
    setPromoCode,
    appliedPromo,
    isPromoApplied,
    isLoading,
    applyPromoCode,
    removePromoCode,
    getDiscountAmount,
    calculateDiscount
  };
}
