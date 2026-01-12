import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ColorVariant {
  id: string;
  color_name: string;
  hex_code: string | null;
  image_url: string | null;
}

interface ProductBase {
  id: string;
  name: string;
  selling_price: number | null;
  cost_price?: number;
  image_url: string | null;
  subcategory?: { name: string; min_selling_price?: number | null } | null;
}

interface HomeProductCardProps {
  product: ProductBase;
  className?: string;
  badge?: React.ReactNode;
  priceSlot?: React.ReactNode;
}

export const HomeProductCard = memo(function HomeProductCard({
  product,
  className,
  badge,
  priceSlot,
}: HomeProductCardProps) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

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
    enabled: !!product.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const selectedColor = colorVariants.find(c => c.id === selectedColorId);
  const displayImage = selectedColor?.image_url || product.image_url;
  // If selling_price is 0 or null, fall back to subcategory min_selling_price, then cost_price
  const displayPrice =
    (product.selling_price && product.selling_price > 0)
      ? product.selling_price
      : (product.subcategory?.min_selling_price ?? product.cost_price ?? 0);

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        'group block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300',
        className
      )}
    >
      <div className="aspect-square bg-muted relative overflow-hidden">
        <img
          src={displayImage || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          width={512}
          height={512}
        />

        {badge}

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
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-1">
          {product.subcategory?.name || 'Uncategorized'}
        </p>
        <h3 className="font-semibold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {priceSlot ?? (
          <p className="text-lg font-bold text-foreground">Rs. {displayPrice.toLocaleString()}</p>
        )}
      </div>
    </Link>
  );
});
