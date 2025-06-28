
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
      <section className="py-8 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Browse by Categories</h2>
            <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-600">
              Explore our diverse range of sock categories, each crafted with precision and style
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-32 sm:h-64 rounded-lg mb-4"></div>
                <div className="h-4 sm:h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (subcategories.length === 0) {
    return (
      <section className="py-8 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Browse by Categories</h2>
            <p className="mt-2 sm:mt-4 text-base sm:text-lg text-gray-600">
              Explore our diverse range of sock categories, each crafted with precision and style
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500">No categories available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
            Browse by Categories
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full mx-auto mb-4"></div>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Swipe through our diverse range of sock categories, each crafted with precision and style
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
            <CarouselContent className="-ml-1 md:-ml-4">
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
            
            {/* Navigation Arrows - Hidden on mobile for better touch experience */}
            <div className="hidden md:block">
              <CarouselPrevious className="absolute -left-4 lg:-left-12 top-1/2 -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 border-2 border-gray-200" />
              <CarouselNext className="absolute -right-4 lg:-right-12 top-1/2 -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 border-2 border-gray-200" />
            </div>
          </Carousel>
          
          {/* Touch indicator for mobile */}
          <div className="md:hidden text-center mt-4">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
              <span>👆 Swipe to explore categories</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
