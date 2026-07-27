import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ColorVariant {
  id: string;
  color_name: string;
  hex_code: string | null;
  image_url: string | null;
}

export interface ProductBase {
  id: string;
  name: string;
  selling_price: number | null;
  cost_price?: number | null;
  image_url: string | null;
  is_featured?: boolean;
  has_color_variants?: boolean;
  subcategory?: { name: string; min_selling_price?: number | null } | null;
}

interface HomeProductCardProps {
  product: ProductBase;
  className?: string;
  badge?: React.ReactNode;
  priceSlot?: React.ReactNode;
  showColorVariants?: boolean;
}

export const HomeProductCard = memo(function HomeProductCard({
  product,
  className,
  badge,
  priceSlot,
  showColorVariants = true,
}: HomeProductCardProps) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  // Fetch color variants if product has color variants
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
    enabled: !!(showColorVariants && product.has_color_variants),
    staleTime: 5 * 60 * 1000,
  });

  const selectedColor = colorVariants.find(c => c.id === selectedColorId);
  const displayImage = selectedColor?.image_url || product.image_url;

  // If selling_price is 0 or null, fall back to subcategory min_selling_price, then cost_price
  const displayPrice =
    (product.selling_price && product.selling_price > 0)
      ? product.selling_price
      : (product.subcategory?.min_selling_price ?? product.cost_price ?? 0);

  const costPrice = product.cost_price || 0;
  const hasDiscount = costPrice > displayPrice && displayPrice > 0;

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
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onError={(e) => {
            const target = e.currentTarget;
            target.onerror = null;
            target.src = '/placeholder.svg';
          }}
          width={300}
          height={300}
        />
        {badge}
        {product.is_featured && !badge && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-500 text-white border-0 text-[10px] font-semibold">
              ★ Featured
            </Badge>
          </div>
        )}
      </div>

      <div className="p-3.5 sm:p-4">
        {product.subcategory?.name && (
          <p className="text-xs font-bold text-destructive mb-1 tracking-tight truncate">
            {product.subcategory.name}
          </p>
        )}
        <h3 className="font-semibold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors text-sm sm:text-base">
          {product.name}
        </h3>

        {colorVariants.length > 0 && (
          <div className="flex items-center gap-1 mb-2.5">
            {colorVariants.slice(0, 4).map((color) => (
              <button
                key={color.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColorId(color.id === selectedColorId ? null : color.id);
                }}
                className={cn(
                  "w-4 h-4 rounded-full transition-all",
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
              <span className="text-[10px] text-muted-foreground ml-0.5 font-medium">
                +{colorVariants.length - 4}
              </span>
            )}
          </div>
        )}

        {priceSlot ?? (
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              Rs. {displayPrice.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through font-medium">
                Rs. {costPrice.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
});
