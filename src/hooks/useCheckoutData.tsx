
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DeliveryCharge {
  id: string;
  place_name: string;
  delivery_price: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  qr_code_url: string;
}

export function useCheckoutData() {
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCheckoutData = async () => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    console.log('🔄 useCheckoutData: Starting checkout data fetch');
    setLoading(true);
    setError(null);

    // Set timeout fallback
    loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ useCheckoutData: Loading timeout after 10 seconds');
        setError('Loading took too long. Please try again.');
        setLoading(false);
      }
    }, 10000);

    try {
      console.log('🔄 useCheckoutData: Fetching delivery charges and payment methods...');
      
      const [deliveryRes, paymentRes] = await Promise.all([
        supabase
          .from('delivery_charges')
          .select('*')
          .eq('is_active', true)
          .order('place_name'),
        supabase
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ]);

      if (!isMounted) return;

      if (deliveryRes.error) {
        console.error('❌ useCheckoutData: Error fetching delivery charges:', deliveryRes.error);
        // Check for RLS issues
        if (deliveryRes.error.code === 'PGRST116' || deliveryRes.error.message.includes('row-level security')) {
          console.warn('⚠️ useCheckoutData: RLS may be blocking delivery charges access');
        }
        toast({
          title: "Error",
          description: "Failed to load delivery options",
          variant: "destructive",
        });
      } else {
        console.log('✅ useCheckoutData: Delivery charges fetched:', deliveryRes.data?.length || 0);
        setDeliveryCharges(deliveryRes.data || []);
      }

      if (paymentRes.error) {
        console.error('❌ useCheckoutData: Error fetching payment methods:', paymentRes.error);
        // Check for RLS issues
        if (paymentRes.error.code === 'PGRST116' || paymentRes.error.message.includes('row-level security')) {
          console.warn('⚠️ useCheckoutData: RLS may be blocking payment methods access');
        }
        toast({
          title: "Error",
          description: "Failed to load payment methods",
          variant: "destructive",
        });
      } else {
        console.log('✅ useCheckoutData: Payment methods fetched:', paymentRes.data?.length || 0);
        setPaymentMethods(paymentRes.data || []);
      }

      if (deliveryRes.error || paymentRes.error) {
        setError('Some checkout data could not be loaded. Please try again.');
      }
    } catch (error) {
      console.error('❌ useCheckoutData: Unexpected error fetching checkout data:', error);
      if (isMounted) {
        setError('Failed to load checkout data. Please try again.');
        toast({
          title: "Error",
          description: "Failed to load checkout data",
          variant: "destructive",
        });
      }
    } finally {
      if (isMounted) {
        console.log('✅ useCheckoutData: Setting loading to false');
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
    };
  };

  useEffect(() => {
    fetchCheckoutData();
  }, []);

  return {
    deliveryCharges,
    paymentMethods,
    loading,
    error,
    refetch: fetchCheckoutData
  };
}
