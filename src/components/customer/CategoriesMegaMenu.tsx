
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

interface Category {
  id: string;
  name: string;
  subcategories: Array<{
    id: string;
    name: string;
    image_url?: string;
  }>;
}

export function CategoriesMegaMenu() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('navbar_items')
      .select(`
        category:categories!inner(
          id,
          name,
          subcategories(id, name, image_url)
        )
      `)
      .eq('item_type', 'category')
      .eq('is_visible', true)
      .order('display_order');

    if (data) {
      const categoriesData = data
        .filter(item => item.category)
        .map(item => item.category)
        .filter(Boolean) as Category[];
      setCategories(categoriesData);
    }
  };

  if (categories.length === 0) return null;

  if (categories.length === 1) {
    const category = categories[0];
    return (
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="text-gray-700 hover:text-red-600 font-medium transition-colors">
              {category.name}
              <ChevronDown className="ml-1 h-4 w-4" />
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="w-screen bg-white border-t">
                <div className="max-w-7xl mx-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {category.subcategories?.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        to={`/subcategories/${subcategory.id}`}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {subcategory.image_url ? (
                          <img 
                            src={subcategory.image_url} 
                            alt={subcategory.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-red-300" />
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{subcategory.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="text-gray-700 hover:text-red-600 font-medium transition-colors">
            Categories
            <ChevronDown className="ml-1 h-4 w-4" />
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-screen bg-white border-t">
              <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {categories.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <h3 className="font-bold text-lg text-gray-900 border-b pb-2">
                        {category.name}
                      </h3>
                      <div className="space-y-2">
                        {category.subcategories?.map((subcategory) => (
                          <Link
                            key={subcategory.id}
                            to={`/subcategories/${subcategory.id}`}
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {subcategory.image_url ? (
                              <img 
                                src={subcategory.image_url} 
                                alt={subcategory.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                                <Package className="w-4 h-4 text-red-300" />
                              </div>
                            )}
                            <span className="text-gray-700 hover:text-red-600 transition-colors">
                              {subcategory.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
