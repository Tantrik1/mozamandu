
import { supabase } from '@/integrations/supabase/client';

export const incrementPromoCodeUsage = async (promoCode: string) => {
  try {
    console.log('Incrementing promo code usage for:', promoCode);
    
    const { data, error } = await supabase
      .from('promocodes')
      .update({ 
        used_count: 1 // This will be handled by the database trigger
      })
      .eq('code', promoCode.toUpperCase())
      .select('used_count');
    
    if (error) {
      console.error('Error incrementing promo code usage:', error);
      throw error;
    }
    
    console.log('Promo code usage incremented successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to increment promo code usage:', error);
    throw error;
  }
};
