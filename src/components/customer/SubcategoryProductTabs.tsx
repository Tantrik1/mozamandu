
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  selling_price: number;
  subcategories: {
    name: string;
    selling_price: number;
  };
}

interface Subcategory {
  id: string;
  name: string;
  products: Product[];
}

export function SubcategoryProductTabs() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubcategoriesWithProducts();
  }, []);

  const fetchSubcategoriesWithProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select(`
          id,
          name,
          products!inner (
            id,
            name,
            description,
            selling_price,
            subcategories (name, selling_price)
          )
        `)
        .eq('status', 'on')
        .eq('products.status', 'active')
        .limit(4);

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories with products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductPrice = (product: Product) => {
    return product.selling_price || product.subcategories?.selling_price || 0;
  };

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
        
        <Tabs defaultValue={subcategories[0]?.id} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
            {subcategories.map((subcategory) => (
              <TabsTrigger key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {subcategories.map((subcategory) => (
            <TabsContent key={subcategory.id} value={subcategory.id}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {subcategory.products?.slice(0, 8).map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4 text-sm">{product.description}</p>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xl font-bold text-red-600">
                          Rs. {getProductPrice(product).toFixed(2)}
                        </span>
                        <Badge variant="outline">{subcategory.name}</Badge>
                      </div>
                      <Button className="w-full bg-red-600 hover:bg-red-700">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
