import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch functions - optimized with minimal data
const fetchLatestProducts = async () => {
  const { data } = await supabase
    .from('products')
    .select(
      `id, name, selling_price, cost_price, image_url, has_color_variants, subcategory:subcategories(name, min_selling_price)`
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(4); // Reduced from 8 for faster initial load
  return data || [];
};

const fetchMostSoldProducts = async () => {
  const { data: orderData } = await supabase
    .from('customer_order_item_details')
    .select('product_name, quantity')
    .limit(100); // Limit order data for faster query

  const productCounts: Record<string, number> = {};
  orderData?.forEach(item => {
    productCounts[item.product_name] = (productCounts[item.product_name] || 0) + item.quantity;
  });

  const { data: products } = await supabase
    .from('products')
    .select(
      `id, name, selling_price, cost_price, image_url, has_color_variants, subcategory:subcategories(name, min_selling_price)`
    )
    .eq('status', 'active')
    .limit(12);

  if (!products) return [];

  return products
    .map(p => ({ ...p, order_count: productCounts[p.name] || 0 }))
    .sort((a, b) => b.order_count - a.order_count)
    .slice(0, 4); // Reduced from 8
};

const fetchCategories = async () => {
  const { data } = await supabase
    .from('categories')
    .select(`id, name, description, image_url, subcategories(image_url, min_selling_price)`)
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
    .select(
      `id, name, selling_price, cost_price, image_url, has_color_variants, subcategory:subcategories(name, min_selling_price)`
    )
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

// Main hook - prioritized data fetching
export function useHomepageData() {
  const results = useQueries({
    queries: [
      // Priority 1: Above-the-fold content
      {
        queryKey: ['homepage', 'latestProducts'],
        queryFn: fetchLatestProducts,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
      // Priority 2: Second section
      {
        queryKey: ['homepage', 'categories'],
        queryFn: fetchCategories,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
      },
      // Priority 3: Below-the-fold content
      {
        queryKey: ['homepage', 'mostSold'],
        queryFn: fetchMostSoldProducts,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
      },
      {
        queryKey: ['homepage', 'faqs'],
        queryFn: fetchFAQs,
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
      },
      {
        queryKey: ['homepage', 'featured'],
        queryFn: fetchFeaturedProducts,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
      },
      // Priority 4: Deferred content
      {
        queryKey: ['homepage', 'notice'],
        queryFn: fetchNotice,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
    ],
  });

  return {
    latestProducts: results[0].data || [],
    categories: results[1].data || [],
    mostSoldProducts: results[2].data || [],
    faqs: results[3].data || [],
    featuredProducts: results[4].data || [],
    notice: results[5].data,
    isLatestLoading: results[0].isLoading,
    isCategoriesLoading: results[1].isLoading,
    isMostSoldLoading: results[2].isLoading,
    isFAQsLoading: results[3].isLoading,
    isFeaturedLoading: results[4].isLoading,
    isNoticeLoading: results[5].isLoading,
  };
}
