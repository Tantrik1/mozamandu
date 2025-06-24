
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SubcategoryCardProps {
  subcategory: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    selling_price: number;
    minimum_quantity: number;
  };
}

export function SubcategoryCard({ subcategory }: SubcategoryCardProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent) {
      parent.classList.add('flex', 'items-center', 'justify-center');
      const placeholder = parent.querySelector('.image-placeholder');
      if (placeholder) {
        (placeholder as HTMLElement).style.display = 'flex';
      }
    }
  };

  return (
    <Link to={`/subcategories/${subcategory.id}`}>
      <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden border-0 bg-white">
        <div className="relative">
          {/* Image Section */}
          <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 relative">
            {subcategory.image_url ? (
              <>
                <img
                  src={subcategory.image_url}
                  alt={subcategory.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={handleImageError}
                />
                {/* Hidden placeholder that shows on error */}
                <div className="image-placeholder absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
                  <Package className="w-16 h-16 text-red-300" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
                <Package className="w-16 h-16 text-red-300" />
              </div>
            )}
            
            {/* Overlay with price badge */}
            <div className="absolute top-3 right-3">
              <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 text-sm">
                Rs.{subcategory.selling_price}
              </Badge>
            </div>
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0" />
            </div>
          </div>
          
          {/* Content Section */}
          <CardContent className="p-6">
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                {subcategory.name}
              </h3>
              
              {subcategory.description && (
                <p className="text-gray-600 text-sm line-clamp-2">
                  {subcategory.description}
                </p>
              )}
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-red-600">
                    Rs.{subcategory.selling_price}
                  </span>
                  <span className="text-sm text-gray-500">each</span>
                </div>
                
                <Badge variant="outline" className="text-xs">
                  Min: {subcategory.minimum_quantity}
                </Badge>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Minimum order: {subcategory.minimum_quantity} pieces
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
