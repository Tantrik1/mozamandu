
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Package } from 'lucide-react';
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

export function ModernMegaMenu() {
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchNavbarItems();
  }, []);

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

  const handleMouseEnter = (categoryId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveCategory(categoryId);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
      setIsHovering(false);
    }, 100);
  };

  const handleMenuMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovering(true);
  };

  const handleMenuMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
      setIsHovering(false);
    }, 100);
  };

  const activeItem = navbarItems.find(item => item.category?.id === activeCategory);

  return (
    <div className="relative">
      {/* Navigation Items */}
      <div className="flex items-center space-x-6">
        {navbarItems.map((item) => {
          const category = item.category;
          if (!category) return null;

          const isActive = activeCategory === category.id;

          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => handleMouseEnter(category.id)}
              onMouseLeave={handleMouseLeave}
            >
              <button 
                className={`
                  flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                  ${isActive 
                    ? 'text-red-600 bg-red-50' 
                    : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                  }
                `}
              >
                <span>{category.name}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Mega Menu Dropdown */}
      {activeItem && isHovering && (
        <div
          className="absolute top-full left-0 w-screen max-w-4xl bg-white shadow-xl border border-gray-200 rounded-lg z-50 mt-1"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activeItem.category?.name}
              </h3>
              <div className="h-0.5 bg-gradient-to-r from-red-500 to-red-300 w-12"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeItem.category?.subcategories?.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  to={`/subcategory/${subcategory.id}`}
                  className="group block p-3 rounded-lg border border-gray-100 hover:border-red-200 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  onClick={() => {
                    setActiveCategory(null);
                    setIsHovering(false);
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {subcategory.image_url ? (
                        <img 
                          src={subcategory.image_url} 
                          alt={subcategory.name}
                          className="w-10 h-10 object-cover rounded-md group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-red-100 rounded-md flex items-center justify-center group-hover:bg-red-200 transition-colors duration-200">
                          <Package className="w-5 h-5 text-red-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 group-hover:text-red-600 transition-colors duration-200 text-sm">
                        {subcategory.name}
                      </h4>
                      {subcategory.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {subcategory.description}
                        </p>
                      )}
                      {subcategory.selling_price && (
                        <p className="text-xs font-medium text-red-600 mt-1">
                          From Rs. {subcategory.selling_price}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
