import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Grid3X3 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  subcategories: { image_url: string | null }[];
}

interface ShopByCategoryProps {
  categories: Category[];
  isLoading: boolean;
}

export const ShopByCategory = memo(function ShopByCategory({ categories, isLoading }: ShopByCategoryProps) {
  if (isLoading) {
    return (
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <Grid3X3 className="w-4 h-4" />
            Browse Collection
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
            Shop by Category
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {categories.map((category, index) => {
            const categoryImage = category.subcategories?.[0]?.image_url;
            
            return (
              <div
                key={category.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link 
                  to={`/shop?category=${category.id}`}
                  className="group relative block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 h-48 lg:h-64"
                >
                  {categoryImage && (
                    <img
                      src={categoryImage}
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
                  <div className="relative h-full flex flex-col justify-end p-5 lg:p-6">
                    <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {category.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Shop Now
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
