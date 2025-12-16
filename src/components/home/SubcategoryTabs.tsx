import { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Subcategory {
  id: string;
  name: string;
  image_url: string | null;
  category_id: string;
}

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  selling_price: number | null;
  cost_price: number;
}

export const SubcategoryTabs = memo(function SubcategoryTabs() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);

  // Fetch subcategories on mount
  useEffect(() => {
    const fetchSubcategories = async () => {
      const { data } = await supabase
        .from('subcategories')
        .select('id, name, image_url, category_id')
        .eq('status', 'on')
        .limit(6);
      
      if (data && data.length > 0) {
        setSubcategories(data);
        setActiveTab(data[0].id);
      }
      setIsLoading(false);
    };
    fetchSubcategories();
  }, []);

  // Fetch products when active tab changes
  useEffect(() => {
    if (!activeTab) return;
    
    const fetchProducts = async () => {
      setProductsLoading(true);
      const { data } = await supabase
        .from('products')
        .select('id, name, image_url, selling_price, cost_price')
        .eq('subcategory_id', activeTab)
        .eq('status', 'active')
        .limit(4);
      
      setProducts(data || []);
      setProductsLoading(false);
    };
    fetchProducts();
  }, [activeTab]);

  if (isLoading) {
    return (
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 w-24 bg-muted rounded-full animate-pulse flex-shrink-0" />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (subcategories.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-3 bg-primary/10 px-4 py-1.5 rounded-full">
            <Layers className="w-4 h-4" />
            Explore Collections
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Browse by Style
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide justify-start lg:justify-center">
          {subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveTab(sub.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                activeTab === sub.id
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-10">
          {productsLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />
            ))
          ) : products.length > 0 ? (
            products.map((product, index) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-xl transition-all duration-500">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">No Image</span>
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Product Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-white/80 text-sm font-medium">
                      Rs. {(product.selling_price || product.cost_price).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No products available in this category
            </div>
          )}
        </div>

        {/* View Full Shop CTA */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
          <Button asChild size="lg" className="rounded-full gap-2 px-8 shadow-lg hover:shadow-xl transition-all">
            <Link to="/shop">
              View Full Shop
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
