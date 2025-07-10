
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ShoppingCart } from 'lucide-react';
import { getRealTimeStock } from '@/utils/inventoryManager';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedProductCard } from './EnhancedProductCard';

interface ProductCardProps {
  product: any;
}

export function ProductCard({ product }: ProductCardProps) {
  const [productWithVariants, setProductWithVariants] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductDetails();
  }, [product.id]);

  const fetchProductDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          subcategories (
            name,
            selling_price,
            minimum_quantity
          ),
          color_variants (
            id,
            color_name,
            image_url,
            has_sizes,
            size_variants (
              id,
              size_name,
              size_code
            )
          )
        `)
        .eq('id', product.id)
        .single();

      if (error) throw error;
      setProductWithVariants(data);
    } catch (error) {
      console.error('Error fetching product details:', error);
      // Fallback to basic product data
      setProductWithVariants(product);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white shadow-md rounded-md overflow-hidden">
        <div className="animate-pulse">
          <div className="w-full h-48 bg-gray-200"></div>
          <CardContent className="p-4">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded mb-3 w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </CardContent>
        </div>
      </Card>
    );
  }

  if (!productWithVariants) {
    return null;
  }

  return <EnhancedProductCard product={productWithVariants} />;
}
