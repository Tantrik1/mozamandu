
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

export function SmoothMegaMenu() {
  const [navbarItems, setNavbarItems] = useState<NavbarItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    }, 200);
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
    }, 200);
  };

  const activeItem = navbarItems.find(item => item.category?.id === activeCategory);

  return (
    <div className="relative">
      {/* Navigation Items */}
      <div className="flex items-center space-x-8">
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
              <button className={`
                flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out
                ${isActive 
                  ? 'text-red-600 bg-red-50 rounded-md' 
                  : 'text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-md'
                }
              `}>
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
          ref={menuRef}
          className="absolute top-full left-0 w-screen bg-white shadow-2xl border-t-2 border-red-500 z-50"
          style={{ 
            left: '50%', 
            transform: 'translateX(-50%)',
            animation: 'fadeInDown 0.3s ease-out'
          }}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          <div className="max-w-7xl mx-auto p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{activeItem.category?.name}</h3>
              <div className="h-0.5 bg-gradient-to-r from-red-500 to-red-300 w-24"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeItem.category?.subcategories?.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  to={`/subcategory/${subcategory.id}`}
                  className="group block p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white"
                  onClick={() => {
                    setActiveCategory(null);
                    setIsHovering(false);
                  }}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {subcategory.image_url ? (
                        <img 
                          src={subcategory.image_url} 
                          alt={subcategory.name}
                          className="w-16 h-16 object-cover rounded-lg group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors duration-300">
                          <Package className="w-8 h-8 text-red-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors duration-200 text-sm">
                        {subcategory.name}
                      </h4>
                      {subcategory.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {subcategory.description}
                        </p>
                      )}
                      {subcategory.selling_price && (
                        <p className="text-xs font-medium text-red-600 mt-2">
                          From Rs. {subcategory.selling_price}
                        </p>
                      )}
                      <div className="flex items-center mt-2">
                        <span className="text-xs text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          View Products →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
