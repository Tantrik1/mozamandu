
import { useEffect, useState } from 'react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Footer } from '@/components/layout/Footer';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  subcategories: Array<{
    id: string;
    name: string;
    selling_price: number;
    image_url?: string;
  }>;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        subcategories (id, name, selling_price, image_url)
      `)
      .eq('status', 'on')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading categories...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <CustomerHeader />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Categories</h1>
          <p className="text-gray-600 mt-2">Browse our product categories and subcategories</p>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories available</h3>
            <p className="text-gray-500">Categories will appear here once they are added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                  {category.description && (
                    <p className="text-gray-600">{category.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {category.subcategories && category.subcategories.length > 0 ? (
                    <div>
                      <h4 className="font-semibold mb-3">Subcategories:</h4>
                      <div className="space-y-3">
                        {category.subcategories.map((subcategory) => (
                          <Link 
                            key={subcategory.id} 
                            to={`/subcategories/${subcategory.id}`}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              {subcategory.image_url ? (
                                <img 
                                  src={subcategory.image_url} 
                                  alt={subcategory.name}
                                  className="w-10 h-10 object-cover rounded-lg"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      const placeholder = document.createElement('div');
                                      placeholder.className = 'w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center';
                                      placeholder.innerHTML = '<svg class="w-5 h-5 text-red-300" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-2.18l-1.41-1.41C16.05 4.23 15.55 4 15 4H9c-.55 0-1.05.23-1.41.59L6.18 6H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>';
                                      parent.appendChild(placeholder);
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                  <Package className="w-5 h-5 text-red-300" />
                                </div>
                              )}
                              <span className="text-sm font-medium">{subcategory.name}</span>
                            </div>
                            <Badge variant="outline">Rs. {subcategory.selling_price}</Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No subcategories available</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
