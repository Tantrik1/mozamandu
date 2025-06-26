
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    console.log('🔄 BrowseSubcategories: Starting data fetch');

    // Set timeout fallback
    loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ BrowseSubcategories: Loading timeout after 10 seconds');
        setError('Loading took too long. Please refresh the page.');
        setLoading(false);
      }
    }, 10000);
    
    const fetchSubcategories = async () => {
      try {
        console.log('🔄 BrowseSubcategories: Fetching subcategories...');
        const { data, error } = await supabase
          .from('subcategories')
          .select('id, name, description, image_url, selling_price, minimum_quantity')
          .eq('status', 'on')
          .limit(6);

        if (error) {
          console.error('❌ BrowseSubcategories: Error fetching subcategories:', error);
          // Check for RLS issues
          if (error.code === 'PGRST116' || error.message.includes('row-level security')) {
            console.warn('⚠️ BrowseSubcategories: RLS may be blocking access');
          }
          throw error;
        }
        
        if (!isMounted) return;

        console.log('✅ BrowseSubcategories: Subcategories fetched:', data?.length || 0);
        setSubcategories(data || []);
        setError(null);
      } catch (error) {
        console.error('❌ BrowseSubcategories: Exception during fetch:', error);
        if (isMounted) {
          setError('Failed to load subcategories. Please try again.');
        }
      } finally {
        if (isMounted) {
          console.log('✅ BrowseSubcategories: Setting loading to false');
          setLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    };

    fetchSubcategories();

    return () => {
      console.log('🧹 BrowseSubcategories: Cleanup');
      isMounted = false;
      clearTimeout(loadingTimeout);
    };
  }, []);

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

  if (error) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Browse by Categories</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
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
