import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Percent, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  cost_price: number;
  image_url: string | null;
  subcategory: {
    name: string;
  } | null;
}

export function FeaturedDeals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeaturedProducts() {
      const { data } = await supabase
        .from('products')
        .select(`
          id,
          name,
          selling_price,
          cost_price,
          image_url,
          subcategory:subcategories(name)
        `)
        .eq('status', 'active')
        .eq('is_featured', true)
        .limit(4);

      if (data) {
        setProducts(data as Product[]);
      }
      setLoading(false);
    }

    fetchFeaturedProducts();
  }, []);

  if (loading) {
    return (
      <section className="py-16 lg:py-24 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted rounded-2xl aspect-square animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-2">
              <Tag className="w-4 h-4" />
              Limited Time
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Featured Deals
            </h2>
            <p className="text-muted-foreground mt-2">
              Don't miss out on these amazing offers
            </p>
          </div>
          <Button asChild className="rounded-full group self-start sm:self-auto">
            <Link to="/shop" className="flex items-center gap-2">
              Shop All Deals
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map((product, index) => {
            const discount = product.cost_price && product.selling_price 
              ? Math.round(((product.cost_price - product.selling_price) / product.cost_price) * 100)
              : 0;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link 
                  to={`/product/${product.id}`}
                  className="group block bg-card rounded-2xl overflow-hidden border-2 border-primary/20 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <img
                      src={product.image_url || '/placeholder.svg'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      width={512}
                      height={512}
                    />
                    {discount > 0 && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
                          <Percent className="w-3 h-3" />
                          {discount}% OFF
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      {product.subcategory?.name || 'Uncategorized'}
                    </p>
                    <h3 className="font-semibold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-primary">
                        Rs. {product.selling_price?.toLocaleString() || '0'}
                      </p>
                      {discount > 0 && (
                        <p className="text-sm text-muted-foreground line-through">
                          Rs. {product.cost_price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
