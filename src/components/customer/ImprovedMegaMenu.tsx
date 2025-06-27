
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name: string;
  description: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
  image_url: string;
  selling_price: number;
  minimum_quantity: number;
}

export function ImprovedMegaMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
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
        .eq('status', 'on');

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition-colors"
      >
        Categories
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 w-screen bg-white shadow-2xl border-t-2 border-red-500 z-50"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="max-w-7xl mx-auto p-8">
            {categories.map((category) => (
              <div key={category.id} className="mb-8">
                <div className="flex items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mr-4">{category.name}</h3>
                  <div className="h-px bg-gray-300 flex-1"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {category.subcategories?.map((subcategory) => (
                    <Link
                      key={subcategory.id}
                      to={`/subcategory/${subcategory.id}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-red-200">
                        <CardContent className="p-0">
                          <div className="relative overflow-hidden rounded-t-lg">
                            <img
                              src={subcategory.image_url || '/placeholder.svg'}
                              alt={subcategory.name}
                              className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-red-500 hover:bg-red-600">
                                Rs. {subcategory.selling_price}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-800 mb-2 group-hover:text-red-600 transition-colors">
                              {subcategory.name}
                            </h4>
                            {subcategory.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {subcategory.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Min Qty: {subcategory.minimum_quantity}</span>
                              <span className="text-red-600 font-medium">View Products →</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
