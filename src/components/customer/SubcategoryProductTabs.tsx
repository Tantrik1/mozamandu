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
      // Skip this component for better homepage performance
      setSubcategories([]);
    } catch (error) {
      console.error('Error fetching subcategories with products:', error);
    } finally {
      setLoading(false);
    }
  };
  const getProductPrice = (product: Product) => {
    return product.selling_price || product.subcategories?.selling_price || 0;
  };
  if (loading || subcategories.length === 0) {
    return null; // Don't render if no data
  }
}