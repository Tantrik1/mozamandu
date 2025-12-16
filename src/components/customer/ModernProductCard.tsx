
import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Star, Eye, Target } from 'lucide-react';
import { getProductStockSummary } from '@/utils/stockCalculation';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface Product {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  selling_price: number | null;
  image_url: string | null;
  is_featured: boolean;
  has_color_variants: boolean;
  color_has_size_variants: boolean;
  stock_quantity: number;
  subcategory_id: string;
}

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface ModernProductCardProps {
  product: Product;
  subcategorySellingPrice: number;
}

export const ModernProductCard = memo(function ModernProductCard({ product, subcategorySellingPrice }: ModernProductCardProps) {
  const navigate = useNavigate();
  const [productStock, setProductStock] = useState<number>(0);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [realtimeSubcategoryPrice, setRealtimeSubcategoryPrice] = useState<number>(subcategorySellingPrice);

  useEffect(() => {
    fetchProductStock();
    fetchDiscountTiers();
    fetchRealtimeSubcategoryPrice();
  }, [product.id, product.subcategory_id]);

  const fetchRealtimeSubcategoryPrice = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('selling_price')
        .eq('id', product.subcategory_id)
        .single();

      if (error) throw error;
      if (data) {
        setRealtimeSubcategoryPrice(data.selling_price);
      }
    } catch (error) {
      console.error('Error fetching realtime subcategory price:', error);
      setRealtimeSubcategoryPrice(subcategorySellingPrice);
    }
  };

  const fetchDiscountTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', product.subcategory_id)
        .order('min_quantity');

      if (error) throw error;
      setDiscountTiers(data || []);
    } catch (error) {
      console.error('Error fetching discount tiers:', error);
      setDiscountTiers([]);
    }
  };

  const fetchProductStock = async () => {
    try {
      const stock = await getProductStockSummary(product.id);
      setProductStock(stock);
    } catch (error) {
      console.error('Error fetching product stock:', error);
      setProductStock(0);
    }
  };

  const basePrice = product.selling_price || realtimeSubcategoryPrice;
  const hasVolumeDiscount = discountTiers.length > 0;

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/product/${product.id}`);
  };

  if (productStock === 0) return null;

  return (
    <Card 
      onClick={() => navigate(`/product/${product.id}`)}
      className="group h-full flex flex-col overflow-hidden bg-gradient-to-br from-card via-card to-card/80 shadow-lg hover:shadow-xl transition-all duration-500 border border-border/50 hover:border-primary/20 rounded-xl backdrop-blur-sm cursor-pointer"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-muted/30 to-muted/60 rounded-t-xl aspect-square">
        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
          <Button
            onClick={handleQuickView}
            size="sm"
            className="bg-white/95 hover:bg-white text-foreground rounded-full px-6 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
          >
            <Eye className="w-4 h-4 mr-2" />
            Quick View
          </Button>
        </div>
        
        {product.image_url ? (
          <OptimizedImage src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" width={300} height={192} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
            <span className="text-muted-foreground text-sm font-medium">No Image</span>
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.is_featured && (
            <Badge variant="default" className="text-xs px-3 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg animate-pulse">
              <Star className="w-3 h-3 fill-current mr-1" />Featured
            </Badge>
          )}
          {hasVolumeDiscount && (
            <Badge variant="secondary" className="text-xs px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
              <Target className="w-3 h-3 mr-1" />Volume Discount
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3">
          {productStock <= 5 ? (
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300 shadow-lg">Low Stock ({productStock})</Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300 shadow-lg">In Stock ({productStock})</Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-4 flex-1 flex flex-col bg-gradient-to-b from-card to-card/90">
        <h3 className="font-bold text-foreground text-sm mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300">{product.name}</h3>
        {product.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{product.description}</p>}

        <div className="mt-auto pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Rs. {basePrice.toFixed(0)}</span>
              {hasVolumeDiscount && (
                <p className="text-xs text-green-600 font-medium">Bulk discounts available</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
