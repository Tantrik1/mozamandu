
import { useState, useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from './ProductCard';

interface Product {
  id: string;
  name: string;
  description: string;
  selling_price: number;
  is_featured: boolean;
  categories: {
    name: string;
  };
  subcategories: {
    name: string;
    selling_price: number;
  };
  product_images: {
    image_url: string;
    is_primary: boolean;
  }[];
}

export function FeaturedProductsCarousel() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          selling_price,
          is_featured,
          categories (name),
          subcategories (name, selling_price),
          product_images (image_url, is_primary)
        `)
        .eq('is_featured', true)
        .eq('status', 'active')
        .limit(8);

      if (error) throw error;
      setFeaturedProducts(data || []);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">Loading featured products...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-gray-600 text-lg">Discover our hand-picked premium collection</p>
        </div>
        
        <Carousel className="w-full">
          <CarouselContent className="-ml-2 md:-ml-4">
            {featuredProducts.map((product) => (
              <CarouselItem key={product.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <ProductCard product={product} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
}
