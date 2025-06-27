
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

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

export function CategoriesMegaMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const currentCategory = categories.find(cat => cat.id === hoveredCategory);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsMenuOpen(true)}
        onMouseLeave={() => {
          setIsMenuOpen(false);
          setHoveredCategory(null);
        }}
        className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition-colors"
      >
        Categories
      </button>

      {isMenuOpen && (
        <div
          className="absolute top-full left-0 bg-white shadow-2xl border-t-2 border-red-500 z-50"
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => {
            setIsMenuOpen(false);
            setHoveredCategory(null);
          }}
          style={{ minWidth: '800px' }}
        >
          <div className="flex">
            {/* Categories List */}
            <div className="w-1/3 bg-gray-50 border-r">
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Categories</h3>
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-3 cursor-pointer rounded-lg transition-colors ${
                      hoveredCategory === category.id 
                        ? 'bg-red-50 text-red-600 border-l-4 border-red-500' 
                        : 'hover:bg-gray-100'
                    }`}
                    onMouseEnter={() => setHoveredCategory(category.id)}
                  >
                    <h4 className="font-medium">{category.name}</h4>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Subcategories Cards */}
            <div className="w-2/3 p-6">
              {currentCategory ? (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">{currentCategory.name}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {currentCategory.subcategories?.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        to={`/subcategories/${subcategory.id}`}
                        onClick={() => {
                          setIsMenuOpen(false);
                          setHoveredCategory(null);
                        }}
                      >
                        <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-red-200">
                          <CardContent className="p-0">
                            <div className="relative overflow-hidden rounded-t-lg">
                              {subcategory.image_url ? (
                                <img
                                  src={subcategory.image_url}
                                  alt={subcategory.name}
                                  className="w-full h-24 object-cover group-hover:scale-110 transition-transform duration-300"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-red-50', 'to-red-100');
                                      const placeholder = document.createElement('div');
                                      placeholder.className = 'w-8 h-8 text-red-300';
                                      placeholder.innerHTML = '<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>';
                                      parent.appendChild(placeholder);
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-24 flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
                                  <Package className="w-8 h-8 text-red-300" />
                                </div>
                              )}
                              <div className="absolute top-1 right-1">
                                <Badge className="bg-red-500 hover:bg-red-600 text-xs">
                                  Rs. {subcategory.selling_price}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="p-3">
                              <h4 className="font-semibold text-gray-800 mb-1 group-hover:text-red-600 transition-colors text-sm">
                                {subcategory.name}
                              </h4>
                              {subcategory.description && (
                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                  {subcategory.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Min: {subcategory.minimum_quantity}</span>
                                <span className="text-red-600 font-medium">View →</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  <p>Hover over a category to see subcategories</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
