import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Grid3X3 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url?: string | null;
  subcategories: { image_url: string | null }[];
}

interface ShopByCategoryProps {
  categories: Category[];
  isLoading: boolean;
}

export const ShopByCategory = memo(function ShopByCategory({ categories, isLoading }: ShopByCategoryProps) {
  if (isLoading) {
    return (
      <section className="py-10 md:py-12 lg:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted rounded-2xl md:rounded-3xl h-40 md:h-52 lg:h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-10 md:py-12 lg:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 md:mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-3 bg-primary/10 px-4 py-1.5 rounded-full">
            <Grid3X3 className="w-4 h-4" />
            Browse Collection
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Shop by Category
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {categories.map((category, index) => {
            const categoryImage = category.image_url || category.subcategories?.[0]?.image_url;
            
            return (
              <div
                key={category.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
              >
                <Link 
                  to={`/shop?category=${category.id}`}
                  className="group relative block rounded-2xl md:rounded-3xl overflow-hidden h-40 md:h-52 lg:h-64 shadow-md hover:shadow-xl transition-all duration-500"
                >
                  {/* Background Image */}
                  {categoryImage ? (
                    <img
                      src={categoryImage}
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/90 transition-all duration-500" />
                  
                  {/* Shine Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </div>
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-end p-5 lg:p-7">
                    <h3 className="text-xl lg:text-2xl font-bold text-white mb-1 group-hover:translate-y-[-4px] transition-transform duration-300">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-white/70 line-clamp-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {category.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span className="opacity-80 group-hover:opacity-100 transition-opacity">Explore</span>
                      <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                  </div>
                  
                  {/* Corner Accent */}
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
                    <ArrowRight className="w-5 h-5 text-white" />
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
