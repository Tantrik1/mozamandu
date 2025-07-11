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
      const {
        data,
        error
      } = await supabase.from('subcategories').select(`
          id,
          name,
          products!inner (
            id,
            name,
            description,
            selling_price,
            subcategories (name, selling_price)
          )
        `).eq('status', 'on').eq('products.status', 'active').limit(4);
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
  return;
}