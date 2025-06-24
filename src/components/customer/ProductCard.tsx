
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Star, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  description: string;
  selling_price: number;
  is_featured: boolean;
  categories: {
    name: string;
  };
  subcategories: {
    name: string;
    selling_price: number;
  };
  product_images?: {
    image_url: string;
    is_primary: boolean;
  }[];
}

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
}

export function ProductCard({ product, showAddToCart = true }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isWishlist, setIsWishlist] = useState(false);

  const getProductPrice = () => {
    return product.selling_price || product.subcategories?.selling_price || 0;
  };

  const getPrimaryImage = () => {
    if (product.product_images && product.product_images.length > 0) {
      const primaryImage = product.product_images.find(img => img.is_primary);
      return primaryImage?.image_url || product.product_images[0]?.image_url;
    }
    return null;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlist(!isWishlist);
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 bg-white border-0 shadow-lg overflow-hidden">
      {/* Product Image */}
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
        {getPrimaryImage() && !imageError ? (
          <img 
            src={getPrimaryImage()!} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-4xl text-gray-400">👕</div>
          </div>
        )}
        
        {/* Wishlist Button */}
        <button
          onClick={toggleWishlist}
          className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all duration-200"
        >
          <Heart className={`h-4 w-4 ${isWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.is_featured && (
            <Badge className="bg-red-600 hover:bg-red-700 text-white border-0">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
            {product.categories?.name}
          </Badge>
        </div>

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button 
            size="sm" 
            className="bg-white text-gray-900 hover:bg-gray-100 transform scale-95 group-hover:scale-100 transition-transform duration-200"
          >
            Quick View
          </Button>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors">
            {product.name}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-red-600">
              Rs. {getProductPrice().toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">
              {product.subcategories?.name}
            </span>
          </div>
        </div>

        {showAddToCart && (
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 transform hover:scale-105">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
