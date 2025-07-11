
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProductVariantSelector } from './ProductVariantSelector';
import { Search, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  status: string;
  categories?: { name: string };
  subcategories?: { name: string };
}

export function ProductListWithVariants() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          subcategories(name)
        `)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categories?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.subcategories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
  };

  if (selectedProduct) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToList}>
          ← Back to Products
        </Button>
        <ProductVariantSelector
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          onVariantSelect={(variant) => {
            console.log('Selected variant:', variant);
            // Handle variant selection (e.g., add to cart, show details)
          }}
        />
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products with Variants</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <CardTitle className="text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {product.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {product.categories && (
                    <Badge variant="secondary">{product.categories.name}</Badge>
                  )}
                  {product.subcategories && (
                    <Badge variant="outline">{product.subcategories.name}</Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {product.has_color_variants && (
                    <Badge variant="default" className="text-xs">Colors</Badge>
                  )}
                  {product.color_has_size_variants && (
                    <Badge variant="default" className="text-xs">Sizes</Badge>
                  )}
                </div>

                <Button 
                  className="w-full"
                  onClick={() => handleProductSelect(product)}
                >
                  <Package className="h-4 w-4 mr-2" />
                  View Variants
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              {searchTerm ? 'No products found matching your search' : 'No products available'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
