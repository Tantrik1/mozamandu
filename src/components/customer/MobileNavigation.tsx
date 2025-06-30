
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  subcategories: Array<{
    id: string;
    name: string;
    image_url?: string;
    description?: string;
    selling_price?: number;
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

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchNavbarItems();
    }
  }, [isOpen]);

  const fetchNavbarItems = async () => {
    try {
      const { data, error } = await supabase
        .from('navbar_items')
        .select(`
          id,
          item_type,
          category_id,
          is_visible,
          display_order,
          category:categories (
            id,
            name,
            subcategories (
              id,
              name,
              image_url,
              description,
              selling_price
            )
          )
        `)
        .eq('is_visible', true)
        .eq('item_type', 'category')
        .order('display_order');

      if (error) throw error;

      const categoriesWithSubcategories = data?.filter(item => 
        item.category && item.category.subcategories && item.category.subcategories.length > 0
      ) || [];

      setNavbarItems(categoriesWithSubcategories);
    } catch (error) {
      console.error('Error fetching navbar items:', error);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="lg:hidden border-t border-gray-200 bg-white">
      <div className="px-4 py-4 space-y-4">
        {/* Mobile Search */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        </div>

        {/* Mobile Navigation Links */}
        <div className="space-y-1">
          <Link
            to="/"
            className="block px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            onClick={onClose}
          >
            Home
          </Link>
          
          {/* Mobile Categories */}
          {navbarItems.map((item) => {
            const category = item.category;
            if (!category) return null;

            const isOpen = openCategories.includes(category.id);

            return (
              <Collapsible key={item.id} open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-3 py-2 text-left text-gray-700 hover:text-red-600 hover:bg-red-50"
                  >
                    <span>{category.name}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  <div className="max-h-80 overflow-y-auto">
                    {category.subcategories?.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        to={`/subcategory/${subcategory.id}`}
                        className="flex items-center space-x-3 px-6 py-3 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        onClick={onClose}
                      >
                        <div className="flex-shrink-0">
                          {subcategory.image_url ? (
                            <img 
                              src={subcategory.image_url} 
                              alt={subcategory.name}
                              className="w-8 h-8 object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                              <Package className="w-4 h-4 text-red-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{subcategory.name}</p>
                          {subcategory.selling_price && (
                            <p className="text-xs text-red-600">
                              From Rs. {subcategory.selling_price}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          
          <Link
            to="/about"
            className="block px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            onClick={onClose}
          >
            About
          </Link>
          <Link
            to="/contact"
            className="block px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            onClick={onClose}
          >
            Contact
          </Link>
          <Link
            to="/faq"
            className="block px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            onClick={onClose}
          >
            FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
