
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, Truck, Shield, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedProductCard } from './EnhancedProductCard';

interface Product {
  id: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price?: number;
  image_url?: string;
  status: string;
  subcategory_id: string;
  is_featured?: boolean;
  has_color_variants?: boolean;
  color_has_size_variants?: boolean;
  subcategories: {
    name: string;
    selling_price: number;
    minimum_quantity: number;
  };
  color_variants?: any[];
}

export function HeroSection() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      console.log('Fetching featured products...');
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          subcategories!inner (
            name,
            selling_price,
            minimum_quantity
          ),
          color_variants (
            id,
            color_name,
            image_url,
            has_sizes,
            size_variants (
              id,
              size_name,
              size_code
            )
          )
        `)
        .eq('status', 'active')
        .eq('is_featured', true)
        .limit(4)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching featured products:', error);
        throw error;
      }

      console.log('Featured products fetched:', data?.length || 0);
      setFeaturedProducts(data || []);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      {/* Hero Banner */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Premium Fashion at
            <span className="text-primary block">Unbeatable Prices</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover our exclusive collection of high-quality clothing with bulk discounts and combo offers. Perfect for retailers and fashion enthusiasts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products">
              <Button size="lg" className="text-lg px-8 py-3">
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/categories">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Browse Categories
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <Star className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Premium Quality</h3>
            <p className="text-gray-600">Hand-picked products with guaranteed quality and style</p>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <Truck className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
            <p className="text-gray-600">Quick and reliable shipping across all locations</p>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure Shopping</h3>
            <p className="text-gray-600">Safe and secure payment processing</p>
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-lg text-gray-600">Check out our most popular items</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <EnhancedProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="text-center mt-12">
              <Link to="/products">
                <Button variant="outline" size="lg">
                  View All Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No featured products available at the moment</p>
            <Link to="/products">
              <Button variant="outline">
                Browse All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Shopping?</h2>
          <p className="text-xl mb-8 opacity-90">Join thousands of satisfied customers</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/products">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                Shop Now
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5" />
              <span>Need help? Call us anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
