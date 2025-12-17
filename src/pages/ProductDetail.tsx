import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ModernNavbar } from '@/components/navbar';
import { Footer } from '@/components/layout/Footer';
import { SimilarProducts, MoreSubcategories, ProductReviews } from '@/components/product';
import { MoreFromMozamandu } from '@/components/product/MoreFromMozamandu';
import { ProductImageGallery } from '@/components/product/ProductImageGallery';
import { ProductInfo } from '@/components/product/ProductInfo';
import { ProductDetailsAccordion } from '@/components/product/ProductDetailsAccordion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRobustCart } from '@/hooks/useRobustCart';
import { getProductStockSummary } from '@/utils/stockCalculation';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Package, Home as HomeIcon } from 'lucide-react';

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
  category_id: string;
  subcategory_id: string;
  status: string;
  material_composition: string | null;
  care_instructions: string[] | null;
}

interface ColorVariant {
  id: string;
  color_name: string;
  has_sizes: boolean;
  image_url: string | null;
  hex_code: string | null;
}

interface SizeVariant {
  id: string;
  size_name: string;
}

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_amount: number;
}

interface Subcategory {
  id: string;
  name: string;
  min_selling_price: number;
  minimum_quantity: number;
  description: string | null;
  category: { id: string; name: string } | null;
}

// Data fetching functions
const fetchProduct = async (productId: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  if (error) throw error;
  return data;
};

const fetchSubcategory = async (subcategoryId: string): Promise<Subcategory | null> => {
  const { data } = await supabase
    .from('subcategories')
    .select('*, category:categories(id, name)')
    .eq('id', subcategoryId)
    .single();
  return data;
};

const fetchDiscountTiers = async (subcategoryId: string): Promise<DiscountTier[]> => {
  const { data } = await supabase
    .from('discount_tiers')
    .select('*')
    .eq('subcategory_id', subcategoryId)
    .order('min_quantity');
  return data || [];
};

const fetchColorVariants = async (productId: string): Promise<ColorVariant[]> => {
  const { data } = await supabase
    .from('color_variants')
    .select('id, color_name, has_sizes, image_url, colors(hex_code)')
    .eq('product_id', productId);
  return (data || []).map((cv: any) => ({
    id: cv.id,
    color_name: cv.color_name,
    has_sizes: cv.has_sizes,
    image_url: cv.image_url,
    hex_code: cv.colors?.hex_code || null,
  }));
};

const fetchAdditionalImages = async (productId: string): Promise<string[]> => {
  const { data } = await supabase
    .from('product_images')
    .select('image_url')
    .eq('product_id', productId)
    .eq('is_primary', false)
    .order('created_at');
  return data?.map(img => img.image_url) || [];
};

