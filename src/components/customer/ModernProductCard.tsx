import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { StarRating } from '@/components/product/StarRating';
import { useProductRating } from '@/hooks/useProductRating';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getProductStockSummary } from '@/utils/stockCalculation';
import { cn } from '@/lib/utils';

interface ColorVariant {
  id: string;
  color_name: string;
  hex_code: string | null;
  image_url: string | null;
}

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

interface ModernProductCardProps {
  product: Product;
  subcategorySellingPrice: number;
}

export const ModernProductCard = memo(function ModernProductCard({ product, subcategorySellingPrice }: ModernProductCardProps) {
  const navigate = useNavigate();
  const { averageRating, reviewCount } = useProductRating(product.id);

  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  // Use React Query for stock with long cache
  const { data: productStock = 0 } = useQuery({
    queryKey: ['product-stock', product.id],
    queryFn: () => getProductStockSummary(product.id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Use React Query for discount tiers with long cache (shared across products in same subcategory)
  const { data: discountTiers = [] } = useQuery({
    queryKey: ['discount-tiers', product.subcategory_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('subcategory_id', product.subcategory_id)
        .order('min_quantity');
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - rarely changes
    gcTime: 30 * 60 * 1000,
  });

  // Use React Query for subcategory price with long cache (shared across products in same subcategory)
  const { data: realtimeSubcategoryPrice } = useQuery({
    queryKey: ['subcategory-price', product.subcategory_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('subcategories')
        .select('min_selling_price')
        .eq('id', product.subcategory_id)
        .single();
      return data?.min_selling_price || subcategorySellingPrice;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - rarely changes
    gcTime: 30 * 60 * 1000,
    initialData: subcategorySellingPrice,
  });

  // If selling_price is 0 or null, fall back to subcategory min_selling_price
  const basePrice = (product.selling_price && product.selling_price > 0)
    ? product.selling_price
    : realtimeSubcategoryPrice;
  const hasVolumeDiscount = discountTiers.length > 0;

  // Use React Query for product color variants (shared cache with shop page)
  const { data: colorVariants = [] } = useQuery({
    queryKey: ['product-colors', product.id],
    queryFn: async (): Promise<ColorVariant[]> => {
      const { data } = await supabase
        .from('color_variants')
        .select('id, color_name, image_url, colors(hex_code)')
        .eq('product_id', product.id);

      return (data || []).map((cv: any) => ({
        id: cv.id,
        color_name: cv.color_name,
        hex_code: cv.colors?.hex_code || null,
        image_url: cv.image_url,
      }));
    },
    enabled: !!product.has_color_variants,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const selectedColor = colorVariants.find(c => c.id === selectedColorId);
  const displayImage = selectedColor?.image_url || product.image_url;

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/product/${product.id}`);
  };

  if (productStock === 0) return null;

  return (
    <Card 
      onClick={() => navigate(`/product/${product.id}`)}
      className="group h-full flex flex-col overflow-hidden bg-card shadow-lg hover:shadow-xl transition-all duration-500 border border-border/50 hover:border-primary/20 rounded-xl cursor-pointer"
    >
      {/* Image Container - 1:1 Aspect Ratio */}
      <div className="relative overflow-hidden bg-muted rounded-t-xl w-full aspect-square">
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
        
        {displayImage ? (
          <OptimizedImage 
            src={displayImage} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
            loading="lazy" 
            width={1024} 
            height={1024} 
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm font-medium">No Image</span>
          </div>
        )}
        
        {/* Stock Badge Only */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] px-2 py-0.5 shadow-md">
            In Stock: {productStock}
          </Badge>
        </div>

        {/* Color Variants (Homepage) */}
        {colorVariants.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-background/85 backdrop-blur-sm rounded-full px-2 py-1 border border-border/60 shadow-sm">
              {colorVariants.slice(0, 4).map((color) => (
                <button
                  key={color.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedColorId(prev => (prev === color.id ? null : color.id));
                  }}
                  className={cn(
                    'w-4 h-4 rounded-full transition-all',
                    selectedColorId === color.id
                      ? 'ring-2 ring-primary ring-offset-1 scale-110'
                      : 'ring-1 ring-border hover:ring-primary/50 hover:scale-105'
                  )}
                  style={{ backgroundColor: color.hex_code || '#ccc' }}
                  title={color.color_name}
                  aria-label={`Select ${color.color_name}`}
                />
              ))}
              {colorVariants.length > 4 && (
                <span className="text-[10px] text-muted-foreground ml-0.5">+{colorVariants.length - 4}</span>
              )}
            </div>

            {selectedColorId && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColorId(null);
                }}
                className="text-[10px] bg-background/85 backdrop-blur-sm rounded-full px-2 py-1 border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>
      
      <CardContent className="p-3 flex-1 flex flex-col">
        <h3 className="font-bold text-foreground text-sm mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300">{product.name}</h3>
        
        {/* Rating Display */}
        {reviewCount > 0 && (
          <StarRating rating={averageRating} size="sm" reviewCount={reviewCount} className="mb-2" />
        )}

        <div className="mt-auto pt-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">Rs. {basePrice.toFixed(0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
