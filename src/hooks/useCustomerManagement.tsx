
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
    
    console.log('🔍 Fetching customers with comprehensive order data...');
    
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

      // Filter for customers only
      const customerProfiles = profiles.filter(profile => profile.role === 'customer');
      console.log('Filtered customer profiles:', customerProfiles);

      // Fetch ALL orders from both tables to properly associate with customers
      console.log('📊 Fetching all order data...');
      const [allCustomerOrders, allOrders] = await Promise.all([
        supabase
          .from('customer_orders')
          .select('user_id, customer_email, contact_number, total_amount, promocode_used')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('user_id, customer_email, contact_number, total_amount, promocode_used')
          .order('created_at', { ascending: false })
      ]);

      let allOrdersData: any[] = [];
      
      if (!allCustomerOrders.error && allCustomerOrders.data) {
        allOrdersData = [...allOrdersData, ...allCustomerOrders.data.map(order => ({ ...order, source: 'customer_orders' }))];
      }
      
      if (!allOrders.error && allOrders.data) {
        allOrdersData = [...allOrdersData, ...allOrders.data.map(order => ({ ...order, source: 'orders' }))];
      }

      console.log(`📈 Total orders found: ${allOrdersData.length}`);

      // Get comprehensive statistics for each customer profile
      const customersWithStats = await Promise.all(
        customerProfiles.map(async (profile) => {
          try {
            console.log(`🔍 Processing customer ${profile.email} (${profile.id})...`);
            
            // Find orders associated with this customer by multiple methods:
            // 1. Direct user_id match
            // 2. Email match (for guest orders)
            // 3. Phone number match (for guest orders)
            const customerOrders = allOrdersData.filter(order => {
              // Direct user ID match
              if (order.user_id === profile.id) {
                return true;
              }
              
              // Email match for guest orders
              if (order.user_id === null && order.customer_email && profile.email) {
                return order.customer_email.toLowerCase() === profile.email.toLowerCase();
              }
              
              // Phone number match for guest orders
              if (order.user_id === null && order.contact_number && profile.contact_number) {
                // Clean phone numbers for comparison
                const orderPhone = order.contact_number.replace(/\D/g, '');
                const profilePhone = profile.contact_number.replace(/\D/g, '');
                return orderPhone === profilePhone;
              }
              
              return false;
            });

            const totalOrders = customerOrders.length;
            const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

            console.log(`✅ Customer ${profile.email}: ${totalOrders} orders, Rs. ${totalSpent.toFixed(2)} spent`);
            console.log(`   - Direct user_id matches: ${customerOrders.filter(o => o.user_id === profile.id).length}`);
            console.log(`   - Email matches: ${customerOrders.filter(o => o.user_id === null && o.customer_email?.toLowerCase() === profile.email?.toLowerCase()).length}`);
            console.log(`   - Phone matches: ${customerOrders.filter(o => o.user_id === null && o.contact_number && profile.contact_number && o.contact_number.replace(/\D/g, '') === profile.contact_number.replace(/\D/g, '')).length}`);

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
            console.error('❌ Error processing customer profile', profile.id, ':', error);
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

      console.log('✅ Final customers with comprehensive stats:', customersWithStats);
      console.log(`📊 Summary: ${customersWithStats.length} customers processed`);
      console.log(`💰 Total revenue: Rs. ${customersWithStats.reduce((sum, c) => sum + c.total_spent, 0).toFixed(2)}`);
      
      setCustomers(customersWithStats);
      
    } catch (error) {
      console.error('❌ Error in fetchCustomers:', error);
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
    console.log('🔍 Fetching comprehensive orders for customer:', customerId);
    
    // Get customer profile for email/phone matching
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('email, contact_number')
      .eq('id', customerId)
      .single();

    if (!customerProfile) {
      console.error('Customer profile not found');
      setCustomerOrders([]);
      return;
    }

    // Try both tables with comprehensive matching
    const [customerOrdersResult, ordersResult] = await Promise.all([
      supabase
        .from('customer_orders')
        .select('id, order_number, total_amount, status, created_at, user_id, customer_email, contact_number, promocode_used')
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, user_id, customer_email, contact_number, promocode_used')
        .order('created_at', { ascending: false })
    ]);

    let allOrders: any[] = [];
    
    // Process customer_orders
    if (!customerOrdersResult.error && customerOrdersResult.data) {
      const matchingOrders = customerOrdersResult.data.filter(order => {
        // Direct user_id match
        if (order.user_id === customerId) return true;
        
        // Email match for guest orders
        if (order.user_id === null && order.customer_email && customerProfile.email) {
          return order.customer_email.toLowerCase() === customerProfile.email.toLowerCase();
        }
        
        // Phone number match for guest orders
        if (order.user_id === null && order.contact_number && customerProfile.contact_number) {
          const orderPhone = order.contact_number.replace(/\D/g, '');
          const profilePhone = customerProfile.contact_number.replace(/\D/g, '');
          return orderPhone === profilePhone;
        }
        
        return false;
      });
      
      allOrders = [...allOrders, ...matchingOrders.map(order => ({ ...order, source: 'customer_orders' }))];
    }
    
    // Process orders
    if (!ordersResult.error && ordersResult.data) {
      const matchingOrders = ordersResult.data.filter(order => {
        // Direct user_id match
        if (order.user_id === customerId) return true;
        
        // Email match for guest orders
        if (order.user_id === null && order.customer_email && customerProfile.email) {
          return order.customer_email.toLowerCase() === customerProfile.email.toLowerCase();
        }
        
        // Phone number match for guest orders
        if (order.user_id === null && order.contact_number && customerProfile.contact_number) {
          const orderPhone = order.contact_number.replace(/\D/g, '');
          const profilePhone = customerProfile.contact_number.replace(/\D/g, '');
          return orderPhone === profilePhone;
        }
        
        return false;
      });
      
      allOrders = [...allOrders, ...matchingOrders.map(order => ({ ...order, source: 'orders' }))];
    }

    // Remove duplicates based on order_number and total_amount
    const uniqueOrders = allOrders.filter((order, index, self) => 
      index === self.findIndex(o => 
        o.order_number === order.order_number && 
        o.total_amount === order.total_amount &&
        o.created_at === order.created_at
      )
    );

    console.log(`✅ Found ${uniqueOrders.length} orders for customer ${customerProfile.email}`);
    console.log(`   - From customer_orders: ${uniqueOrders.filter(o => o.source === 'customer_orders').length}`);
    console.log(`   - From orders: ${uniqueOrders.filter(o => o.source === 'orders').length}`);
    
    setCustomerOrders(uniqueOrders);
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
