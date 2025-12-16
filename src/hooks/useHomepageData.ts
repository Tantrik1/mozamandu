import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch functions
const fetchLatestProducts = async () => {
  const { data } = await supabase
    .from('products')
    .select(`id, name, selling_price, image_url, subcategory:subcategories(name)`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8);
  return data || [];
};

const fetchMostSoldProducts = async () => {
  // Use aggregation to count orders per product - much more efficient
  const { data: orderData } = await supabase
    .from('customer_order_item_details')
    .select('product_name, quantity');

  const productCounts: Record<string, number> = {};
  orderData?.forEach(item => {
    productCounts[item.product_name] = (productCounts[item.product_name] || 0) + item.quantity;
  });

  const { data: products } = await supabase
    .from('products')
    .select(`id, name, selling_price, image_url, subcategory:subcategories(name)`)
    .eq('status', 'active')
    .limit(20); // Get more to ensure we have enough after sorting

  if (!products) return [];

  return products
    .map(p => ({ ...p, order_count: productCounts[p.name] || 0 }))
    .sort((a, b) => b.order_count - a.order_count)
    .slice(0, 8);
};

const fetchCategories = async () => {
  const { data } = await supabase
    .from('categories')
    .select(`id, name, description, subcategories(image_url)`)
    .eq('status', 'on')
    .limit(6);
  return data || [];
};

const fetchFAQs = async () => {
  const { data } = await supabase
    .from('faqs')
    .select('id, question, answer')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(4);
  return data || [];
};

const fetchFeaturedProducts = async () => {
  const { data } = await supabase
    .from('products')
    .select(`id, name, selling_price, cost_price, image_url, subcategory:subcategories(name)`)
    .eq('status', 'active')
    .eq('is_featured', true)
    .limit(4);
  return data || [];
};

const fetchNotice = async () => {
  const { data } = await supabase
    .from('notices')
    .select('id, title, description, image_url')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
};

// Main hook - fetches all homepage data in parallel with caching
export function useHomepageData() {
  const results = useQueries({
    queries: [
      {
        queryKey: ['homepage', 'latestProducts'],
        queryFn: fetchLatestProducts,
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
      {
        queryKey: ['homepage', 'mostSold'],
        queryFn: fetchMostSoldProducts,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000,
      },
      {
        queryKey: ['homepage', 'categories'],
        queryFn: fetchCategories,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
      },
      {
        queryKey: ['homepage', 'faqs'],
        queryFn: fetchFAQs,
        staleTime: 30 * 60 * 1000, // 30 minutes - FAQs rarely change
        gcTime: 60 * 60 * 1000,
      },
      {
        queryKey: ['homepage', 'featured'],
        queryFn: fetchFeaturedProducts,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
      },
      {
        queryKey: ['homepage', 'notice'],
        queryFn: fetchNotice,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
    ],
  });

  const isLoading = results.some(r => r.isLoading);

  return {
    latestProducts: results[0].data || [],
    mostSoldProducts: results[1].data || [],
    categories: results[2].data || [],
    faqs: results[3].data || [],
    featuredProducts: results[4].data || [],
    notice: results[5].data,
    isLoading,
    isLatestLoading: results[0].isLoading,
    isMostSoldLoading: results[1].isLoading,
    isCategoriesLoading: results[2].isLoading,
    isFAQsLoading: results[3].isLoading,
    isFeaturedLoading: results[4].isLoading,
    isNoticeLoading: results[5].isLoading,
  };
}
