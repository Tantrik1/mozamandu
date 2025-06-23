
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  description: string;
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
  selling_price: number;
  minimum_quantity: number;
  status: string;
}

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      fetchCategoryData();
    }
  }, [categoryId]);

  const fetchCategoryData = async () => {
    try {
      // Fetch category details
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('id, name, description')
        .eq('id', categoryId)
        .eq('status', 'on')
        .single();

      if (categoryError) {
        console.error('Error fetching category:', categoryError);
        toast({
          title: "Error",
          description: "Category not found",
          variant: "destructive",
        });
        return;
      }

      setCategory(categoryData);

      // Fetch subcategories
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('id, name, description, selling_price, minimum_quantity, status')
        .eq('category_id', categoryId)
        .eq('status', 'on')
        .order('name');

      if (subcategoriesError) {
        console.error('Error fetching subcategories:', subcategoriesError);
        toast({
          title: "Error",
          description: "Failed to fetch subcategories",
          variant: "destructive",
        });
      } else {
        setSubcategories(subcategoriesData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong",
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
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Category not found</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerHeader />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Category Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{category.name}</h1>
          {category.description && (
            <p className="text-gray-600 mt-2 text-lg">{category.description}</p>
          )}
        </div>

        {/* Subcategories Grid */}
        {subcategories.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subcategories available</h3>
            <p className="text-gray-500">Subcategories will appear here once they are added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {subcategories.map((subcategory) => (
              <Link key={subcategory.id} to={`/subcategories/${subcategory.id}`}>
                <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer h-full">
                  <CardHeader className="text-center">
                    <div className="w-full h-48 bg-gradient-to-br from-red-500 to-red-700 rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-6xl">🧦</span>
                    </div>
                    <CardTitle className="text-xl text-gray-900">{subcategory.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    {subcategory.description && (
                      <p className="text-gray-600 mb-4 text-sm">{subcategory.description}</p>
                    )}
                    <div className="space-y-2">
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-lg font-semibold">
                        ${subcategory.selling_price}
                      </Badge>
                      {subcategory.minimum_quantity > 1 && (
                        <Badge variant="outline" className="block text-xs text-blue-600 border-blue-300">
                          Min. {subcategory.minimum_quantity} items required
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
