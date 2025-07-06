
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const useCheckoutValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  const validateStock = async (cartItems: any[]): Promise<ValidationResult> => {
    try {
      console.log('=== CHECKOUT STOCK VALIDATION ===');
      console.log('Validating stock for checkout items:', cartItems.length);

      const errorMessages: string[] = [];
      
      for (const item of cartItems) {
        const { data: inventory, error } = await supabase
          .from('product_inventory')
          .select('available_stock')
          .eq('id', item.product_inventory_id)
          .single();

        if (error) {
          errorMessages.push(`Failed to check stock for item ${item.product_name}`);
          continue;
        }

        if (!inventory || inventory.available_stock < item.quantity) {
          errorMessages.push(`Insufficient stock for ${item.product_name}. Available: ${inventory?.available_stock || 0}, Requested: ${item.quantity}`);
        }
      }

      if (errorMessages.length > 0) {
        console.log('Checkout stock validation failed:', errorMessages[0]);
        return {
          isValid: false,
          error: errorMessages[0]
        };
      }

      console.log('All checkout items passed stock validation');
      return { isValid: true };
    } catch (error) {
      console.error('Checkout stock validation error:', error);
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
        const expiredDate = validUntil.toLocaleDateString();
        return { isValid: false, error: `Promo code expired on ${expiredDate}` };
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
