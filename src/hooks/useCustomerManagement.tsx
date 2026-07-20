
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Customer {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  contact_number: string | null;
  whatsapp_number: string | null;
  address: string | null;
  role: string;
  created_at: string;
  total_orders: number;
  total_spent: number;
  is_guest: boolean;
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  subtotal?: number;
  delivery_charge?: number;
  promocode_discount?: number;
  delivery_address?: string;
  payment_screenshot_url?: string;
  source?: 'customer_orders' | 'orders';
}

export interface OrderItem {
  id: string;
  product_name: string;
  color_name: string | null;
  size_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  sku: string | null;
  pricing_mode: string | null;
  pricing_details: {
    basePrice?: number;
    savings?: number;
    tierBreakdown?: Array<{
      tierName: string;
      unitsInTier: number;
      unitPrice: number;
      tierTotal: number;
      discountAmount: number;
    }>;
  } | null;
}

export interface CustomerFilters {
  minOrders: number | null;
  maxOrders: number | null;
  minSpent: number | null;
  maxSpent: number | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  status: 'all' | 'active' | 'inactive';
}

export interface SortConfig {
  column: 'full_name' | 'email' | 'total_orders' | 'total_spent' | 'created_at';
  direction: 'asc' | 'desc';
}

export function useCustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingOrderItems, setIsLoadingOrderItems] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'created_at', direction: 'desc' });
  const [filters, setFilters] = useState<CustomerFilters>({
    minOrders: null, maxOrders: null, minSpent: null, maxSpent: null,
    dateFrom: null, dateTo: null, status: 'all'
  });

  const applyFiltersAndSort = useCallback((list: Customer[], f: CustomerFilters, s: SortConfig, query: string) => {
    let result = [...list];
    
    // Apply search query first
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(c => 
        c.email.toLowerCase().includes(q) || 
        c.full_name?.toLowerCase().includes(q) || 
        c.phone?.includes(q) || 
        c.contact_number?.includes(q) ||
        c.whatsapp?.includes(q) ||
        c.whatsapp_number?.includes(q)
      );
    }
    
    if (f.minOrders !== null) result = result.filter(c => c.total_orders >= f.minOrders!);
    if (f.maxOrders !== null) result = result.filter(c => c.total_orders <= f.maxOrders!);
    if (f.minSpent !== null) result = result.filter(c => c.total_spent >= f.minSpent!);
    if (f.maxSpent !== null) result = result.filter(c => c.total_spent <= f.maxSpent!);
    if (f.dateFrom) result = result.filter(c => new Date(c.created_at) >= f.dateFrom!);
    if (f.dateTo) result = result.filter(c => new Date(c.created_at) <= f.dateTo!);
    if (f.status === 'active') result = result.filter(c => c.total_orders > 0);
    else if (f.status === 'inactive') result = result.filter(c => c.total_orders === 0);

    result.sort((a, b) => {
      let aVal: any = a[s.column] ?? '';
      let bVal: any = b[s.column] ?? '';
      if (s.column === 'created_at') { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime(); }
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal as string).toLowerCase(); }
      if (aVal < bVal) return s.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return s.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredCustomers(result);
    setCurrentPage(1);
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: profiles, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const { data: coData } = await supabase.from('customer_orders').select('user_id, total_amount, customer_email, customer_name, contact_number, whatsapp_number, delivery_address, created_at');
      const { data: goData } = await supabase.from('orders').select('customer_email, customer_name, contact_number, whatsapp_number, delivery_address, total_amount, created_at');

      // Track which emails/phones belong to registered customers
      const registeredEmails = new Set((profiles || []).map(p => p.email?.toLowerCase()).filter(Boolean));
      const registeredPhones = new Set((profiles || []).map(p => p.phone).filter(Boolean));

      // Build registered customers with stats
      const customersWithStats: Customer[] = (profiles || []).filter(p => p.role === 'customer').map(p => {
        const pAny = p as any;
        const phone = p.phone || pAny.contact_number;
        const allOrders = [
          ...(coData || []).filter(o => o.user_id === p.id || o.customer_email?.toLowerCase() === p.email?.toLowerCase() || (phone && o.contact_number === phone)),
          ...(goData || []).filter(o => o.customer_email?.toLowerCase() === p.email?.toLowerCase() || (phone && o.contact_number === phone))
        ];
        return {
          id: p.id, email: p.email || '', full_name: p.full_name,
          phone: p.phone || pAny.contact_number || null, whatsapp: p.whatsapp || pAny.whatsapp_number || null,
          contact_number: pAny.contact_number || p.phone || null, whatsapp_number: pAny.whatsapp_number || p.whatsapp || null,
          address: p.address || null, role: p.role || 'customer', created_at: p.created_at || new Date().toISOString(),
          total_orders: allOrders.length, total_spent: allOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
          is_guest: false
        };
      });

      // Find guest buyers from orders table (not linked to any profile)
      const guestOrdersMap = new Map<string, { orders: typeof goData; firstOrder: any }>();
      
      (goData || []).forEach(order => {
        const email = order.customer_email?.toLowerCase();
        const phone = order.contact_number;
        
        // Skip if this order belongs to a registered customer
        if (email && registeredEmails.has(email)) return;
        if (phone && registeredPhones.has(phone)) return;
        
        // Use email or phone as unique key for guest
        const key = email || phone || '';
        if (!key) return;
        
        if (!guestOrdersMap.has(key)) {
          guestOrdersMap.set(key, { orders: [order], firstOrder: order });
        } else {
          const existing = guestOrdersMap.get(key)!;
          existing.orders.push(order);
          // Keep earliest order as first order
          if (new Date(order.created_at) < new Date(existing.firstOrder.created_at)) {
            existing.firstOrder = order;
          }
        }
      });

      // Also check customer_orders for guests (orders without user_id)
      (coData || []).forEach(order => {
        if (order.user_id) return; // Has user_id, not a guest
        
        const email = order.customer_email?.toLowerCase();
        const phone = order.contact_number;
        
        if (email && registeredEmails.has(email)) return;
        if (phone && registeredPhones.has(phone)) return;
        
        const key = email || phone || '';
        if (!key) return;
        
        if (!guestOrdersMap.has(key)) {
          guestOrdersMap.set(key, { orders: [order as any], firstOrder: order });
        } else {
          const existing = guestOrdersMap.get(key)!;
          existing.orders.push(order as any);
          if (new Date(order.created_at!) < new Date(existing.firstOrder.created_at)) {
            existing.firstOrder = order;
          }
        }
      });

      // Convert guest orders to Customer objects
      const guestCustomers: Customer[] = Array.from(guestOrdersMap.entries()).map(([key, data]) => {
        const firstOrder = data.firstOrder;
        const totalSpent = data.orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        
        return {
          id: `guest_${key}`, // Unique ID for guests
          email: firstOrder.customer_email || '',
          full_name: firstOrder.customer_name || null,
          phone: firstOrder.contact_number || null,
          whatsapp: firstOrder.whatsapp_number || null,
          contact_number: firstOrder.contact_number || null,
          whatsapp_number: firstOrder.whatsapp_number || null,
          address: firstOrder.delivery_address || null,
          role: 'guest',
          created_at: firstOrder.created_at || new Date().toISOString(),
          total_orders: data.orders.length,
          total_spent: totalSpent,
          is_guest: true
        };
      });

      const allCustomers = [...customersWithStats, ...guestCustomers];
      
      setCustomers(allCustomers);
      applyFiltersAndSort(allCustomers, filters, sortConfig, searchQuery);
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to load customers'); 
    } finally { 
      setLoading(false); 
    }
  }, [filters, sortConfig, searchQuery, applyFiltersAndSort]);

  const updateFilters = useCallback((f: CustomerFilters) => { 
    setFilters(f); 
    applyFiltersAndSort(customers, f, sortConfig, searchQuery); 
  }, [customers, sortConfig, searchQuery, applyFiltersAndSort]);
  
  const updateSort = useCallback((s: SortConfig) => { 
    setSortConfig(s); 
    applyFiltersAndSort(customers, filters, s, searchQuery); 
  }, [customers, filters, searchQuery, applyFiltersAndSort]);
  
  const updateSearch = useCallback((q: string) => {
    setSearchQuery(q);
    applyFiltersAndSort(customers, filters, sortConfig, q);
  }, [customers, filters, sortConfig, applyFiltersAndSort]);
  
  const clearFilters = useCallback(() => { 
    const d: CustomerFilters = { minOrders: null, maxOrders: null, minSpent: null, maxSpent: null, dateFrom: null, dateTo: null, status: 'all' }; 
    setFilters(d); 
    setSearchQuery('');
    applyFiltersAndSort(customers, d, sortConfig, ''); 
  }, [customers, sortConfig, applyFiltersAndSort]);

  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredCustomers.length / pageSize);

  const fetchCustomerOrders = async (customerId: string) => {
    setIsLoadingOrders(true);
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;
      const phone = customer.phone || customer.contact_number;
      const isGuest = customer.is_guest;
      
      let co: any[] = [];
      let go: any[] = [];
      
      if (isGuest) {
        // For guests, only search by email/phone
        if (customer.email) {
          const { data: coEmail } = await supabase.from('customer_orders').select('*')
            .ilike('customer_email', customer.email)
            .order('created_at', { ascending: false });
          co = coEmail || [];
          
          const { data: goEmail } = await supabase.from('orders').select('*')
            .ilike('customer_email', customer.email)
            .order('created_at', { ascending: false });
          go = goEmail || [];
        }
        
        if (phone && !customer.email) {
          const { data: coPhone } = await supabase.from('customer_orders').select('*')
            .eq('contact_number', phone)
            .order('created_at', { ascending: false });
          co = coPhone || [];
          
          const { data: goPhone } = await supabase.from('orders').select('*')
            .eq('contact_number', phone)
            .order('created_at', { ascending: false });
          go = goPhone || [];
        }
      } else {
        // For registered customers, include user_id matching
        const { data: coData } = await supabase.from('customer_orders').select('*')
          .or(`user_id.eq.${customerId},customer_email.ilike.${customer.email}${phone ? `,contact_number.eq.${phone}` : ''}`)
          .order('created_at', { ascending: false });
        co = coData || [];
        
        const { data: goData } = await supabase.from('orders').select('*')
          .or(`customer_email.ilike.${customer.email}${phone ? `,contact_number.eq.${phone}` : ''}`)
          .order('created_at', { ascending: false });
        go = goData || [];
      }
      
      const all = [
        ...(co || []).map(o => ({ ...o, source: 'customer_orders' as const })), 
        ...(go || []).map(o => ({ ...o, source: 'orders' as const }))
      ];
      const unique = all.reduce((acc, o) => { 
        if (!acc.find(x => x.order_number === o.order_number)) acc.push(o); 
        return acc; 
      }, [] as typeof all);
      
      setCustomerOrders(unique);
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to load orders'); 
    } finally { 
      setIsLoadingOrders(false); 
    }
  };

  const fetchOrderItems = async (orderId: string, source: 'customer_orders' | 'orders') => {
    if (orderItems[orderId]) return orderItems[orderId];
    setIsLoadingOrderItems(orderId);
    try {
      const table = source === 'customer_orders' ? 'customer_order_item_details' : 'order_item_details';
      const { data, error } = await supabase.from(table).select('*').eq('order_id', orderId);
      if (error) throw error;
      const items: OrderItem[] = (data || []).map(i => ({ 
        id: i.id, product_name: i.product_name, color_name: i.color_name, 
        size_name: i.size_name, quantity: i.quantity, unit_price: i.unit_price, 
        total_price: i.total_price, sku: i.sku,
        pricing_mode: i.pricing_mode || null,
        pricing_details: i.pricing_details as OrderItem['pricing_details']
      }));
      setOrderItems(prev => ({ ...prev, [orderId]: items }));
      return items;
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to load order items'); 
      return []; 
    } finally { 
      setIsLoadingOrderItems(null); 
    }
  };

  const exportToCSV = useCallback(() => {
    const headers = ['Name', 'Email', 'Phone', 'WhatsApp', 'Address', 'Total Orders', 'Total Spent', 'Joined Date', 'Type'];
    const rows = filteredCustomers.map(c => [
      c.full_name || '', c.email, c.phone || c.contact_number || '', 
      c.whatsapp || c.whatsapp_number || '', c.address || '', 
      c.total_orders.toString(), c.total_spent.toFixed(2), 
      new Date(c.created_at).toLocaleDateString(),
      c.is_guest ? 'Guest' : 'Registered'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(blob); 
    link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
    toast.success(`Exported ${filteredCustomers.length} customers`);
  }, [filteredCustomers]);

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => { if (customers.length) applyFiltersAndSort(customers, filters, sortConfig, searchQuery); }, [customers]);

  return { 
    customers, filteredCustomers, paginatedCustomers, customerOrders, orderItems, 
    loading, isLoadingOrders, isLoadingOrderItems, 
    currentPage, setCurrentPage, pageSize, setPageSize, totalPages, 
    sortConfig, updateSort, filters, updateFilters, clearFilters, 
    searchQuery, updateSearch,
    fetchCustomers, fetchCustomerOrders, fetchOrderItems, exportToCSV 
  };
}
