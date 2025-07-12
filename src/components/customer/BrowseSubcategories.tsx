
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SubcategoryCard } from './SubcategoryCard';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string;
  selling_price: number;
  minimum_quantity: number;
  category: {
    name: string;
  };
}

export function BrowseSubcategories() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    let isMounted = true;

    const fetchSubcategories = async () => {
      try {
        console.log('🔄 BrowseSubcategories: Starting data fetch');

        const { data, error } = await supabase
          .from('subcategories')
          .select(`
            id,
            name,
            description,
            image_url,
            category_id,
            selling_price,
            minimum_quantity,
            category:categories(name)
          `)
          .eq('status', 'on')
          .order('name');

        if (!isMounted) return;

        if (error) {
          console.error('❌ BrowseSubcategories: Fetch error:', error);
          setSubcategories([]);
        } else {
          console.log('✅ BrowseSubcategories: Subcategories loaded:', data?.length || 0);
          setSubcategories(data || []);
        }

      } catch (error) {
        console.error('❌ BrowseSubcategories: Unexpected error:', error);
        if (isMounted) {
          setSubcategories([]);
        }
      } finally {
        if (isMounted) {
          console.log('✅ BrowseSubcategories: Data fetch complete');
          setLoading(false);
        }
      }
    };

    fetchSubcategories();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Explore Subcategories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover our diverse range of subcategories, each carefully curated to meet your specific needs.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-64 rounded-lg mb-4"></div>
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (subcategories.length === 0) {
    return (
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Explore Subcategories</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover our diverse range of subcategories, each carefully curated to meet your specific needs.
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No subcategories available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Explore Subcategories
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our diverse range of subcategories, each carefully curated to meet your specific needs.
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
              {subcategories.map((subcategory) => (
                <CarouselItem 
                  key={subcategory.id} 
                  className={`pl-2 md:pl-4 ${
                    isMobile 
                      ? 'basis-full' 
                      : 'basis-1/2 md:basis-1/3 lg:basis-1/4'
                  }`}
                >
                  <div className="h-full">
                    <SubcategoryCard subcategory={subcategory} />
                  </div>
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
              <span>👆 Swipe to explore subcategories</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
