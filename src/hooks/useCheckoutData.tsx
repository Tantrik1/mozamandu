
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

  const fetchCheckoutData = async () => {
    setLoading(true);
    try {
      console.log('Fetching checkout data...');
      
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

      if (deliveryRes.error) {
        console.error('Error fetching delivery charges:', deliveryRes.error);
        toast({
          title: "Error",
          description: "Failed to load delivery options",
          variant: "destructive",
        });
      } else {
        setDeliveryCharges(deliveryRes.data || []);
      }

      if (paymentRes.error) {
        console.error('Error fetching payment methods:', paymentRes.error);
        toast({
          title: "Error",
          description: "Failed to load payment methods",
          variant: "destructive",
        });
      } else {
        setPaymentMethods(paymentRes.data || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching checkout data:', error);
      toast({
        title: "Error",
        description: "Failed to load checkout data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckoutData();
  }, []);

  return {
    deliveryCharges,
    paymentMethods,
    loading,
    refetch: fetchCheckoutData
  };
}
