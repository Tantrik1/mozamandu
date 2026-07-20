import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Package, Search, GripVertical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BlogProduct {
  id: string;
  blog_id: string;
  product_id: string;
  display_order: number;
  product?: {
    id: string;
    name: string;
    image_url: string | null;
    selling_price: number | null;
    status: string;
  };
}

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  selling_price: number | null;
  status: string;
}

interface BlogProductsManagerProps {
  blogId: string;
}

export function BlogProductsManager({ blogId }: BlogProductsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch linked products for this blog
  const { data: blogProducts = [], isLoading } = useQuery({
    queryKey: ['blog-products', blogId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_products')
        .select(`
          id,
          blog_id,
          product_id,
          display_order
        `)
        .eq('blog_id', blogId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      
      // Fetch product details separately
      if (data.length === 0) return [];
      
      const productIds = data.map(bp => bp.product_id);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, image_url, selling_price, status')
        .in('id', productIds);
      
      if (productsError) throw productsError;
      
      const productMap = new Map(products?.map(p => [p.id, p]));
      
      return data.map(bp => ({
        ...bp,
        product: productMap.get(bp.product_id),
      })) as BlogProduct[];
    },
    enabled: !!blogId,
  });

  // Fetch all products for selection
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products-for-blog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, selling_price, status')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
  });

  // Filter products based on search and exclude already linked
  const linkedProductIds = blogProducts.map((bp) => bp.product_id);
  const filteredProducts = allProducts.filter(
    (p) =>
      !linkedProductIds.includes(p.id) &&
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add product mutation
  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from('blog_products').insert({
        blog_id: blogId,
        product_id: productId,
        display_order: blogProducts.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-products', blogId] });
      toast({ title: 'Product linked to blog' });
    },
    onError: (error: any) => {
      toast({ title: 'Error linking product', description: error.message, variant: 'destructive' });
    },
  });

  // Remove product mutation
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-products', blogId] });
      toast({ title: 'Product removed from blog' });
    },
    onError: (error: any) => {
      toast({ title: 'Error removing product', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Loading products...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Featured Products</h3>
          <span className="text-sm text-muted-foreground">({blogProducts.length})</span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Product to Blog</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'No products found' : 'All products already linked'}
                    </p>
                  ) : (
                    filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => {
                          addMutation.mutate(product.id);
                          setIsDialogOpen(false);
                        }}
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          {product.selling_price && (
                            <p className="text-sm text-muted-foreground">
                              Rs. {product.selling_price}
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {blogProducts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No products linked yet</p>
          <p className="text-sm">Add products to feature them in this blog post</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blogProducts.map((bp) => (
            <Card key={bp.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  {bp.product?.image_url ? (
                    <img
                      src={bp.product.image_url}
                      alt={bp.product?.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{bp.product?.name || 'Unknown Product'}</p>
                    {bp.product?.selling_price && (
                      <p className="text-sm text-muted-foreground">
                        Rs. {bp.product.selling_price}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate(bp.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
