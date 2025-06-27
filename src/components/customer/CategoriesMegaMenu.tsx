
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface Subcategory {
  id: string;
  name: string;
  description: string;
  image_url: string;
  selling_price: number;
  minimum_quantity: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  subcategories: Subcategory[];
}

interface CategoriesMegaMenuProps {
  category: Category;
}

export function CategoriesMegaMenu({ category }: CategoriesMegaMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsMenuOpen(true)}
        onMouseLeave={() => setIsMenuOpen(false)}
        className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition-colors"
      >
        {category.name}
      </button>

      {isMenuOpen && (
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2 bg-white shadow-2xl border-t-2 border-red-500 z-50 min-w-96"
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{category.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.subcategories?.map((subcategory) => (
                <Link
                  key={subcategory.id}
                  to={`/subcategories/${subcategory.id}`}
                  onClick={() => setIsMenuOpen(false)}
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
        </div>
      )}
    </div>
  );
}
