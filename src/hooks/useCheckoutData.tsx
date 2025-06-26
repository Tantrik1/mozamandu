
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DeliveryCharge {
  id: string;
  place_name: string;
  delivery_price: number;
  is_active: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  is_active: boolean;
  qr_code_url: string;
}

export function useCheckoutData() {
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharge[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchCheckoutData = async () => {
      try {
        console.log('🔄 useCheckoutData: Starting checkout data fetch');

        // Fetch delivery charges and payment methods in parallel
        const [deliveryResponse, paymentResponse] = await Promise.all([
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

        if (deliveryResponse.error) {
          console.error('❌ useCheckoutData: Delivery charges error:', deliveryResponse.error);
        } else {
          console.log('✅ useCheckoutData: Delivery charges loaded:', deliveryResponse.data?.length || 0);
          setDeliveryCharges(deliveryResponse.data || []);
        }

        if (paymentResponse.error) {
          console.error('❌ useCheckoutData: Payment methods error:', paymentResponse.error);
        } else {
          console.log('✅ useCheckoutData: Payment methods loaded:', paymentResponse.data?.length || 0);
          setPaymentMethods(paymentResponse.data || []);
        }

      } catch (error) {
        console.error('❌ useCheckoutData: Unexpected error:', error);
        if (isMounted) {
          toast({
            title: "Error",
            description: "Failed to load checkout data",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          console.log('✅ useCheckoutData: Checkout data fetch complete');
          setLoading(false);
        }
      }
    };

    fetchCheckoutData();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    deliveryCharges,
    paymentMethods,
    loading,
  };
}
