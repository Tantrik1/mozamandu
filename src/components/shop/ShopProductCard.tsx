import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ColorVariant {
  id: string;
  color_name: string;
  hex_code: string | null;
  image_url: string | null;
}

interface Product {
  id: string;
  name: string;
  image_url?: string;
  selling_price?: number;
  cost_price: number;
  is_featured?: boolean;
  has_color_variants?: boolean;
  subcategory?: { name: string };
}

interface ShopProductCardProps {
  product: Product;
  className?: string;
}

export function ShopProductCard({ product, className }: ShopProductCardProps) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  
  const price = product.selling_price || product.cost_price;
  const hasDiscount = product.selling_price && product.selling_price < product.cost_price;
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.selling_price! / product.cost_price) * 100) 
    : 0;

  // Fetch color variants with hex codes
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
  });

  // Get current display image based on selected color
  const selectedColor = colorVariants.find(c => c.id === selectedColorId);
  const displayImage = selectedColor?.image_url || product.image_url;

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        "group relative flex flex-col bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20",
        className
      )}
    >
      {/* Image - 1:1 Aspect Ratio */}
      <div className="relative w-full aspect-square overflow-hidden bg-muted">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            width={1024}
            height={1024}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Type Badge (Subcategory) */}
        {product.subcategory?.name && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px] font-medium backdrop-blur-sm">
              {product.subcategory.name}
            </Badge>
          </div>
        )}

        {/* Featured Badge */}
        {product.is_featured && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-500 text-white border-0 text-[10px]">
              ★ Featured
            </Badge>
          </div>
        )}

        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button
            size="sm"
            className="bg-white text-foreground hover:bg-white/90 rounded-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 sm:p-4">
        {/* Name */}
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-tight">
          {product.name}
        </h3>

        {/* Color Circles - Improved with clear selection state */}
        {colorVariants.length > 0 && (
          <div className="flex items-center gap-1 mb-2">
            {colorVariants.slice(0, 4).map((color) => (
              <button
                key={color.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColorId(color.id === selectedColorId ? null : color.id);
                }}
                className={cn(
                  "w-5 h-5 rounded-full transition-all",
                  selectedColorId === color.id
                    ? "ring-2 ring-primary ring-offset-1 scale-110"
                    : "ring-1 ring-border hover:ring-primary/50 hover:scale-105"
                )}
                style={{ backgroundColor: color.hex_code || '#ccc' }}
                title={color.color_name}
                aria-label={`Select ${color.color_name}`}
              />
            ))}
            {colorVariants.length > 4 && (
              <span className="text-[10px] text-muted-foreground ml-0.5">
                +{colorVariants.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Price - More prominent */}
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-bold text-foreground">Rs. {price.toLocaleString()}</span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              Rs. {product.cost_price.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}