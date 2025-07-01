import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { validateVariantStock } from '@/utils/stockCalculation';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const useCheckoutValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  const validateStock = async (cartItems: any[]): Promise<ValidationResult> => {
    try {
      console.log('Validating stock for checkout items:', cartItems.length);
      
      for (const item of cartItems) {
        const result = await validateVariantStock(
          item.productId,
          item.colorVariantId,
          item.sizeVariantId,
          item.quantity
        );

        if (!result.isValid) {
          const errorMessage = result.errorMessage || 
            `${item.productName} has insufficient stock. Available: ${result.availableStock}, Requested: ${item.quantity}`;
          
          console.log('Stock validation failed for item:', item.productName, errorMessage);
          return {
            isValid: false,
            error: errorMessage
          };
        }

        console.log(`Stock validated for ${item.productName}: ${result.availableStock} available`);
      }

      console.log('All items passed stock validation');
      return { isValid: true };
    } catch (error) {
      console.error('Stock validation error:', error);
      return {
        isValid: false,
        error: 'Failed to validate stock availability. Please try again.'
      };
    }
  };

  const validatePromoCode = async (code: string, orderTotal: number): Promise<ValidationResult & { discount?: number }> => {
    try {
      const { data: promo, error } = await supabase
        .from('promocodes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promo) {
        return { isValid: false, error: 'Invalid or expired promo code' };
      }

      // Check if promo code is still valid
      const now = new Date();
      const validFrom = new Date(promo.valid_from);
      const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;

      if (now < validFrom) {
        return { isValid: false, error: 'Promo code is not yet active' };
      }

      if (validUntil && now > validUntil) {
        return { isValid: false, error: 'Promo code has expired' };
      }

      // Check minimum order amount
      if (promo.minimum_order_amount && orderTotal < promo.minimum_order_amount) {
        return {
          isValid: false,
          error: `Minimum order amount for this promo code is $${promo.minimum_order_amount}`
        };
      }

      const discount = (orderTotal * promo.discount_percentage) / 100;
      return { isValid: true, discount };
    } catch (error) {
      console.error('Promo validation error:', error);
      return { isValid: false, error: 'Failed to validate promo code' };
    }
  };

  const validatePaymentAmount = (paidAmount: number, totalAmount: number): ValidationResult => {
    const minimumPayment = totalAmount * 0.2; // 20% minimum

    if (paidAmount < minimumPayment) {
      return {
        isValid: false,
        error: `Minimum payment required: $${minimumPayment.toFixed(2)}`
      };
    }

    if (paidAmount > totalAmount) {
      return {
        isValid: false,
        error: `Payment amount cannot exceed total order amount of $${totalAmount.toFixed(2)}`
      };
    }

    return { isValid: true };
  };

  const validateFileUpload = (file: File): ValidationResult => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Please upload a valid image file (JPEG, PNG, or WebP)'
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size must be less than 5MB'
      };
    }

    return { isValid: true };
  };

  return {
    validateStock,
    validatePromoCode,
    validatePaymentAmount,
    validateFileUpload,
    isValidating,
    setIsValidating
  };
};
