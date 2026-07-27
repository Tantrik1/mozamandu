import { HomeProductCard } from '@/components/home/HomeProductCard';

interface Product {
  id: string;
  name: string;
  image_url?: string | null;
  selling_price: number | null;
  cost_price: number;
  is_featured?: boolean;
  has_color_variants?: boolean;
  subcategory?: { name: string; min_selling_price?: number | null };
}

interface ShopProductCardProps {
  product: Product;
  className?: string;
}

export function ShopProductCard({ product, className }: ShopProductCardProps) {
  return (
    <HomeProductCard
      product={{
        id: product.id,
        name: product.name,
        selling_price: product.selling_price,
        cost_price: product.cost_price,
        image_url: product.image_url || null,
        is_featured: product.is_featured,
        has_color_variants: product.has_color_variants,
        subcategory: product.subcategory,
      }}
      className={className}
    />
  );
}