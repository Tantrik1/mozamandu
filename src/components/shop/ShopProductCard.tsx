import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  image_url?: string | null;
  selling_price: number | null;
  cost_price: number;
  is_featured?: boolean;
  has_color_variants?: boolean;
  subcategory?: { name: string; min_selling_price?: number | null } | null;
}

interface ShopProductCardProps {
  product: Product;
  className?: string;
}

export function ShopProductCard({ product, className }: ShopProductCardProps) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  // If selling_price is 0 or null, fall back to subcategory min_selling_price, then cost_price
  const displayPrice = (product.selling_price && product.selling_price > 0)
    ? product.selling_price
    : (product.subcategory?.min_selling_price ?? product.cost_price ?? 0);

  // Fetch color variants with hex codes if applicable
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
        'group block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300',
        className
      )}
    >
      {/* Image - 1:1 Aspect Ratio */}
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
        {product.is_featured && (
          <div className="absolute top-2 right-2">
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              ★ Featured
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {product.subcategory?.name && (
          <p className="text-xs font-bold text-destructive mb-1 tracking-tight">
            {product.subcategory.name}
          </p>
        )}
        <h3 className="font-semibold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Color Circles */}
        {colorVariants.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            {colorVariants.slice(0, 4).map((color) => (
              <button
                key={color.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColorId(color.id === selectedColorId ? null : color.id);
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
              <span className="text-[10px] text-muted-foreground font-medium ml-0.5">
                +{colorVariants.length - 4}
              </span>
            )}
          </div>
        )}

        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
          Rs. {displayPrice.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}