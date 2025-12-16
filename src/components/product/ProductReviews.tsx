import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from './StarRating';
import { ReviewForm } from './ReviewForm';
import { MessageSquare, User } from 'lucide-react';
import { format } from 'date-fns';

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

interface ProductReviewsProps {
  productId: string;
}

const fetchApprovedReviews = async (productId: string): Promise<Review[]> => {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, reviewer_name, rating, review_text, created_at')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
};

const fetchProductRating = async (productId: string) => {
  const { data, error } = await supabase
    .rpc('get_product_rating', { p_product_id: productId });
  
  if (error) throw error;
  return data?.[0] || { average_rating: 0, review_count: 0 };
};

export const ProductReviews = memo(function ProductReviews({ productId }: ProductReviewsProps) {
  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => fetchApprovedReviews(productId),
    staleTime: 2 * 60 * 1000,
  });

  const { data: ratingData, refetch: refetchRating } = useQuery({
    queryKey: ['product-rating', productId],
    queryFn: () => fetchProductRating(productId),
    staleTime: 2 * 60 * 1000,
  });

  const handleReviewSubmitted = () => {
    // Refetch after a short delay to allow for any background processing
    setTimeout(() => {
      refetchReviews();
      refetchRating();
    }, 1000);
  };

  const averageRating = Number(ratingData?.average_rating) || 0;
  const reviewCount = ratingData?.review_count || 0;

  return (
    <section className="py-8 md:py-12">
      <div className="space-y-8">
        {/* Header with overall rating */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              Customer Reviews
            </h2>
            {reviewCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={averageRating} size="md" showValue />
                <span className="text-muted-foreground text-sm">
                  Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Review Form */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Write a Review</h3>
          <ReviewForm productId={productId} onReviewSubmitted={handleReviewSubmitted} />
        </div>

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{review.reviewer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                {review.review_text && (
                  <p className="mt-3 text-muted-foreground leading-relaxed">
                    {review.review_text}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/30 rounded-2xl">
            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
          </div>
        )}
      </div>
    </section>
  );
});
