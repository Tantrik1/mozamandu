import { memo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

interface Product {
  id: string;
  name: string;
  image_url?: string | null;
  selling_price: number | null;
  cost_price: number;
  is_featured?: boolean;
  subcategory?: { name: string; min_selling_price?: number | null } | null;
}

interface ShopProductCardProps {
  product: Product;
  className?: string;
}

export const ShopProductCard = memo(function ShopProductCard({ product, className }: ShopProductCardProps) {
  // If selling_price is 0 or null, fall back to subcategory min_selling_price, then cost_price
  const displayPrice = (product.selling_price && product.selling_price > 0)
    ? product.selling_price
    : (product.subcategory?.min_selling_price ?? product.cost_price ?? 0);

  const displayImage = product.image_url;

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
        <OptimizedImage
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
          Rs. {displayPrice.toLocaleString()}
        </p>
      </div>
    </Link>
  );
});