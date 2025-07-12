
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ModernProductCard } from './ModernProductCard';
import { ProductGrid } from './ProductGrid';
import { getProductStockSummary } from '@/utils/stockCalculation';

interface Product {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number | null;
  image_url: string | null;
  is_featured: boolean;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  subcategory_id: string;
  stock_quantity: number;
  subcategories: {
    name: string;
    selling_price: number;
  } | null;
}

export function LatestProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestProducts();
  }, []);

  const fetchLatestProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          subcategories(name, selling_price)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      if (data) {
        // Calculate stock for each product using the inventory system
        const productsWithStock = await Promise.all(
          data.map(async (product) => {
            try {
              const stock = await getProductStockSummary(product.id);
              return {
                ...product,
                selling_price: product.selling_price,
                cost_price: product.cost_price,
                is_featured: product.is_featured,
                has_color_variants: product.has_color_variants,
                color_has_size_variants: product.color_has_size_variants,
                stock_quantity: stock,
                subcategories: product.subcategories,
              };
            } catch (error) {
              console.error('Error calculating stock for product:', product.id, error);
              return {
                ...product,
                stock_quantity: 0,
              };
            }
          })
        );
        setProducts(productsWithStock);
      }
    } catch (error) {
      console.error('Error fetching latest products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-4">Latest Products</h2>
        <div className="flex justify-center items-center">
          <div className="text-lg">Loading latest products...</div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-4">Latest Products</h2>
        <p className="text-muted-foreground">No products available at the moment.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-4">Latest Products</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover our newest arrivals, featuring the latest additions to our carefully curated collection.
        </p>
      </div>
      
      <ProductGrid>
        {products.map((product) => (
          <ModernProductCard
            key={product.id}
            product={product}
            subcategorySellingPrice={product.subcategories?.selling_price || 0}
          />
        ))}
      </ProductGrid>
    </div>
  );
}
