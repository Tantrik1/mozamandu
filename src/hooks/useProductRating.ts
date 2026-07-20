import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProductRating {
  average_rating: number;
  review_count: number;
}

const fetchProductRating = async (productId: string): Promise<ProductRating> => {
  // Calculate rating from approved reviews directly
  const { data, error } = await supabase
    .from('product_reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('status', 'approved');
  
  if (error) {
    console.error('Error fetching product rating:', error);
    return { average_rating: 0, review_count: 0 };
  }
  
  if (!data || data.length === 0) {
    return { average_rating: 0, review_count: 0 };
  }
  
  const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
  return { 
    average_rating: totalRating / data.length, 
    review_count: data.length 
  };
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
