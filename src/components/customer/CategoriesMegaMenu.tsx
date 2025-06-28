
import { Link } from 'react-router-dom';
import { ChevronDown, Package } from 'lucide-react';
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

interface NavbarItem {
  id: string;
  item_type: string;
  category_id?: string;
  is_visible: boolean;
  display_order: number;
  category?: Category;
}

interface CategoriesMegaMenuProps {
  categories: NavbarItem[];
}

export function CategoriesMegaMenu({ categories }: CategoriesMegaMenuProps) {
  if (categories.length === 0) return null;

  return (
    <>
      {categories.map((item) => {
        const category = item.category;
        if (!category) return null;

        return (
          <NavigationMenu key={item.id}>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="flex text-gray-700 hover:text-red-600 font-medium transition-colors">
                  {category.name}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-screen bg-white border-t shadow-lg">
                    <div className="mx-auto p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      })}
    </>
  );
}
