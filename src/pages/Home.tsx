
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart } from 'lucide-react';

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
}

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchFeaturedProducts();
    fetchCategories();
  }, []);

  const fetchFeaturedProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        selling_price,
        is_featured,
        categories (name),
        subcategories (name, selling_price)
      `)
      .eq('is_featured', true)
      .eq('status', 'active')
      .limit(6);

    if (error) {
      console.error('Error fetching featured products:', error);
    } else {
      setFeaturedProducts(data || []);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('status', 'on');

    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data || []);
    }
  };

  const getProductPrice = (product: Product) => {
    return product.selling_price || product.subcategories?.selling_price || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">Welcome to Mozamandu</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Discover premium quality socks, boxers, and caps. Comfort meets style in every product.
          </p>
          <Link to="/products">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Shop Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{category.description}</p>
                  <Link to={`/category/${category.id}`}>
                    <Button variant="outline" className="w-full">
                      Browse {category.name}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4 text-sm">{product.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-blue-600">
                      ${getProductPrice(product).toFixed(2)}
                    </span>
                    <Badge variant="outline">{product.categories?.name}</Badge>
                  </div>
                  <Button className="w-full">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Mozamandu</h3>
              <p className="text-gray-400">Your premium destination for quality apparel and accessories.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Categories</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Socks</li>
                <li>Boxers</li>
                <li>Caps</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Contact Us</li>
                <li>Shipping Info</li>
                <li>Returns</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Facebook</li>
                <li>Instagram</li>
                <li>Twitter</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Mozamandu. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
