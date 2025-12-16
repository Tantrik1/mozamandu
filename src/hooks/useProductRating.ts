import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProductRating {
  average_rating: number;
  review_count: number;
}

const fetchProductRating = async (productId: string): Promise<ProductRating> => {
  const { data, error } = await supabase
    .rpc('get_product_rating', { p_product_id: productId });
  
  if (error) {
    console.error('Error fetching product rating:', error);
    return { average_rating: 0, review_count: 0 };
  }
  
  return data?.[0] || { average_rating: 0, review_count: 0 };
};

export function useProductRating(productId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['product-rating', productId],
    queryFn: () => fetchProductRating(productId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled: !!productId,
  });

  return {
    averageRating: Number(data?.average_rating) || 0,
    reviewCount: data?.review_count || 0,
    isLoading,
  };
}
