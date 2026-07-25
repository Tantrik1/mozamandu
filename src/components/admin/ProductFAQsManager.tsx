import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, GripVertical, HelpCircle, ChevronDown } from 'lucide-react';

interface ProductFAQ {
  id: string;
  product_id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

interface ProductFAQsManagerProps {
  productId: string;
}

export function ProductFAQsManager({ productId }: ProductFAQsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<ProductFAQ | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    is_active: true,
    display_order: 0,
  });

  // Fetch FAQs for this product
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['product-faqs', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_faqs' as any)
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data as unknown) as ProductFAQ[];
    },
    enabled: !!productId,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('product_faqs' as any)
          .update({
            question: data.question,
            answer: data.answer,
            is_active: data.is_active,
            display_order: data.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_faqs' as any)
          .insert({
            product_id: productId,
            question: data.question,
            answer: data.answer,
            is_active: data.is_active,
            display_order: faqs.length,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-faqs', productId] });
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
      const { error } = await supabase.from('product_faqs' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-faqs', productId] });
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

  const handleEdit = (faq: ProductFAQ) => {
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
    return null;
  }

  return (
    <Card className="shadow-sm border-border/80 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base font-semibold">Product FAQs</CardTitle>
                <Badge variant="secondary" className="text-xs">{faqs.length}</Badge>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 p-6 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Add product Q&A for Google FAQ Schema & rich snippets.
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => handleCloseDialog()} className="h-8 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5 mr-1" />
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
                        placeholder="e.g. Are these socks 100% pure cotton?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="answer">Answer *</Label>
                      <Textarea
                        id="answer"
                        value={formData.answer}
                        onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
                        placeholder="e.g. Yes, crafted from combed organic cotton blend..."
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_active">Active Status</Label>
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
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
              <div className="text-center py-8 text-muted-foreground border rounded-xl border-dashed bg-muted/20">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-40 text-primary" />
                <p className="text-sm font-semibold text-foreground">No Product FAQs Added</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Add FAQ" to add customer Q&A</p>
              </div>
            ) : (
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <div 
                    key={faq.id} 
                    className={`p-4 border rounded-xl transition-colors ${!faq.is_active ? 'opacity-60 bg-muted/40' : 'bg-background hover:border-primary/40'}`}
                  >
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground/60 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-clamp-1">{faq.question}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{faq.answer}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(faq)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(faq.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
