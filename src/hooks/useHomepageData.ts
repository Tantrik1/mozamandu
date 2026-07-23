import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getBatchProductStock, getActiveSubcategoryIds } from '@/utils/stockCalculation';

// Fetch functions - optimized with minimal data
// Helper to filter out zero-stock products
const filterInStock = async (products: any[]) => {
  if (products.length === 0) return products;
  const stockMap = await getBatchProductStock(products.map(p => p.id));
  return products.filter(p => (stockMap[p.id] || 0) > 0);
};

const fetchLatestProducts = async () => {
  const activeSubIds = await getActiveSubcategoryIds();
  if (activeSubIds.length === 0) return [];
  const { data } = await supabase
    .from('products')
    .select(
      `id, name, selling_price, cost_price, image_url, has_color_variants`
    )
    .eq('status', 'active')
    .in('subcategory_id', activeSubIds)
    .limit(8);
  return filterInStock(data || []);
};

const fetchMostSoldProducts = async () => {
  const activeSubIds = await getActiveSubcategoryIds();
  if (activeSubIds.length === 0) return [];

  const { data: orderData } = await supabase
    .from('customer_order_item_details')
    .select('product_name, quantity')
    .limit(100);

  const productCounts: Record<string, number> = {};
  orderData?.forEach(item => {
    productCounts[item.product_name] = (productCounts[item.product_name] || 0) + item.quantity;
  });

  const { data: products } = await supabase
    .from('products')
    .select(
      `id, name, selling_price, cost_price, image_url, has_color_variants`
    )
    .eq('status', 'active')
    .in('subcategory_id', activeSubIds)
    .limit(12);

  if (!products) return [];

  const sorted = products
    .map(p => ({ ...p, order_count: productCounts[p.name] || 0 }))
    .sort((a, b) => b.order_count - a.order_count)
    .slice(0, 8);
  return filterInStock(sorted);
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

const fetchFlashSaleProducts = async () => {
  const activeSubIds = await getActiveSubcategoryIds();
  if (activeSubIds.length === 0) return [];
  const { data } = await supabase
    .from('products')
    .select(
      `id, name, selling_price, cost_price, image_url, has_color_variants`
    )
    .eq('status', 'active')
    .in('subcategory_id', activeSubIds)
    .not('selling_price', 'is', null)
    .gt('selling_price', 0)
    .limit(20);
  // Show products that have a selling_price lower than subcategory max_selling_price (on sale)
  // or just all products with a selling_price set
  const inStock = await filterInStock(data || []);
  return inStock.slice(0, 8);
};

const fetchFeaturedProducts = async () => {
  const activeSubIds = await getActiveSubcategoryIds();
  if (activeSubIds.length === 0) return [];
  const { data } = await supabase
    .from('products')
    .select(
      `id, name, selling_price, cost_price, image_url, has_color_variants`
    )
    .eq('status', 'active')
    .eq('is_featured', true)
    .in('subcategory_id', activeSubIds)
    .limit(8);
  return filterInStock(data || []);
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

// Main hook - prioritized data fetching with deferred loading for below-the-fold
export function useHomepageData() {
  const results = useQueries({
    queries: [
      // Priority 1: Above-the-fold content - fetch immediately
      {
        queryKey: ['homepage', 'flashSales'],
        queryFn: fetchFlashSaleProducts,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
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
      // Priority 3: Below-the-fold content - deferred to reduce initial load
      {
        queryKey: ['homepage', 'mostSold'],
        queryFn: fetchMostSoldProducts,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        refetchOnMount: false,
      },
      {
        queryKey: ['homepage', 'faqs'],
        queryFn: fetchFAQs,
        staleTime: 30 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        refetchOnMount: false,
      },
      {
        queryKey: ['homepage', 'featured'],
        queryFn: fetchFeaturedProducts,
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        refetchOnMount: false,
      },
      // Priority 4: Deferred content - notice popup
      {
        queryKey: ['homepage', 'notice'],
        queryFn: fetchNotice,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnMount: false,
      },
    ],
  });

  return {
    flashSaleProducts: results[0].data || [],
    latestProducts: results[1].data || [],
    categories: results[2].data || [],
    mostSoldProducts: results[3].data || [],
    faqs: results[4].data || [],
    featuredProducts: results[5].data || [],
    notice: results[6].data,
    isFlashSaleLoading: results[0].isLoading,
    isLatestLoading: results[1].isLoading,
    isCategoriesLoading: results[2].isLoading,
    isMostSoldLoading: results[3].isLoading,
    isFAQsLoading: results[4].isLoading,
    isFeaturedLoading: results[5].isLoading,
    isNoticeLoading: results[6].isLoading,
  };
}
