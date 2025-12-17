import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface MoreSubcategoriesProps {
  categoryId: string;
  currentSubcategoryId: string;
}

const fetchMoreSubcategories = async (categoryId: string, currentSubcategoryId: string) => {
  const { data } = await supabase
    .from('subcategories')
    .select('id, name, image_url, min_selling_price')
    .eq('category_id', categoryId)
    .eq('status', 'on')
    .neq('id', currentSubcategoryId)
    .limit(6);
  return data || [];
};

export const MoreSubcategories = memo(function MoreSubcategories({ categoryId, currentSubcategoryId }: MoreSubcategoriesProps) {
  const { data: subcategories = [], isLoading } = useQuery({
    queryKey: ['more-subcategories', categoryId, currentSubcategoryId],
    queryFn: () => fetchMoreSubcategories(categoryId, currentSubcategoryId),
    enabled: !!categoryId && !!currentSubcategoryId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-12 lg:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (subcategories.length === 0) return null;

  return (
    <section className="py-12 lg:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">More Categories</h2>
          </div>
          <Link 
            to={`/shop?category=${categoryId}`}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {subcategories.map((subcategory, index) => (
            <Link
              key={subcategory.id}
              to={`/shop?subcategory=${subcategory.id}`}
              className="group animate-fade-in"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-500">
                {subcategory.image_url ? (
                  <img
                    src={subcategory.image_url}
                    alt={subcategory.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <Layers className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                {/* Category Name */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                  <h3 className="text-white font-semibold text-sm line-clamp-2">
                    {subcategory.name}
                  </h3>
                  <p className="text-white/70 text-xs mt-0.5">
                    From Rs. {subcategory.min_selling_price}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View Full Shop CTA */}
        <div className="text-center mt-10">
          <Button asChild size="lg" variant="outline" className="rounded-full gap-2 px-8">
            <Link to="/shop">
              Browse All Categories
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});
