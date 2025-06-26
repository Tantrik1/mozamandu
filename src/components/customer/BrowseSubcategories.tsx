
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SubcategoryCard } from './SubcategoryCard';
import { Skeleton } from '@/components/ui/skeleton';

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  selling_price: number;
  minimum_quantity: number;
}

export function BrowseSubcategories() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, description, image_url, selling_price, minimum_quantity')
        .eq('status', 'on')
        .limit(6);

      if (error) {
        console.error('Error fetching subcategories:', error);
        throw error;
      }
      
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Browse by Categories</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Explore our diverse range of sock categories, each crafted with precision and style
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Browse by Categories</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Explore our diverse range of sock categories, each crafted with precision and style
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {subcategories.map((subcategory) => (
            <SubcategoryCard key={subcategory.id} subcategory={subcategory} />
          ))}
        </div>
      </div>
    </section>
  );
}
