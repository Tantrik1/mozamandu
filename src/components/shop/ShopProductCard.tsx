import { Link } from 'react-router-dom';
import { Eye, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  image_url?: string;
  selling_price?: number;
  cost_price: number;
  is_featured?: boolean;
  subcategory?: { name: string };
}

interface ShopProductCardProps {
  product: Product;
  className?: string;
}

export function ShopProductCard({ product, className }: ShopProductCardProps) {
  const price = product.selling_price || product.cost_price;
  const hasDiscount = product.selling_price && product.selling_price < product.cost_price;
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.selling_price! / product.cost_price) * 100) 
    : 0;

  return (
    <Link
      to={`/product/${product.id}`}
      className={cn(
        "group relative flex flex-col bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is_featured && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] px-2">
              <Star className="w-2.5 h-2.5 mr-1 fill-current" />
              Featured
            </Badge>
          )}
          {discountPercent > 0 && (
            <Badge className="bg-destructive hover:bg-destructive text-white text-[10px] px-2">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button
            size="sm"
            className="bg-white text-foreground hover:bg-white/90 rounded-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Category */}
        {product.subcategory?.name && (
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            {product.subcategory.name}
          </p>
        )}

        {/* Name */}
        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-auto flex items-center gap-2">
          <span className="text-lg font-bold">Rs.{price}</span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              Rs.{product.cost_price}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}