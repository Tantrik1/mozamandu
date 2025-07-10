import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ShoppingCart } from 'lucide-react';
import { getRealTimeStock } from '@/utils/inventoryManager';

interface ProductCardProps {
  product: any;
}

export function ProductCard({ product }: ProductCardProps) {
  const [stock, setStock] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStock();
  }, [product.id]);

  const fetchStock = async () => {
    try {
      const totalStock = await getRealTimeStock(product.id);
      setStock(totalStock);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white shadow-md rounded-md overflow-hidden">
      <div className="relative">
        <img
          src={product.image_url || 'https://via.placeholder.com/350x200'}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">
            <Star className="h-4 w-4 mr-2" />
            Featured
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3">{product.description?.substring(0, 50)}...</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-primary">Rs. {product.subcategories?.selling_price || product.selling_price}</span>
          {loading ? (
            <span className="text-gray-500 text-sm">Loading stock...</span>
          ) : (
            <Badge variant={stock > 0 ? 'default' : 'destructive'}>
              {stock > 0 ? `${stock} In Stock` : 'Out of Stock'}
            </Badge>
          )}
        </div>
        <Button className="w-full" disabled={loading || stock === 0}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
