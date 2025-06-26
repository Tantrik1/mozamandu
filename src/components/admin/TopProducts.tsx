
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export function TopProducts() {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTopProducts();
  }, []);

  const fetchTopProducts = async () => {
    try {
      // Use order_item_details table instead of order_items
      const { data: orderItemDetails, error } = await supabase
        .from('order_item_details')
        .select('product_name, quantity, total_price');

      if (error) throw error;

      const productStats: { [key: string]: { quantity: number; revenue: number } } = {};
      
      orderItemDetails?.forEach((item) => {
        if (!productStats[item.product_name]) {
          productStats[item.product_name] = { quantity: 0, revenue: 0 };
        }
        productStats[item.product_name].quantity += item.quantity;
        productStats[item.product_name].revenue += Number(item.total_price);
      });

      const topProducts = Object.entries(productStats)
        .map(([name, stats]) => ({
          product_name: name,
          total_quantity: stats.quantity,
          total_revenue: stats.revenue,
        }))
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 5);

      setProducts(topProducts);
    } catch (error) {
      console.error('Error fetching top products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product, index) => (
            <div key={product.product_name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                  {index + 1}
                </Badge>
                <div>
                  <p className="font-medium">{product.product_name}</p>
                  <p className="text-sm text-gray-600">
                    {product.total_quantity} units sold
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">Rs. {product.total_revenue.toFixed(2)}</p>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p className="text-gray-500 text-center py-4">No product data available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