const fetchProductRating = async (productId: string) => {
  const { data } = await supabase.rpc('get_product_rating', { p_product_id: productId });
  return data?.[0] || { average_rating: 0, review_count: 0 };
};

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [sizeVariants, setSizeVariants] = useState<SizeVariant[]>([]);

  const { addToCart, cartItems } = useRobustCart();

  // Data queries with caching
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId!),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: subcategory } = useQuery({
    queryKey: ['product-subcategory', product?.subcategory_id],
    queryFn: () => fetchSubcategory(product!.subcategory_id),
    enabled: !!product?.subcategory_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: discountTiersData = [] } = useQuery({
    queryKey: ['discount-tiers', product?.subcategory_id],
    queryFn: () => fetchDiscountTiers(product!.subcategory_id),
    enabled: !!product?.subcategory_id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: colorVariants = [] } = useQuery({
    queryKey: ['color-variants', productId],
    queryFn: () => fetchColorVariants(productId!),
    enabled: !!productId && product?.has_color_variants,
    staleTime: 5 * 60 * 1000,
  });

  const { data: additionalImages = [] } = useQuery({
    queryKey: ['product-images', productId],
    queryFn: () => fetchAdditionalImages(productId!),
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: productStock = 0 } = useQuery({
    queryKey: ['product-stock', productId],
    queryFn: () => getProductStockSummary(productId!),
    enabled: !!productId,
    staleTime: 1 * 60 * 1000,
  });

  const { data: ratingData } = useQuery({
    queryKey: ['product-rating-detail', productId],
    queryFn: () => fetchProductRating(productId!),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  // Build image gallery
  const images = useMemo(() => {
    const imgs: string[] = [];

    const selectedCv = colorVariants.find(cv => cv.id === selectedColor);
    if (selectedCv?.image_url) imgs.push(selectedCv.image_url);

    if (product?.image_url) imgs.push(product.image_url);
    additionalImages.forEach(img => {
      if (!imgs.includes(img)) imgs.push(img);
    });
    colorVariants.forEach(cv => {
      if (cv.id === selectedColor) return;
      if (cv.image_url && !imgs.includes(cv.image_url)) {
        imgs.push(cv.image_url);
      }
    });
    return imgs;
  }, [product?.image_url, additionalImages, colorVariants, selectedColor]);

  // Reset selections when product changes
  useEffect(() => {
    setSelectedColor('');
    setSelectedSize('');
    setSizeVariants([]);
    setQuantity(1);
  }, [productId]);

  // Set initial color selection when colorVariants load
  useEffect(() => {
    if (colorVariants.length > 0 && !selectedColor) {
      setSelectedColor(colorVariants[0].id);
    }
  }, [colorVariants]);

  // Fetch size variants when color changes
  useEffect(() => {
    if (selectedColor && product?.color_has_size_variants) {
      fetchSizeVariantsForColor(selectedColor);
    }
  }, [selectedColor, product?.color_has_size_variants]);

  const fetchSizeVariantsForColor = async (colorVariantId: string) => {
    const { data } = await supabase
      .from('size_variants')
      .select('id, size_name')
      .eq('color_variant_id', colorVariantId);

    setSizeVariants(data || []);
    if (data && data.length > 0) {
      setSelectedSize(data[0].id);
    }
  };

  // Cart quantity calculation - handle undefined/null/empty string consistently
  const getCartQuantity = () => {
    const cartItem = cartItems.find(item => {
      const productMatch = item.productId === product?.id;
      
      // Normalize values - treat undefined, null, and empty string as equivalent
      const itemColorId = item.colorVariantId || null;
      const itemSizeId = item.sizeVariantId || null;
      const currentColorId = selectedColor || null;
      const currentSizeId = selectedSize || null;
      
      if (!product?.has_color_variants) {
        return productMatch && !itemColorId && !itemSizeId;
      }
      if (product?.has_color_variants && !product?.color_has_size_variants) {
        return productMatch && itemColorId === currentColorId && !itemSizeId;
      }
      if (product?.has_color_variants && product?.color_has_size_variants) {
        return productMatch && itemColorId === currentColorId && itemSizeId === currentSizeId;
      }
      return productMatch;
    });
    return cartItem?.quantity || 0;
  };

  const currentCartQuantity = getCartQuantity();
  const basePrice = product?.selling_price || subcategory?.min_selling_price || 0;

  // Calculate total subcategory quantity with current selection
  const getTotalSubcategoryQuantityWithCurrent = () => {
    const existingQuantity = cartItems
      .filter(item => item.subcategoryId === product?.subcategory_id)
      .reduce((total, item) => total + item.quantity, 0);
    return existingQuantity + quantity;
  };

  // Get applicable discount tier
  const getApplicableTier = (totalQty: number) => {
    const sortedTiers = [...discountTiersData].sort((a, b) => b.min_quantity - a.min_quantity);
    for (const tier of sortedTiers) {
      if (totalQty >= tier.min_quantity && 
          (tier.max_quantity === null || totalQty <= tier.max_quantity)) {
        return tier;
      }
    }
    return null;
  };

  const totalSubcategoryQuantityWithCurrent = getTotalSubcategoryQuantityWithCurrent();
  const applicableTier = getApplicableTier(totalSubcategoryQuantityWithCurrent);
  
  const discountedPrice = applicableTier 
    ? basePrice - applicableTier.discount_amount 
    : basePrice;
  
  const savings = applicableTier ? applicableTier.discount_amount * quantity : 0;
  const discountPercent = applicableTier 
    ? Math.round((applicableTier.discount_amount / basePrice) * 100) 
    : 0;

  const handleAddToCart = async () => {
    if (!product) return;
    
    setActionLoading(true);
    try {
      // useRobustCart already shows toast on success/failure
      await addToCart({
        productId: product.id,
        productName: product.name,
        quantity,
        colorVariantId: selectedColor || undefined,
        sizeVariantId: selectedSize || undefined,
        unitPrice: product.selling_price || subcategory?.min_selling_price || 0,
      });
      // Reset quantity after adding
      setQuantity(1);
    } catch {
      // Error toast already handled by useRobustCart
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    
    const added = await addToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      colorVariantId: selectedColor || undefined,
      sizeVariantId: selectedSize || undefined,
      unitPrice: product.selling_price || subcategory?.min_selling_price || 0,
    });
    
    if (!added) return;
    
    const currentCartTotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);
    const itemPrice = product.selling_price || subcategory?.min_selling_price || 0;
    const newTotal = currentCartTotal + (itemPrice * quantity);
    
    if (newTotal >= 1000) {
      navigate('/checkout');
      return;
    }
    
    const { data: subcategoryData } = await supabase
      .from('subcategories')
      .select('minimum_quantity')
      .eq('id', product.subcategory_id)
      .single();
    
    if (subcategoryData) {
      const subcategoryQuantity = cartItems
        .filter(item => item.subcategoryId === product.subcategory_id)
        .reduce((total, item) => total + item.quantity, 0) + quantity;
      
      if (subcategoryQuantity < subcategoryData.minimum_quantity) {
        toast({
          title: 'Minimum Order Not Met',
          description: `You need at least ${subcategoryData.minimum_quantity} items from this category, or reach Rs. 1000 total`,
          variant: 'destructive'
        });
        return;
      }
    }
    
    navigate('/checkout');
  };

  // Loading state
  if (productLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ModernNavbar />
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="aspect-[4/5] lg:aspect-square bg-muted rounded-xl lg:rounded-2xl animate-pulse" />
            <div className="space-y-6">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-32 bg-muted rounded-xl animate-pulse" />
              <div className="h-14 bg-muted rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <ModernNavbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">This product may have been removed or does not exist.</p>
          <Button onClick={() => navigate('/')} size="lg" className="rounded-full">
            <HomeIcon className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      
      <main className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Left: Image Gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductImageGallery
              images={images}
              productName={product.name}
              isFeatured={product.is_featured}
              discountPercent={discountPercent}
            />
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            <ProductInfo
              productName={product.name}
              subcategoryName={subcategory?.name}
              subcategoryId={subcategory?.id}
              basePrice={basePrice}
              stock={productStock}
              quantity={quantity}
              cartQuantity={currentCartQuantity}
              colorVariants={colorVariants}
              sizeVariants={sizeVariants}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              discountTiers={discountTiersData}
              hasColorVariants={product.has_color_variants || false}
              hasSizeVariants={product.color_has_size_variants || false}
              averageRating={Number(ratingData?.average_rating) || 0}
              reviewCount={ratingData?.review_count || 0}
              cartItems={cartItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                subcategoryId: item.subcategoryId,
                basePrice: item.basePrice,
                totalPrice: item.totalPrice
              }))}
              onQuantityChange={setQuantity}
              onColorChange={setSelectedColor}
              onSizeChange={setSelectedSize}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              isLoading={actionLoading}
            />

            {/* Product Details Accordion */}
            <ProductDetailsAccordion
              description={product.description}
              materialComposition={product.material_composition}
              careInstructions={product.care_instructions}
            />
          </div>
        </div>
      </main>

      {/* Similar Products */}
      {product.category_id && (
        <SimilarProducts 
          categoryId={product.category_id} 
          currentProductId={product.id} 
        />
      )}

      {/* More Subcategories */}
      {product.category_id && product.subcategory_id && (
        <MoreSubcategories 
          categoryId={product.category_id} 
          currentSubcategoryId={product.subcategory_id} 
        />
      )}

      {/* Customer Reviews */}
      <div className="max-w-7xl mx-auto px-4">
        <ProductReviews productId={product.id} />
      </div>

      {/* More from Mozamandu */}
      <MoreFromMozamandu currentProductId={product.id} />

      <Footer />
    </div>
  );
}
