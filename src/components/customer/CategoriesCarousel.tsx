import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface Category {
  id: string;
  name: string;
  description: string | null;
  subcategories: {
    id: string;
    name: string;
    image_url: string | null;
    selling_price: number;
  }[];
}

export function CategoriesCarousel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          description,
          subcategories!inner(
            id,
            name,
            image_url,
            selling_price
          )
        `)
        .eq('status', 'on')
        .eq('subcategories.status', 'on')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/categories/${categoryId}`);
  };

  if (loading) {
    return (
      <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Explore Categories</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full mx-auto mt-4"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-48 rounded-lg mb-4"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Explore Categories
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full mx-auto mb-4"></div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our carefully curated categories, each offering unique styles and quality
          </p>
        </div>
        
        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {categories.map((category) => (
                <CarouselItem 
                  key={category.id} 
                  className={`pl-2 md:pl-4 ${
                    isMobile 
                      ? 'basis-full' 
                      : 'basis-1/2 lg:basis-1/3'
                  }`}
                >
                  <Card 
                    className="h-full cursor-pointer group hover:shadow-lg transition-all duration-300 bg-card border-border"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <CardContent className="p-0">
                      {/* Category Header */}
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        {category.subcategories[0]?.image_url ? (
                          <img
                            src={category.subcategories[0].image_url}
                            alt={category.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                            <span className="text-4xl font-bold text-primary/60">
                              {category.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-xl font-bold text-white mb-1">
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-white/90 text-sm line-clamp-2">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Category Info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {category.subcategories.length} subcategories
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            From Rs. {Math.min(...category.subcategories.map(s => s.selling_price))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            <div className="hidden md:block">
              <CarouselPrevious className="absolute -left-4 lg:-left-12 top-1/2 -translate-y-1/2 bg-background shadow-lg hover:bg-accent border-border" />
              <CarouselNext className="absolute -right-4 lg:-right-12 top-1/2 -translate-y-1/2 bg-background shadow-lg hover:bg-accent border-border" />
            </div>
          </Carousel>
          
          <div className="md:hidden text-center mt-4">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span>👆 Swipe to explore categories</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}