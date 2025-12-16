import { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Send, Loader2 } from 'lucide-react';
import { z } from 'zod';

const reviewSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  rating: z.number().min(1, 'Please select a rating').max(5),
  review: z.string().trim().max(1000, 'Review must be less than 1000 characters').optional()
});

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted?: () => void;
}

export const ReviewForm = memo(function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
  const { user, userProfile } = useAuth();
  const [rating, setRating] = useState(0);
  const [name, setName] = useState(userProfile?.full_name || '');
  const [email, setEmail] = useState(userProfile?.email || user?.email || '');
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const result = reviewSchema.safeParse({
      name,
      email,
      rating,
      review: reviewText
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: 'Validation Error',
        description: firstError.message,
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          user_id: user?.id || null,
          reviewer_name: name.trim(),
          reviewer_email: email.trim(),
          rating,
          review_text: reviewText.trim() || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Review Submitted!',
        description: 'Your review has been submitted and is pending approval.',
      });

      // Reset form
      setRating(0);
      setReviewText('');
      if (!user) {
        setName('');
        setEmail('');
      }
      
      onReviewSubmitted?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-foreground font-medium">Your Rating *</Label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onRatingChange={setRating}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="review-name" className="text-foreground font-medium">Name *</Label>
          <Input
            id="review-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            required
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review-email" className="text-foreground font-medium">Email *</Label>
          <Input
            id="review-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            maxLength={255}
            required
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-text" className="text-foreground font-medium">Your Review (Optional)</Label>
        <Textarea
          id="review-text"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience with this product..."
          maxLength={1000}
          rows={4}
          className="bg-background resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{reviewText.length}/1000</p>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Submit Review
          </>
        )}
      </Button>
    </form>
  );
});
