import { useState, memo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StarRating } from '@/components/product/StarRating';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Search,
  Check,
  X,
  Eye,
  Trash2,
  Loader2,
  MessageSquare,
  Star
} from 'lucide-react';

interface Review {
  id: string;
  product_id: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  review_text: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  product?: {
    name: string;
  };
}

const fetchAllReviews = async (): Promise<Review[]> => {
  const { data, error } = await supabase
    .from('product_reviews')
    .select(`
      id,
      product_id,
      reviewer_name,
      reviewer_email,
      rating,
      review_text,
      status,
      admin_notes,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch product names separately
  const productIds = [...new Set(data?.map(r => r.product_id) || [])];
  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .in('id', productIds);

  const productMap = new Map(products?.map(p => [p.id, p.name]) || []);

  return (data || []).map(review => ({
    ...review,
    product: { name: productMap.get(review.product_id) || 'Unknown Product' }
  }));
};

export const ReviewManagement = memo(function ReviewManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: fetchAllReviews,
    staleTime: 1 * 60 * 1000,
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (notes !== undefined) updateData.admin_notes = notes;
      
      const { error } = await supabase
        .from('product_reviews')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-rating'] });
      toast({ title: 'Review updated successfully' });
      setIsViewDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to update review', variant: 'destructive' });
    }
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast({ title: 'Review deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete review', variant: 'destructive' });
    }
  });

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.reviewer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.review_text?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setAdminNotes(review.admin_notes || '');
    setIsViewDialogOpen(true);
  };

  const handleApprove = (review: Review) => {
    updateReviewMutation.mutate({ id: review.id, status: 'approved' });
  };

  const handleReject = (review: Review) => {
    updateReviewMutation.mutate({ id: review.id, status: 'rejected' });
  };

  const handleSaveNotes = () => {
    if (selectedReview) {
      updateReviewMutation.mutate({
        id: selectedReview.id,
        status: selectedReview.status,
        notes: adminNotes
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">Pending</Badge>;
    }
  };

  const pendingCount = reviews.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Review Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage and approve customer product reviews
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-primary text-primary-foreground px-3 py-1.5 text-sm">
            {pendingCount} Pending Review{pendingCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by reviewer, product, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-foreground">{reviews.length}</div>
          <div className="text-sm text-muted-foreground">Total Reviews</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-amber-500">{reviews.filter(r => r.status === 'pending').length}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-emerald-500">{reviews.filter(r => r.status === 'approved').length}</div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-red-500">{reviews.filter(r => r.status === 'rejected').length}</div>
          <div className="text-sm text-muted-foreground">Rejected</div>
        </div>
      </div>

      {/* Reviews Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No reviews found</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Product</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review) => (
                <TableRow key={review.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium max-w-[150px] truncate">
                    {review.product?.name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{review.reviewer_name}</p>
                      <p className="text-xs text-muted-foreground">{review.reviewer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StarRating rating={review.rating} size="sm" />
                  </TableCell>
                  <TableCell>{getStatusBadge(review.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(review.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewReview(review)}
                        className="h-8 w-8"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {review.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(review)}
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReject(review)}
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteReviewMutation.mutate(review.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Review Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{selectedReview.reviewer_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedReview.reviewer_email}</p>
                </div>
                {getStatusBadge(selectedReview.status)}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Product</p>
                <p className="font-medium">{selectedReview.product?.name}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Rating</p>
                <StarRating rating={selectedReview.rating} size="md" showValue />
              </div>

              {selectedReview.review_text && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Review</p>
                  <p className="text-foreground bg-muted/50 rounded-lg p-3">
                    {selectedReview.review_text}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add private notes about this review..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedReview?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    updateReviewMutation.mutate({
                      id: selectedReview.id,
                      status: 'rejected',
                      notes: adminNotes
                    });
                  }}
                  className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    updateReviewMutation.mutate({
                      id: selectedReview.id,
                      status: 'approved',
                      notes: adminNotes
                    });
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            {selectedReview?.status !== 'pending' && (
              <Button onClick={handleSaveNotes}>
                Save Notes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
