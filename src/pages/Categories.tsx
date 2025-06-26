
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { SubcategoryCard } from '@/components/customer/SubcategoryCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Footer } from '@/components/layout/Footer';

interface Subcategory {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  selling_price: number;
  minimum_quantity: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  subcategories: Subcategory[];
}

export default function Categories() {
  const { categoryId } = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      fetchCategoryWithSubcategories();
    } else {
      fetchAllSubcategories();
    }
  }, [categoryId]);

  const fetchCategoryWithSubcategories = async () => {
    try {
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          description,
          subcategories (
            id,
            name,
            description,
            image_url,
            selling_price,
            minimum_quantity
          )
        `)
        .eq('id', categoryId)
        .eq('status', 'on')
        .single();

      if (categoryError) throw categoryError;

      setCategory(categoryData);
      setSubcategories(categoryData.subcategories || []);
    } catch (error) {
      console.error('Error fetching category:', error);
      toast({
        title: "Error",
        description: "Failed to fetch category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, description, image_url, selling_price, minimum_quantity')
        .eq('status', 'on')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch subcategories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {category ? category.name : 'All Categories'}
          </h1>
          <p className="text-gray-600 mt-2">
            {category ? category.description : 'Explore our product categories'}
          </p>
        </div>

        {subcategories.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories available</h3>
            <p className="text-gray-500">Check back later for new categories!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {subcategories.map((subcategory) => (
              <SubcategoryCard key={subcategory.id} subcategory={subcategory} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
