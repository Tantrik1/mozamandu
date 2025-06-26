
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SubcategoryCard } from './SubcategoryCard';

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string;
  category: {
    name: string;
  };
}

export function BrowseSubcategories() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

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
            category:categories(name)
          `)
          .eq('is_active', true)
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
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Browse by Categories</h2>
            <p className="mt-4 text-lg text-gray-600">
              Explore our diverse range of sock categories, each crafted with precision and style
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (subcategories.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Browse by Categories</h2>
            <p className="mt-4 text-lg text-gray-600">
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
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Browse by Categories</h2>
          <p className="mt-4 text-lg text-gray-600">
            Explore our diverse range of sock categories, each crafted with precision and style
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subcategories.map((subcategory) => (
            <SubcategoryCard key={subcategory.id} subcategory={subcategory} />
          ))}
        </div>
      </div>
    </section>
  );
}
