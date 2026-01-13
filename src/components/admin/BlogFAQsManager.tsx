import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, GripVertical, HelpCircle } from 'lucide-react';

interface BlogFAQ {
  id: string;
  blog_id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

interface BlogFAQsManagerProps {
  blogId: string;
}

export function BlogFAQsManager({ blogId }: BlogFAQsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<BlogFAQ | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    is_active: true,
    display_order: 0,
  });

  // Fetch FAQs for this blog
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['blog-faqs', blogId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_faqs')
        .select('*')
        .eq('blog_id', blogId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as BlogFAQ[];
    },
    enabled: !!blogId,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('blog_faqs')
          .update({
            question: data.question,
            answer: data.answer,
            is_active: data.is_active,
            display_order: data.display_order,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('blog_faqs')
          .insert({
            blog_id: blogId,
            question: data.question,
            answer: data.answer,
            is_active: data.is_active,
            display_order: faqs.length,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-faqs', blogId] });
      toast({ title: editingFAQ ? 'FAQ updated' : 'FAQ added' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: 'Error saving FAQ', description: error.message, variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_faqs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-faqs', blogId] });
      toast({ title: 'FAQ deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error deleting FAQ', description: error.message, variant: 'destructive' });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFAQ(null);
    setFormData({ question: '', answer: '', is_active: true, display_order: 0 });
  };

  const handleEdit = (faq: BlogFAQ) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active,
      display_order: faq.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.question || !formData.answer) {
      toast({ title: 'Please fill in question and answer', variant: 'destructive' });
      return;
    }
    saveMutation.mutate({ ...formData, id: editingFAQ?.id });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading FAQs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Blog FAQs</h3>
          <span className="text-sm text-muted-foreground">({faqs.length})</span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleCloseDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFAQ ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question *</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter the question"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="answer">Answer *</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
                  placeholder="Enter the answer"
                  rows={4}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingFAQ ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {faqs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No FAQs added yet</p>
          <p className="text-sm">Add FAQs to help readers find quick answers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <Card key={faq.id} className={!faq.is_active ? 'opacity-50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-1">{faq.question}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(faq)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(faq.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
