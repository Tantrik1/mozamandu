import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowRight, ShoppingCart, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useRobustCart } from '@/hooks/useRobustCart';
import { toast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  selling_price: number | null;
  image_url: string | null;
  subcategory_id: string;
  subcategories: {
    name: string;
    selling_price: number;
  };
}

export function EnhancedFeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const navigate = useNavigate();
  const { addToCart } = useRobustCart();

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          selling_price,
          image_url,
          subcategory_id,
          subcategories (
            name,
            selling_price
          )
        `)
        .eq('is_featured', true)
        .eq('status', 'active')
        .limit(6);

      if (error) {
        console.error('Error fetching featured products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (product: Product) => {
    const success = await addToCart({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.selling_price || product.subcategories.selling_price,
    });

    if (success) {
      toast({
        title: "Added to Cart",
        description: `${product.name} added to cart successfully!`,
      });
    }
  };

  const handleViewProduct = (product: Product) => {
    navigate(`/subcategory/${product.subcategory_id}`);
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-white to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto mb-12"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-2xl h-96"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-br from-white to-blue-50/30 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-r from-blue-200 to-cyan-200 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-4 py-2">
            <Star className="w-4 h-4 mr-2" />
            Featured Collection
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
            Our Best Sellers
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Handpicked products that our customers love the most. Premium quality with unbeatable value.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {products.map((product) => {
            const price = product.selling_price || product.subcategories.selling_price;
            const isHovered = hoveredProduct === product.id;

            return (
              <Card
                key={product.id}
                className={`group cursor-pointer bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden transform ${
                  isHovered ? 'scale-105 -translate-y-2' : 'scale-100'
                }`}
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-all duration-700 ${
                        isHovered ? 'scale-110 rotate-1' : 'scale-100'
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ShoppingCart className="w-16 h-16" />
                    </div>
                  )}

                  {/* Featured Badge */}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 px-3 py-1 text-xs">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Featured
                    </Badge>
                  </div>

                  {/* Hover Overlay */}
                  <div className={`absolute inset-0 bg-black/20 flex items-center justify-center gap-3 transition-all duration-300 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <Button
                      onClick={() => handleViewProduct(product)}
                      className="bg-white/90 text-gray-900 hover:bg-white border-0 shadow-lg transform scale-110"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      onClick={() => handleQuickAdd(product)}
                      className="bg-blue-600/90 text-white hover:bg-blue-700 border-0 shadow-lg transform scale-110"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                <CardContent className="p-6">
                  {/* Product Info */}
                  <div className="space-y-3">
                    <h3 className={`font-semibold text-lg leading-tight transition-colors duration-300 ${
                      isHovered ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {product.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600">
                      {product.subcategories.name}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-gray-900">
                          Rs. {price.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">each</span>
                      </div>
                      
                      <Button
                        onClick={() => handleViewProduct(product)}
                        variant="outline"
                        className={`transform transition-all duration-300 hover:scale-105 ${
                          isHovered ? 'border-blue-400 text-blue-600' : ''
                        }`}
                      >
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Button
            onClick={() => navigate('/categories')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 px-8 py-4 text-lg font-semibold rounded-xl transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <span className="flex items-center gap-2">
              View All Products
              <ArrowRight className="w-5 h-5" />
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}