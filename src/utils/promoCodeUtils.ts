
import { supabase } from '@/integrations/supabase/client';

export const incrementPromoCodeUsage = async (promoCode: string) => {
  try {
    console.log('Incrementing promo code usage for:', promoCode);
    
    // First get current usage count
    const { data: currentPromo, error: fetchError } = await supabase
      .from('promocodes')
      .select('used_count')
      .eq('code', promoCode.toUpperCase())
      .single();
    
    if (fetchError) {
      console.error('Error fetching promo code:', fetchError);
      throw fetchError;
    }
    
    // Increment the usage count
    const { data, error } = await supabase
      .from('promocodes')
      .update({ 
        used_count: (currentPromo?.used_count || 0) + 1
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
