import { memo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

// Simplified card without color variant fetching for homepage performance
export const HomeProductCard = memo(function HomeProductCard({
  product,
  className,
  badge,
  priceSlot,
}: HomeProductCardProps) {
  const displayImage = product.image_url;
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
          width={300}
          height={300}
        />
        {badge}
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
