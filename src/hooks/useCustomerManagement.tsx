
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  role: string;
  created_at: string;
  total_orders: number;
  total_spent: number;
}

interface CustomerOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export function useCustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    setLoading(true);
    
    console.log('Fetching customers...');
    
    try {
      // Fetch all profiles (both admin and customer roles)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profile fetch error:', profilesError);
        toast({
          title: "Error",
          description: "Failed to fetch customer profiles: " + profilesError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('Raw profiles data:', profiles);

      if (!profiles || profiles.length === 0) {
        console.log('No profiles found in database');
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Filter for customers only in the component, not in the query
      const customerProfiles = profiles.filter(profile => profile.role === 'customer');
      console.log('Filtered customer profiles:', customerProfiles);

      // Get order statistics for each customer profile
      const customersWithStats = await Promise.all(
        customerProfiles.map(async (profile) => {
          try {
            console.log(`Fetching orders for customer ${profile.id}...`);
            
            const { data: orders, error: ordersError } = await supabase
              .from('orders')
              .select('total_amount')
              .eq('user_id', profile.id);

            if (ordersError) {
              console.error('Orders fetch error for customer', profile.id, ':', ordersError);
            }

            const totalOrders = orders?.length || 0;
            const totalSpent = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

            console.log(`Customer ${profile.email}: ${totalOrders} orders, Rs. ${totalSpent} spent`);

            return {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name,
              contact_number: profile.contact_number,
              whatsapp_number: profile.whatsapp_number,
              role: profile.role || 'customer',
              created_at: profile.created_at,
              total_orders: totalOrders,
              total_spent: totalSpent,
            };
          } catch (error) {
            console.error('Error processing customer profile', profile.id, ':', error);
            return {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name,
              contact_number: profile.contact_number,
              whatsapp_number: profile.whatsapp_number,
              role: profile.role || 'customer',
              created_at: profile.created_at,
              total_orders: 0,
              total_spent: 0,
            };
          }
        })
      );

      console.log('Final customers with stats:', customersWithStats);
      setCustomers(customersWithStats);
      
    } catch (error) {
      console.error('Error in fetchCustomers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId: string) => {
    console.log('Fetching orders for customer:', customerId);
    
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, status, created_at')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Customer orders fetch error:', error);
    } else {
      console.log('Customer orders:', data);
      setCustomerOrders(data || []);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    customerOrders,
    loading,
    fetchCustomers,
    fetchCustomerOrders,
  };
}
